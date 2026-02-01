/**
 * Memory Storage Implementation
 * Last resort fallback when both OPFS and IndexedDB are unavailable
 * WARNING: Data is lost on page refresh
 */

import type {
  FileStorageService,
  FileMetadata,
  FileInfo,
  StorageUsage,
} from './types';
import { StorageError, StorageErrorCodes } from './types';

interface StoredFile {
  data: Blob;
  metadata: FileMetadata;
}

// Approximate memory limit (100MB)
const MEMORY_LIMIT = 100 * 1024 * 1024;

/**
 * Memory Storage Service
 * Stores files in memory - data is lost on page refresh
 */
export class MemoryStorage implements FileStorageService {
  private files: Map<string, StoredFile> = new Map();
  private thumbnails: Map<string, Blob> = new Map();
  private blobUrlCache: Map<string, string> = new Map();
  private totalSize = 0;
  private initialized = false;

  /**
   * Memory storage is always available
   */
  static isSupported(): boolean {
    return true;
  }

  /**
   * Initialize memory storage
   */
  async initialize(): Promise<void> {
    this.initialized = true;
    console.warn('[MemoryStorage] Using in-memory storage - data will not persist!');
  }

  isAvailable(): boolean {
    return this.initialized;
  }

  getStorageType(): 'memory' {
    return 'memory';
  }

  async saveFile(
    id: string,
    data: Blob | ArrayBuffer,
    metadata?: Partial<FileMetadata>
  ): Promise<string> {
    this.ensureInitialized();

    const blob = data instanceof Blob ? data : new Blob([data]);

    // Check memory limit
    const newTotal = this.totalSize - (this.files.get(id)?.data.size || 0) + blob.size;
    if (newTotal > MEMORY_LIMIT) {
      throw new StorageError(
        'Memory storage limit exceeded (100MB)',
        StorageErrorCodes.QUOTA_EXCEEDED
      );
    }

    const fileMetadata: FileMetadata = {
      name: metadata?.name || id,
      mimeType: metadata?.mimeType || blob.type || 'application/octet-stream',
      size: blob.size,
      createdAt: metadata?.createdAt || Date.now(),
    };

    // Update total size
    if (this.files.has(id)) {
      this.totalSize -= this.files.get(id)!.data.size;
    }
    this.totalSize += blob.size;

    // Store file
    this.files.set(id, {
      data: blob,
      metadata: fileMetadata,
    });

    console.log(`[MemoryStorage] Saved file: ${id} (${formatBytes(blob.size)})`);

    // Return storage URL - blob URL will be created on-demand when getFileUrl is called
    return `memory://${id}`;
  }

  async getFile(id: string): Promise<Blob | null> {
    this.ensureInitialized();

    const stored = this.files.get(id);
    return stored?.data || null;
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

    const stored = this.files.get(id);
    if (stored) {
      this.totalSize -= stored.data.size;
      this.files.delete(id);
    }

    // Also delete thumbnail
    this.thumbnails.delete(id);

    // Revoke cached blob URL
    this.revokeCachedUrl(id);

    console.log(`[MemoryStorage] Deleted file: ${id}`);
  }

  async listFiles(): Promise<FileInfo[]> {
    this.ensureInitialized();

    const files: FileInfo[] = [];
    for (const [id, stored] of this.files.entries()) {
      files.push({
        id,
        metadata: stored.metadata,
      });
    }
    return files;
  }

  async getStorageUsage(): Promise<StorageUsage> {
    return {
      used: this.totalSize,
      available: MEMORY_LIMIT - this.totalSize,
    };
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    this.files.clear();
    this.thumbnails.clear();
    this.totalSize = 0;

    // Revoke all blob URLs
    for (const url of this.blobUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobUrlCache.clear();

    console.log('[MemoryStorage] Cleared all files');
  }

  async saveThumbnail(id: string, data: Blob): Promise<string> {
    this.ensureInitialized();

    this.thumbnails.set(id, data);
    return URL.createObjectURL(data);
  }

  async getThumbnail(id: string): Promise<Blob | null> {
    this.ensureInitialized();

    return this.thumbnails.get(id) || null;
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
        'Memory storage not initialized',
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
