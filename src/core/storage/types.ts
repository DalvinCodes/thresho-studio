/**
 * File Storage Types
 * Defines interfaces for the file storage system
 */

/**
 * Type of storage backend in use
 */
export type StorageType = 'opfs' | 'indexeddb' | 'memory';

/**
 * Metadata for stored files
 */
export interface FileMetadata {
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

/**
 * Information about a stored file
 */
export interface FileInfo {
  id: string;
  metadata: FileMetadata;
}

/**
 * Storage usage statistics
 */
export interface StorageUsage {
  used: number;
  available: number;
}

/**
 * File storage service interface
 * Provides methods for storing and retrieving files
 */
export interface FileStorageService {
  /**
   * Check if the storage backend is available
   */
  isAvailable(): boolean;

  /**
   * Get the type of storage backend in use
   */
  getStorageType(): StorageType;

  /**
   * Save a file to storage
   * @param id Unique identifier for the file
   * @param data File data as Blob or ArrayBuffer
   * @param metadata Optional file metadata
   * @returns URL for accessing the file (blob: or data: URL)
   */
  saveFile(id: string, data: Blob | ArrayBuffer, metadata?: Partial<FileMetadata>): Promise<string>;

  /**
   * Get a file from storage
   * @param id File identifier
   * @returns File data as Blob, or null if not found
   */
  getFile(id: string): Promise<Blob | null>;

  /**
   * Get a URL for accessing a file
   * @param id File identifier
   * @returns Blob URL or data URL, or null if not found
   */
  getFileUrl(id: string): Promise<string | null>;

  /**
   * Delete a file from storage
   * @param id File identifier
   */
  deleteFile(id: string): Promise<void>;

  /**
   * List all stored files
   * @returns Array of file information
   */
  listFiles(): Promise<FileInfo[]>;

  /**
   * Get storage usage statistics
   * @returns Used and available storage in bytes
   */
  getStorageUsage(): Promise<StorageUsage>;

  /**
   * Clear all stored files
   */
  clearAll(): Promise<void>;

  /**
   * Save a thumbnail for a file
   * @param id File identifier (same as main file)
   * @param data Thumbnail data as Blob
   * @returns URL for accessing the thumbnail
   */
  saveThumbnail(id: string, data: Blob): Promise<string>;

  /**
   * Get a thumbnail for a file
   * @param id File identifier
   * @returns Thumbnail data as Blob, or null if not found
   */
  getThumbnail(id: string): Promise<Blob | null>;

  /**
   * Revoke a blob URL to free memory
   * @param url Blob URL to revoke
   */
  revokeUrl(url: string): void;
}

/**
 * Storage error types
 */
export class StorageError extends Error {
  code: StorageErrorCode;
  originalCause?: unknown;

  constructor(message: string, code: StorageErrorCode, cause?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.originalCause = cause;
  }
}

export const StorageErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_DATA: 'INVALID_DATA',
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const;

export type StorageErrorCode = (typeof StorageErrorCodes)[keyof typeof StorageErrorCodes];
