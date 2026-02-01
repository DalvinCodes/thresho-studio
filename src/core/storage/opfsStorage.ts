/**
 * OPFS (Origin Private File System) Storage Implementation
 * Provides persistent file storage using the File System Access API
 */

import type {
  FileStorageService,
  FileMetadata,
  FileInfo,
  StorageUsage,
} from './types';
import { StorageError, StorageErrorCodes } from './types';

// Constants
const ROOT_DIR = 'thresho';
const ASSETS_DIR = 'assets';
const THUMBNAILS_DIR = 'thumbnails';
const METADATA_FILE = 'metadata.json';

// Chunk size for streaming large files (1MB)
const CHUNK_SIZE = 1024 * 1024;

/**
 * OPFS Storage Service
 * Uses Origin Private File System for persistent storage
 */
export class OPFSStorage implements FileStorageService {
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private assetsHandle: FileSystemDirectoryHandle | null = null;
  private thumbnailsHandle: FileSystemDirectoryHandle | null = null;
  private metadataCache: Map<string, FileMetadata> = new Map();
  private blobUrlCache: Map<string, string> = new Map();
  private initialized = false;

  /**
   * Check if OPFS is available in this browser
   */
  static isSupported(): boolean {
    return 'storage' in navigator && 'getDirectory' in navigator.storage;
  }

