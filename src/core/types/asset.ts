/**
 * Asset types for generated content management
 */

import type { UUID, Timestamp, ContentType, AssetFormat, BaseEntity } from './common';

// Asset metadata based on type
export interface AssetMetadata {
  // Common
  fileSize: number;
  mimeType: string;

  // Image/Video dimensions
  width?: number;
  height?: number;

  // Video specific
  duration?: number; // seconds
  fps?: number;
  codec?: string;

  // Image specific
  colorProfile?: string;
  hasAlpha?: boolean;

  // Generation metadata
  generatedByRequestId?: UUID;
  generatedAt?: Timestamp;
  seed?: number;

  // Provider metadata
  providerMetadata?: Record<string, unknown>;
}

// Asset stored in database
export interface Asset extends BaseEntity {
  name: string;
  description?: string;
  type: ContentType;
  format: AssetFormat;

  // Storage
  url: string; // Blob URL or file path
  thumbnailUrl?: string;
  storageLocation: 'local' | 'blob' | 'cloud';

  // Metadata
  metadata: AssetMetadata;

  // Organization
  projectId?: UUID;
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;

  // Lineage
  generationRecordId?: UUID;
}

// Asset collection/folder
export interface AssetCollection {
  id: UUID;
  name: string;
  description?: string;
  projectId?: UUID;
  assetIds: UUID[];
  coverAssetId?: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Asset search/filter options
export interface AssetSearchParams {
  query?: string;
  types?: ContentType[];
  formats?: AssetFormat[];
  tags?: string[];
  projectId?: UUID;
  collectionId?: UUID;
  isFavorite?: boolean;
  includeArchived?: boolean;
  fromDate?: Timestamp;
  toDate?: Timestamp;
  minSize?: number;
  maxSize?: number;
}

// Asset sort options
export type AssetSortField = 'createdAt' | 'updatedAt' | 'name' | 'fileSize' | 'type';

export interface AssetSortParams {
  field: AssetSortField;
  direction: 'asc' | 'desc';
}

// Asset gallery state for virtualization
export interface AssetGalleryState {
  assets: Asset[];
  selectedAssetIds: UUID[];
  filters: AssetSearchParams;
  sorting: AssetSortParams;
  viewMode: 'grid' | 'list';
  gridColumns: number;

  // Virtual scroll state
  visibleRange: {
    start: number;
    end: number;
  };

  // UI state
  isLoading: boolean;
  hasMore: boolean;
  totalCount: number;
}

// Asset operations
export interface AssetOperationResult {
  success: boolean;
  assetId?: UUID;
  error?: string;
}

// Asset export options
export interface AssetExportOptions {
  format?: AssetFormat;
  quality?: number; // 0-100 for lossy formats
  maxWidth?: number;
  maxHeight?: number;
  preserveAspectRatio?: boolean;
  includeMetadata?: boolean;
}

// Batch asset operation
export interface BatchAssetOperation {
  assetIds: UUID[];
  operation: 'delete' | 'archive' | 'unarchive' | 'favorite' | 'unfavorite' | 'tag' | 'untag' | 'move';
  params?: {
    tags?: string[];
    projectId?: UUID;
    collectionId?: UUID;
  };
}

// Asset upload input
export interface AssetUploadInput {
  file: File;
  name?: string;
  description?: string;
  projectId?: UUID;
  tags?: string[];
}

// Asset with generation info for display
export interface AssetWithGeneration {
  asset: Asset;
  generationRecord?: {
    id: UUID;
    promptTemplateId?: UUID;
    promptTemplateName?: string;
    brandId?: UUID;
    brandName?: string;
    providerType: string;
    model: string;
    renderedPrompt: string;
    createdAt: Timestamp;
  };
}
