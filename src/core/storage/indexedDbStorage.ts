/**
 * IndexedDB Storage Implementation
 * Fallback storage for browsers without OPFS support
 */

import type {
  FileStorageService,
  FileMetadata,
  FileInfo,
  StorageUsage,
} from './types';
import { StorageError, StorageErrorCodes } from './types';

// Constants
const DB_NAME = 'thresho-files';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const THUMBNAILS_STORE = 'thumbnails';

interface StoredFile {
  id: string;
  data: Blob;
  metadata: FileMetadata;
}

/**
 * IndexedDB Storage Service
 * Uses IndexedDB for file storage as fallback
 */
export class IndexedDBStorage implements FileStorageService {
  private db: IDBDatabase | null = null;
  private blobUrlCache: Map<string, string> = new Map();
  private initialized = false;

  /**
   * Check if IndexedDB is available
   */
  static isSupported(): boolean {
    return 'indexedDB' in window;
  }

  /**
   * Initialize IndexedDB storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(
          new StorageError(
            'Failed to open IndexedDB',
            StorageErrorCodes.INITIALIZATION_FAILED,
            request.error
          )
        );
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        console.log('[IndexedDBStorage] Initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create files store
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const filesStore = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
          filesStore.createIndex('mimeType', 'metadata.mimeType', { unique: false });
          filesStore.createIndex('createdAt', 'metadata.createdAt', { unique: false });
        }

        // Create thumbnails store
        if (!db.objectStoreNames.contains(THUMBNAILS_STORE)) {
          db.createObjectStore(THUMBNAILS_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  isAvailable(): boolean {
    return this.initialized;
  }

  getStorageType(): 'indexeddb' {
    return 'indexeddb';
  }

  async saveFile(
    id: string,
    data: Blob | ArrayBuffer,
    metadata?: Partial<FileMetadata>
  ): Promise<string> {
    this.ensureInitialized();

    const blob = data instanceof Blob ? data : new Blob([data]);

    const fileMetadata: FileMetadata = {
      name: metadata?.name || id,
      mimeType: metadata?.mimeType || blob.type || 'application/octet-stream',
      size: blob.size,
      createdAt: metadata?.createdAt || Date.now(),
    };

    const storedFile: StoredFile = {
      id,
      data: blob,
      metadata: fileMetadata,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readwrite');
      const store = transaction.objectStore(FILES_STORE);

      const request = store.put(storedFile);

      request.onerror = () => {
        if (this.isQuotaError(request.error)) {
          reject(
            new StorageError(
              'Storage quota exceeded',
              StorageErrorCodes.QUOTA_EXCEEDED,
              request.error
            )
          );
        } else {
          reject(
            new StorageError(
              `Failed to save file: ${id}`,
              StorageErrorCodes.OPERATION_FAILED,
              request.error
            )
          );
        }
      };

      request.onsuccess = () => {
        console.log(`[IndexedDBStorage] Saved file: ${id} (${formatBytes(blob.size)})`);
        // Create and return blob URL
        const url = this.createFileUrl(id, blob);
        resolve(url);
      };
    });
  }

  async getFile(id: string): Promise<Blob | null> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readonly');
      const store = transaction.objectStore(FILES_STORE);
      const request = store.get(id);

      request.onerror = () => {
        reject(
          new StorageError(
            `Failed to get file: ${id}`,
            StorageErrorCodes.OPERATION_FAILED,
            request.error
          )
        );
      };

      request.onsuccess = () => {
        const result = request.result as StoredFile | undefined;
        resolve(result?.data || null);
      };
    });
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

    // Delete from both stores
    await Promise.all([
      this.deleteFromStore(FILES_STORE, id),
      this.deleteFromStore(THUMBNAILS_STORE, id).catch(() => {
        // Thumbnail may not exist, ignore
      }),
    ]);

    // Revoke cached blob URL
    this.revokeCachedUrl(id);

    console.log(`[IndexedDBStorage] Deleted file: ${id}`);
  }

  async listFiles(): Promise<FileInfo[]> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readonly');
      const store = transaction.objectStore(FILES_STORE);
      const request = store.getAll();

      request.onerror = () => {
        reject(
          new StorageError(
            'Failed to list files',
            StorageErrorCodes.OPERATION_FAILED,
            request.error
          )
        );
      };

      request.onsuccess = () => {
        const results = request.result as StoredFile[];
        const files: FileInfo[] = results.map((f) => ({
          id: f.id,
          metadata: f.metadata,
        }));
        resolve(files);
      };
    });
  }

  async getStorageUsage(): Promise<StorageUsage> {
    try {
      // Use the Storage API estimate if available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: estimate.quota ? estimate.quota - (estimate.usage || 0) : Infinity,
        };
      }
    } catch (error) {
      console.warn('[IndexedDBStorage] Failed to get storage estimate:', error);
    }

    // Calculate usage from stored files
    const files = await this.listFiles();
    const used = files.reduce((sum, f) => sum + f.metadata.size, 0);

    return {
      used,
      available: Infinity, // Unknown
    };
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    await Promise.all([this.clearStore(FILES_STORE), this.clearStore(THUMBNAILS_STORE)]);

    // Revoke all blob URLs
    for (const url of this.blobUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobUrlCache.clear();

    console.log('[IndexedDBStorage] Cleared all files');
  }

  async saveThumbnail(id: string, data: Blob): Promise<string> {
    this.ensureInitialized();

    const storedFile: StoredFile = {
      id,
      data,
      metadata: {
        name: `${id}-thumb`,
        mimeType: data.type,
        size: data.size,
        createdAt: Date.now(),
      },
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([THUMBNAILS_STORE], 'readwrite');
      const store = transaction.objectStore(THUMBNAILS_STORE);
      const request = store.put(storedFile);

      request.onerror = () => {
        reject(
          new StorageError(
            `Failed to save thumbnail: ${id}`,
            StorageErrorCodes.OPERATION_FAILED,
            request.error
          )
        );
      };

      request.onsuccess = () => {
        const url = URL.createObjectURL(data);
        resolve(url);
      };
    });
  }

  async getThumbnail(id: string): Promise<Blob | null> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([THUMBNAILS_STORE], 'readonly');
      const store = transaction.objectStore(THUMBNAILS_STORE);
      const request = store.get(id);

      request.onerror = () => {
        reject(
          new StorageError(
            `Failed to get thumbnail: ${id}`,
            StorageErrorCodes.OPERATION_FAILED,
            request.error
          )
        );
      };

      request.onsuccess = () => {
        const result = request.result as StoredFile | undefined;
        resolve(result?.data || null);
      };
    });
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
    if (!this.initialized || !this.db) {
      throw new StorageError(
        'IndexedDB storage not initialized',
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

  private deleteFromStore(storeName: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private clearStore(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private isQuotaError(error: DOMException | null): boolean {
    return error?.name === 'QuotaExceededError';
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