  /**
   * Initialize the OPFS storage
   * Creates directory structure if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get the OPFS root
      const opfsRoot = await navigator.storage.getDirectory();

      // Create our app's root directory
      this.rootHandle = await opfsRoot.getDirectoryHandle(ROOT_DIR, { create: true });

      // Create subdirectories
      this.assetsHandle = await this.rootHandle.getDirectoryHandle(ASSETS_DIR, { create: true });
      this.thumbnailsHandle = await this.rootHandle.getDirectoryHandle(THUMBNAILS_DIR, { create: true });

      // Load metadata cache
      await this.loadMetadataCache();

      this.initialized = true;
      console.log('[OPFSStorage] Initialized successfully');
    } catch (error) {
      console.error('[OPFSStorage] Initialization failed:', error);
      throw new StorageError(
        'Failed to initialize OPFS storage',
        StorageErrorCodes.INITIALIZATION_FAILED,
        error
      );
    }
  }

  isAvailable(): boolean {
    return this.initialized;
  }

  getStorageType(): 'opfs' {
    return 'opfs';
  }

  async saveFile(
    id: string,
    data: Blob | ArrayBuffer,
    metadata?: Partial<FileMetadata>
  ): Promise<string> {
    this.ensureInitialized();

    try {
      const blob = data instanceof Blob ? data : new Blob([data]);

      // Create file metadata
      const fileMetadata: FileMetadata = {
        name: metadata?.name || id,
        mimeType: metadata?.mimeType || blob.type || 'application/octet-stream',
        size: blob.size,
        createdAt: metadata?.createdAt || Date.now(),
      };

      // Write file using streaming for large files
      const fileHandle = await this.assetsHandle!.getFileHandle(id, { create: true });

      if (blob.size > CHUNK_SIZE * 5) {
        // Large file: use streaming
        await this.writeFileStreaming(fileHandle, blob);
      } else {
        // Small file: write directly
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      }

      // Update metadata cache
      this.metadataCache.set(id, fileMetadata);
      await this.saveMetadataCache();

      console.log(`[OPFSStorage] Saved file: ${id} (${formatBytes(blob.size)})`);

      // Return the storage URL - don't cache blob URL here as the blob may be GC'd
      // The blob URL will be created on-demand when getFileUrl is called
      return `opfs://${id}`;
    } catch (error) {
      if (this.isQuotaError(error)) {
        throw new StorageError(
          'Storage quota exceeded',
          StorageErrorCodes.QUOTA_EXCEEDED,
          error
        );
      }
      throw new StorageError(
        `Failed to save file: ${id}`,
        StorageErrorCodes.OPERATION_FAILED,
        error
      );
    }
  }

  async getFile(id: string): Promise<Blob | null> {
    this.ensureInitialized();

    try {
      const fileHandle = await this.assetsHandle!.getFileHandle(id);
      const file = await fileHandle.getFile();
      return file;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw new StorageError(
        `Failed to get file: ${id}`,
        StorageErrorCodes.OPERATION_FAILED,
        error
      );
    }
  }

  async getFileUrl(id: string): Promise<string | null> {
    // Check cache first
    if (this.blobUrlCache.has(id)) {
      return this.blobUrlCache.get(id)!;
    }

    const blob = await this.getFile(id);
    if (!blob) return null;

    return this.createFileUrl(id, blob);
  }

  async deleteFile(id: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Delete the file
      await this.assetsHandle!.removeEntry(id);

      // Also try to delete thumbnail if it exists
      try {
        await this.thumbnailsHandle!.removeEntry(id);
      } catch {
        // Thumbnail may not exist, ignore
      }

      // Update metadata cache
      this.metadataCache.delete(id);
      await this.saveMetadataCache();

      // Revoke any cached blob URLs
      this.revokeCachedUrl(id);

      console.log(`[OPFSStorage] Deleted file: ${id}`);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        // File already doesn't exist
        return;
      }
      throw new StorageError(
        `Failed to delete file: ${id}`,
        StorageErrorCodes.OPERATION_FAILED,
        error
      );
    }
  }

  async listFiles(): Promise<FileInfo[]> {
    this.ensureInitialized();

    const files: FileInfo[] = [];

    try {
      // @ts-expect-error - entries() is available but not in types
      for await (const [name, handle] of this.assetsHandle!.entries()) {
        if (handle.kind === 'file') {
          const metadata = this.metadataCache.get(name);
          if (metadata) {
            files.push({ id: name, metadata });
          } else {
            // Metadata not in cache, read from file
            const file = await (handle as FileSystemFileHandle).getFile();
            const newMetadata: FileMetadata = {
              name,
              mimeType: file.type || 'application/octet-stream',
              size: file.size,
              createdAt: file.lastModified,
            };
            this.metadataCache.set(name, newMetadata);
            files.push({ id: name, metadata: newMetadata });
          }
        }
      }

      // Save any new metadata discovered
      await this.saveMetadataCache();
    } catch (error) {
      throw new StorageError(
        'Failed to list files',
        StorageErrorCodes.OPERATION_FAILED,
        error
      );
    }

    return files;
  }

  async getStorageUsage(): Promise<StorageUsage> {
    try {
      // Use the Storage API estimate
      const estimate = await navigator.storage.estimate();

      return {
        used: estimate.usage || 0,
        available: estimate.quota ? estimate.quota - (estimate.usage || 0) : Infinity,
      };
    } catch (error) {
      console.warn('[OPFSStorage] Failed to get storage estimate:', error);
      return { used: 0, available: Infinity };
    }
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    try {
      // Delete all files in assets
      // @ts-expect-error - entries() is available but not in types
      for await (const [name] of this.assetsHandle!.entries()) {
        await this.assetsHandle!.removeEntry(name);
      }

      // Delete all files in thumbnails
      // @ts-expect-error - entries() is available but not in types
      for await (const [name] of this.thumbnailsHandle!.entries()) {
        await this.thumbnailsHandle!.removeEntry(name);
      }

      // Clear caches
      this.metadataCache.clear();
      await this.saveMetadataCache();

      // Revoke all blob URLs
      for (const url of this.blobUrlCache.values()) {
        URL.revokeObjectURL(url);
      }
      this.blobUrlCache.clear();

      console.log('[OPFSStorage] Cleared all files');
    } catch (error) {
      throw new StorageError(
        'Failed to clear storage',
        StorageErrorCodes.OPERATION_FAILED,
        error
      );
    }
  }

  async saveThumbnail(id: string, data: Blob): Promise<string> {
    this.ensureInitialized();

    try {
      const fileHandle = await this.thumbnailsHandle!.getFileHandle(id, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();

      // Create blob URL for the thumbnail
      const url = URL.createObjectURL(data);
      return url;
    } catch (error) {
      throw new StorageError(
        `Failed to save thumbnail: ${id}`,
        StorageErrorCodes.OPERATION_FAILED,
        error
      );
    }
  }

  async getThumbnail(id: string): Promise<Blob | null> {
    this.ensureInitialized();

    try {
      const fileHandle = await this.thumbnailsHandle!.getFileHandle(id);
      const file = await fileHandle.getFile();
      return file;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw new StorageError(
        `Failed to get thumbnail: ${id}`,
        StorageErrorCodes.OPERATION_FAILED,
        error
      );
    }
  }

  revokeUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      // Remove from cache if present
      for (const [id, cachedUrl] of this.blobUrlCache.entries()) {
        if (cachedUrl === url) {
          this.blobUrlCache.delete(id);
          break;
        }
      }
    }
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        'OPFS storage not initialized',
        StorageErrorCodes.INITIALIZATION_FAILED
      );
    }
  }

  private createFileUrl(id: string, blob: Blob): string {
    // Revoke old URL if exists
    this.revokeCachedUrl(id);

    // Create new blob URL
    const url = URL.createObjectURL(blob);
    this.blobUrlCache.set(id, url);
    return url;
  }

  private revokeCachedUrl(id: string): void {
    const existingUrl = this.blobUrlCache.get(id);
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
      this.blobUrlCache.delete(id);
    }
  }

  private async writeFileStreaming(
    fileHandle: FileSystemFileHandle,
    blob: Blob
  ): Promise<void> {
    const writable = await fileHandle.createWritable();
    let offset = 0;

    try {
      while (offset < blob.size) {
        const chunk = blob.slice(offset, offset + CHUNK_SIZE);
        await writable.write(chunk);
        offset += CHUNK_SIZE;
      }
    } finally {
      await writable.close();
    }
  }

  private async loadMetadataCache(): Promise<void> {
    try {
      const metadataHandle = await this.rootHandle!.getFileHandle(METADATA_FILE);
      const file = await metadataHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);

      this.metadataCache = new Map(Object.entries(data));
    } catch {
      // Metadata file doesn't exist or is corrupted, start fresh
      this.metadataCache = new Map();
    }
  }

  private async saveMetadataCache(): Promise<void> {
    try {
      const metadataHandle = await this.rootHandle!.getFileHandle(METADATA_FILE, {
        create: true,
      });
      const writable = await metadataHandle.createWritable();
      const data = Object.fromEntries(this.metadataCache);
      await writable.write(JSON.stringify(data));
      await writable.close();
    } catch (error) {
      console.warn('[OPFSStorage] Failed to save metadata cache:', error);
    }
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      error instanceof DOMException &&
      (error.name === 'NotFoundError' || error.name === 'TypeMismatchError')
    );
  }

  private isQuotaError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'QuotaExceededError';
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
