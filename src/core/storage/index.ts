/**
 * File Storage Module
 * Provides persistent storage for large files (images, videos)
 */

import type { FileStorageService, StorageType } from './types';
import { OPFSStorage } from './opfsStorage';
import { IndexedDBStorage } from './indexedDbStorage';
import { MemoryStorage } from './memoryStorage';

// Singleton instance
let storageInstance: FileStorageService | null = null;
let initPromise: Promise<FileStorageService> | null = null;

/**
 * Initialize the file storage system
 * Detects available storage and initializes the best option:
 * 1. OPFS (preferred) - persistent, supports large files
 * 2. IndexedDB (fallback) - persistent, some size limits
 * 3. Memory (last resort) - not persistent, limited size
 */
export async function initializeStorage(): Promise<FileStorageService> {
  // Return existing instance
  if (storageInstance) {
    return storageInstance;
  }

  // Return pending initialization
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    console.log('[Storage] Initializing file storage...');

    // Try OPFS first
    if (OPFSStorage.isSupported()) {
      try {
        const opfs = new OPFSStorage();
        await opfs.initialize();
        storageInstance = opfs;
        console.log('[Storage] Using OPFS storage (persistent, large file support)');
        return storageInstance;
      } catch (error) {
        console.warn('[Storage] OPFS initialization failed, trying IndexedDB:', error);
      }
    } else {
      console.log('[Storage] OPFS not supported in this browser');
    }

    // Try IndexedDB
    if (IndexedDBStorage.isSupported()) {
      try {
        const idb = new IndexedDBStorage();
        await idb.initialize();
        storageInstance = idb;
        console.log('[Storage] Using IndexedDB storage (persistent)');
        return storageInstance;
      } catch (error) {
        console.warn('[Storage] IndexedDB initialization failed, falling back to memory:', error);
      }
    } else {
      console.log('[Storage] IndexedDB not supported in this browser');
    }

    // Fall back to memory storage
    const memory = new MemoryStorage();
    await memory.initialize();
    storageInstance = memory;
    console.warn('[Storage] Using in-memory storage - data will not persist!');
    return storageInstance;
  })();

  return initPromise;
}

/**
 * Get the current storage instance
 * Throws if storage hasn't been initialized
 */
export function getStorage(): FileStorageService {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initializeStorage() first.');
  }
  return storageInstance;
}

/**
 * Check if storage has been initialized
 */
export function isStorageInitialized(): boolean {
  return storageInstance !== null;
}

/**
 * Get the current storage type
 */
export function getStorageType(): StorageType | null {
  return storageInstance?.getStorageType() || null;
}

// Re-export types and utilities
export type { FileStorageService, FileMetadata, FileInfo, StorageUsage, StorageType } from './types';
export { StorageError, StorageErrorCodes } from './types';
export { generateThumbnail, generateImageThumbnail, generateVideoThumbnail } from './thumbnailGenerator';
export { downloadFromUrl, downloadAndStore, isStorageUrl, parseStorageUrl, resolveStorageUrl } from './downloadFile';
