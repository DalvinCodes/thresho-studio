/**
 * File Download Utilities
 * Downloads files from URLs and stores them locally
 */

import type { FileStorageService } from './types';
import { StorageError, StorageErrorCodes } from './types';

// Default timeout for downloads (5 minutes)
const DEFAULT_TIMEOUT = 5 * 60 * 1000;

// Maximum file size (500MB for videos)
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Download a file from a URL
 * @param url URL to download from
 * @param options Download options
 * @returns Downloaded file as Blob
 */
export async function downloadFromUrl(
  url: string,
  options?: {
    timeout?: number;
    onProgress?: (loaded: number, total: number) => void;
  }
): Promise<Blob> {
  const { timeout = DEFAULT_TIMEOUT, onProgress } = options || {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      mode: 'cors',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new StorageError(
        `Download failed: ${response.status} ${response.statusText}`,
        StorageErrorCodes.OPERATION_FAILED
      );
    }

    // Check content length
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (total > MAX_FILE_SIZE) {
      throw new StorageError(
        `File too large: ${formatBytes(total)} exceeds limit of ${formatBytes(MAX_FILE_SIZE)}`,
        StorageErrorCodes.QUOTA_EXCEEDED
      );
    }

    // If no progress callback or streaming not supported, use simple approach
    if (!onProgress || !response.body) {
      return await response.blob();
    }

    // Stream download with progress
    const reader = response.body.getReader();
    const chunks: ArrayBuffer[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Convert Uint8Array to ArrayBuffer for Blob compatibility
      chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
      loaded += value.length;

      // Check size during download
      if (loaded > MAX_FILE_SIZE) {
        reader.cancel();
        throw new StorageError(
          `File too large: exceeds limit of ${formatBytes(MAX_FILE_SIZE)}`,
          StorageErrorCodes.QUOTA_EXCEEDED
        );
      }

      onProgress(loaded, total || loaded);
    }

    // Combine chunks into blob
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';
    return new Blob(chunks, { type: mimeType });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof StorageError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new StorageError('Download timed out', StorageErrorCodes.OPERATION_FAILED, error);
    }

    throw new StorageError(
      `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      StorageErrorCodes.OPERATION_FAILED,
      error
    );
  }
}

/**
 * Download a file and store it in local storage
 * @param url URL to download from
 * @param assetId ID to use for storing the file
 * @param storage File storage service instance
 * @param options Download options
 * @returns Storage URL for the file (opfs://{id} or idb://{id})
 */
export async function downloadAndStore(
  url: string,
  assetId: string,
  storage: FileStorageService,
  options?: {
    timeout?: number;
    onProgress?: (loaded: number, total: number) => void;
  }
): Promise<string> {
  // Download the file
  const blob = await downloadFromUrl(url, options);

  // Get metadata from the blob
  const metadata = {
    name: extractFilenameFromUrl(url),
    mimeType: blob.type || guessMimeTypeFromUrl(url),
    size: blob.size,
    createdAt: Date.now(),
  };

  // Save to storage
  await storage.saveFile(assetId, blob, metadata);

  // Return the storage URL
  const storageType = storage.getStorageType();
  return `${storageType}://${assetId}`;
}

/**
 * Check if a URL is a local storage URL
 */
export function isStorageUrl(url: string): boolean {
  return url.startsWith('opfs://') || url.startsWith('idb://') || url.startsWith('memory://');
}

/**
 * Parse a storage URL to get the storage type and ID
 */
export function parseStorageUrl(url: string): { storageType: string; id: string } | null {
  const match = url.match(/^(opfs|idb|memory):\/\/(.+)$/);
  if (!match) return null;

  return {
    storageType: match[1],
    id: match[2],
  };
}

/**
 * Get a displayable URL for a storage URL
 * Returns a blob URL that can be used in src attributes
 * @param url Storage URL (opfs://, idb://, or memory://)
 * @param storage File storage service instance
 */
export async function resolveStorageUrl(
  url: string,
  storage: FileStorageService
): Promise<string | null> {
  if (!isStorageUrl(url)) {
    // Not a storage URL, return as-is
    return url;
  }

  const parsed = parseStorageUrl(url);
  if (!parsed) return null;

  return storage.getFileUrl(parsed.id);
}

/**
 * Extract filename from URL
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    return filename || 'downloaded-file';
  } catch {
    return 'downloaded-file';
  }
}

/**
 * Guess MIME type from URL extension
 */
function guessMimeTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
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
