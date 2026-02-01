/**
 * Asset Store
 * Manages generated assets with filtering, sorting, and virtualization support
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useMemo } from 'react';
import type { UUID, ContentType, AssetFormat } from '../../core/types/common';
import { createUUID, createTimestamp } from '../../core/types/common';
import type {
  Asset,
  AssetMetadata,
  AssetCollection,
  AssetSearchParams,
  AssetSortParams,
  AssetGalleryState,
  AssetUploadInput,
  BatchAssetOperation,
} from '../../core/types/asset';
import {
  saveAssetToDb,
  deleteAssetFromDb,
  deleteAssetsFromDb,
  saveCollectionToDb,
  deleteCollectionFromDb,
} from './services/assetDbService';
import {
  getStorage,
  isStorageInitialized,
  generateThumbnail,
  isStorageUrl,
  parseStorageUrl,
} from '../../core/storage';
import {
  getImageDimensions as getImageDims,
  getVideoMetadata,
} from '../../core/storage/thumbnailGenerator';

interface AssetState {
  // Data
  assets: Map<UUID, Asset>;
  collections: Map<UUID, AssetCollection>;

  // Gallery state
  gallery: AssetGalleryState;

  // Selection
  selectedAssetIds: Set<UUID>;
  focusedAssetId: UUID | null;

  // Upload state
  isUploading: boolean;
  uploadProgress: number;

  // Lightbox state
  lightboxAssetId: UUID | null;
  lightboxIndex: number;
}

interface AssetActions {
  // Asset CRUD
  createAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => UUID;
  updateAsset: (id: UUID, updates: Partial<Asset>) => void;
  deleteAsset: (id: UUID) => void;
  archiveAsset: (id: UUID) => void;
  unarchiveAsset: (id: UUID) => void;

  // Bulk operations
  batchOperation: (operation: BatchAssetOperation) => void;
  deleteAssets: (ids: UUID[]) => void;

  // Favorites
  toggleFavorite: (id: UUID) => void;
  setFavorite: (id: UUID, isFavorite: boolean) => void;

  // Tags
  addTag: (id: UUID, tag: string) => void;
  removeTag: (id: UUID, tag: string) => void;
  setTags: (id: UUID, tags: string[]) => void;

  // Collections
  createCollection: (name: string, assetIds?: UUID[]) => UUID;
  updateCollection: (id: UUID, updates: Partial<AssetCollection>) => void;
  deleteCollection: (id: UUID) => void;
  addToCollection: (collectionId: UUID, assetIds: UUID[]) => void;
  removeFromCollection: (collectionId: UUID, assetIds: UUID[]) => void;

  // Gallery
  setFilters: (filters: Partial<AssetSearchParams>) => void;
  setSorting: (sorting: AssetSortParams) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setGridColumns: (columns: number) => void;
  clearFilters: () => void;

  // Selection
  selectAsset: (id: UUID) => void;
  deselectAsset: (id: UUID) => void;
  toggleSelection: (id: UUID) => void;
  selectRange: (fromId: UUID, toId: UUID) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setFocusedAsset: (id: UUID | null) => void;

  // Lightbox
  openLightbox: (id: UUID) => void;
  closeLightbox: () => void;
  nextInLightbox: () => void;
  prevInLightbox: () => void;

  // Queries
  getFilteredAssets: () => Asset[];
  getSortedAssets: () => Asset[];
  getAssetsByType: (type: ContentType) => Asset[];
  getAssetsByCollection: (collectionId: UUID) => Asset[];
  getRecentAssets: (limit?: number) => Asset[];
  getFavoriteAssets: () => Asset[];
  searchAssets: (query: string) => Asset[];
  getAllTags: () => string[];

  // Upload
  uploadAsset: (input: AssetUploadInput) => Promise<UUID>;
  setUploadProgress: (progress: number) => void;

  // Persistence
  loadFromDatabase: (assets: Asset[], collections: AssetCollection[]) => void;
}

type AssetStore = AssetState & AssetActions;

// Default gallery state
const defaultGalleryState: AssetGalleryState = {
  assets: [],
  selectedAssetIds: [],
  filters: {},
  sorting: { field: 'createdAt', direction: 'desc' },
  viewMode: 'grid',
  gridColumns: 4,
  visibleRange: { start: 0, end: 50 },
  isLoading: false,
  hasMore: false,
  totalCount: 0,
};

export const useAssetStore = create<AssetStore>()(
  immer((set, get) => ({
    // Initial state
    assets: new Map(),
    collections: new Map(),
    gallery: defaultGalleryState,
    selectedAssetIds: new Set(),
    focusedAssetId: null,
    isUploading: false,
    uploadProgress: 0,
    lightboxAssetId: null,
    lightboxIndex: 0,

    // Asset CRUD
    createAsset: (assetInput) => {
      const id = createUUID();
      const now = createTimestamp();

      const asset: Asset = {
        ...assetInput,
        id,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => {
        state.assets.set(id, asset);
        state.gallery.totalCount++;
      });

      // Persist to database (fire and forget, errors are logged)
      saveAssetToDb(asset).catch((err) =>
        console.error('Failed to persist asset:', err)
      );

      return id;
    },

    updateAsset: (id, updates) => {
      let updatedAsset: Asset | undefined;

      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          Object.assign(asset, updates, { updatedAt: createTimestamp() });
          updatedAsset = { ...asset };
        }
      });

      // Persist to database
      if (updatedAsset) {
        saveAssetToDb(updatedAsset).catch((err) =>
          console.error('Failed to persist asset update:', err)
        );
      }
    },

    deleteAsset: (id) => {
      // Get the asset before deleting to check storage URL
      const asset = get().assets.get(id);
      const assetUrl = asset?.url;

      set((state) => {
        state.assets.delete(id);
        state.selectedAssetIds.delete(id);
        state.gallery.totalCount--;

        // Remove from collections
        for (const collection of state.collections.values()) {
          collection.assetIds = collection.assetIds.filter((aid) => aid !== id);
        }

        if (state.focusedAssetId === id) {
          state.focusedAssetId = null;
        }
        if (state.lightboxAssetId === id) {
          state.lightboxAssetId = null;
        }
      });

      // Delete file from storage if it's a storage URL
      if (assetUrl && isStorageUrl(assetUrl)) {
        const parsed = parseStorageUrl(assetUrl);
        if (parsed && isStorageInitialized()) {
          const storage = getStorage();
          storage.deleteFile(parsed.id).catch((err) =>
            console.error('Failed to delete file from storage:', err)
          );
        }
      }

      // Persist deletion to database
      deleteAssetFromDb(id).catch((err) =>
        console.error('Failed to delete asset from db:', err)
      );

      // Also update collections that contained this asset
      const collections = get().collections;
      for (const collection of collections.values()) {
        saveCollectionToDb(collection).catch((err) =>
          console.error('Failed to update collection after asset delete:', err)
        );
      }
    },

    archiveAsset: (id) => {
      let updatedAsset: Asset | undefined;

      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.isArchived = true;
          asset.updatedAt = createTimestamp();
          updatedAsset = { ...asset };
        }
      });

      if (updatedAsset) {
        saveAssetToDb(updatedAsset).catch((err) =>
          console.error('Failed to persist archive:', err)
        );
      }
    },

    unarchiveAsset: (id) => {
      let updatedAsset: Asset | undefined;

      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.isArchived = false;
          asset.updatedAt = createTimestamp();
          updatedAsset = { ...asset };
        }
      });

      if (updatedAsset) {
        saveAssetToDb(updatedAsset).catch((err) =>
          console.error('Failed to persist unarchive:', err)
        );
      }
    },

    // Bulk operations
    batchOperation: (operation) => {
      const { assetIds, operation: op, params } = operation;
      const updatedAssets: Asset[] = [];
      const deletedIds: UUID[] = [];
      const storageIdsToDelete: string[] = [];

      set((state) => {
        for (const id of assetIds) {
          const asset = state.assets.get(id);
          if (!asset) continue;

          switch (op) {
            case 'delete':
              // Collect storage URLs for files to delete
              if (asset.url && isStorageUrl(asset.url)) {
                const parsed = parseStorageUrl(asset.url);
                if (parsed) {
                  storageIdsToDelete.push(parsed.id);
                }
              }
              state.assets.delete(id);
              state.selectedAssetIds.delete(id);
              deletedIds.push(id);
              break;
            case 'archive':
              asset.isArchived = true;
              asset.updatedAt = createTimestamp();
              updatedAssets.push({ ...asset });
              break;
            case 'unarchive':
              asset.isArchived = false;
              asset.updatedAt = createTimestamp();
              updatedAssets.push({ ...asset });
              break;
            case 'favorite':
              asset.isFavorite = true;
              asset.updatedAt = createTimestamp();
              updatedAssets.push({ ...asset });
              break;
            case 'unfavorite':
              asset.isFavorite = false;
              asset.updatedAt = createTimestamp();
              updatedAssets.push({ ...asset });
              break;
            case 'tag':
              if (params?.tags) {
                asset.tags = [...new Set([...asset.tags, ...params.tags])];
                asset.updatedAt = createTimestamp();
                updatedAssets.push({ ...asset });
              }
              break;
            case 'untag':
              if (params?.tags) {
                asset.tags = asset.tags.filter((t) => !params.tags!.includes(t));
                asset.updatedAt = createTimestamp();
                updatedAssets.push({ ...asset });
              }
              break;
            case 'move':
              if (params?.projectId !== undefined) {
                asset.projectId = params.projectId;
                asset.updatedAt = createTimestamp();
                updatedAssets.push({ ...asset });
              }
              break;
          }
        }
      });

      // Persist changes to database
      if (deletedIds.length > 0) {
        deleteAssetsFromDb(deletedIds).catch((err) =>
          console.error('Failed to delete assets from db:', err)
        );

        // Delete files from storage
        if (storageIdsToDelete.length > 0 && isStorageInitialized()) {
          const storage = getStorage();
          for (const storageId of storageIdsToDelete) {
            storage.deleteFile(storageId).catch((err) =>
              console.error('Failed to delete file from storage:', err)
            );
          }
        }
      }

      for (const asset of updatedAssets) {
        saveAssetToDb(asset).catch((err) =>
          console.error('Failed to persist batch update:', err)
        );
      }
    },

    deleteAssets: (ids) => {
      get().batchOperation({ assetIds: ids, operation: 'delete' });
    },

    // Favorites
    toggleFavorite: (id) => {
      let updatedAsset: Asset | undefined;

      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.isFavorite = !asset.isFavorite;
          asset.updatedAt = createTimestamp();
          updatedAsset = { ...asset };
        }
      });

      if (updatedAsset) {
        saveAssetToDb(updatedAsset).catch((err) =>
          console.error('Failed to persist favorite toggle:', err)
        );
      }
    },

    setFavorite: (id, isFavorite) => {
      let updatedAsset: Asset | undefined;

      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.isFavorite = isFavorite;
          asset.updatedAt = createTimestamp();
          updatedAsset = { ...asset };
        }
      });

      if (updatedAsset) {
        saveAssetToDb(updatedAsset).catch((err) =>
          console.error('Failed to persist favorite:', err)
        );
      }
    },

    // Tags
    addTag: (id, tag) => {
      let updatedAsset: Asset | undefined;

      set((state) => {
        const asset = state.assets.get(id);
        if (asset && !asset.tags.includes(tag)) {
          asset.tags.push(tag);
          asset.updatedAt = createTimestamp();
          updatedAsset = { ...asset };
        }
      });

      if (updatedAsset) {
        saveAssetToDb(updatedAsset).catch((err) =>
          console.error('Failed to persist tag add:', err)
        );
      }
    },

    removeTag: (id, tag) => {
      let updatedAsset: Asset | undefined;

      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.tags = asset.tags.filter((t) => t !== tag);
          asset.updatedAt = createTimestamp();
          updatedAsset = { ...asset };
        }
      });

      if (updatedAsset) {
        saveAssetToDb(updatedAsset).catch((err) =>
          console.error('Failed to persist tag remove:', err)
        );
      }
    },

    setTags: (id, tags) => {
      let updatedAsset: Asset | undefined;

      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.tags = tags;
          asset.updatedAt = createTimestamp();
          updatedAsset = { ...asset };
        }
      });

      if (updatedAsset) {
        saveAssetToDb(updatedAsset).catch((err) =>
          console.error('Failed to persist tags:', err)
        );
      }
    },

    // Collections
    createCollection: (name, assetIds = []) => {
      const id = createUUID();
      const now = createTimestamp();

      const collection: AssetCollection = {
        id,
        name,
        assetIds,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => {
        state.collections.set(id, collection);
      });

      // Persist to database
      saveCollectionToDb(collection).catch((err) =>
        console.error('Failed to persist collection:', err)
      );

      return id;
    },

    updateCollection: (id, updates) => {
      let updatedCollection: AssetCollection | undefined;

      set((state) => {
        const collection = state.collections.get(id);
        if (collection) {
          Object.assign(collection, updates, { updatedAt: createTimestamp() });
          updatedCollection = { ...collection };
        }
      });

      if (updatedCollection) {
        saveCollectionToDb(updatedCollection).catch((err) =>
          console.error('Failed to persist collection update:', err)
        );
      }
    },

    deleteCollection: (id) => {
      set((state) => {
        state.collections.delete(id);
      });

      // Persist deletion
      deleteCollectionFromDb(id).catch((err) =>
        console.error('Failed to delete collection from db:', err)
      );
    },

    addToCollection: (collectionId, assetIds) => {
      let updatedCollection: AssetCollection | undefined;

      set((state) => {
        const collection = state.collections.get(collectionId);
        if (collection) {
          collection.assetIds = [...new Set([...collection.assetIds, ...assetIds])];
          collection.updatedAt = createTimestamp();
          updatedCollection = { ...collection };
        }
      });

      if (updatedCollection) {
        saveCollectionToDb(updatedCollection).catch((err) =>
          console.error('Failed to persist collection add:', err)
        );
      }
    },

    removeFromCollection: (collectionId, assetIds) => {
      let updatedCollection: AssetCollection | undefined;

      set((state) => {
        const collection = state.collections.get(collectionId);
        if (collection) {
          const toRemove = new Set(assetIds);
          collection.assetIds = collection.assetIds.filter((id) => !toRemove.has(id));
          collection.updatedAt = createTimestamp();
          updatedCollection = { ...collection };
        }
      });

      if (updatedCollection) {
        saveCollectionToDb(updatedCollection).catch((err) =>
          console.error('Failed to persist collection remove:', err)
        );
      }
    },

    // Gallery
    setFilters: (filters) => {
      set((state) => {
        state.gallery.filters = { ...state.gallery.filters, ...filters };
      });
    },

    setSorting: (sorting) => {
      set((state) => {
        state.gallery.sorting = sorting;
      });
    },

    setViewMode: (mode) => {
      set((state) => {
        state.gallery.viewMode = mode;
      });
    },

    setGridColumns: (columns) => {
      set((state) => {
        state.gallery.gridColumns = columns;
      });
    },

    clearFilters: () => {
      set((state) => {
        state.gallery.filters = {};
      });
    },

    // Selection
    selectAsset: (id) => {
      set((state) => {
        state.selectedAssetIds.add(id);
        state.focusedAssetId = id;
      });
    },

    deselectAsset: (id) => {
      set((state) => {
        state.selectedAssetIds.delete(id);
      });
    },

    toggleSelection: (id) => {
      set((state) => {
        if (state.selectedAssetIds.has(id)) {
          state.selectedAssetIds.delete(id);
        } else {
          state.selectedAssetIds.add(id);
        }
        state.focusedAssetId = id;
      });
    },

    selectRange: (fromId, toId) => {
      const assets = get().getSortedAssets();
      const fromIndex = assets.findIndex((a) => a.id === fromId);
      const toIndex = assets.findIndex((a) => a.id === toId);

      if (fromIndex === -1 || toIndex === -1) return;

      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);

      set((state) => {
        for (let i = start; i <= end; i++) {
          state.selectedAssetIds.add(assets[i].id);
        }
        state.focusedAssetId = toId;
      });
    },

    selectAll: () => {
      const assets = get().getFilteredAssets();
      set((state) => {
        for (const asset of assets) {
          state.selectedAssetIds.add(asset.id);
        }
      });
    },

    deselectAll: () => {
      set((state) => {
        state.selectedAssetIds.clear();
      });
    },

    setFocusedAsset: (id) => {
      set((state) => {
        state.focusedAssetId = id;
      });
    },

    // Lightbox
    openLightbox: (id) => {
      const assets = get().getSortedAssets();
      const index = assets.findIndex((a) => a.id === id);

      set((state) => {
        state.lightboxAssetId = id;
        state.lightboxIndex = index >= 0 ? index : 0;
      });
    },

    closeLightbox: () => {
      set((state) => {
        state.lightboxAssetId = null;
      });
    },

    nextInLightbox: () => {
      const assets = get().getSortedAssets();
      set((state) => {
        const nextIndex = (state.lightboxIndex + 1) % assets.length;
        state.lightboxIndex = nextIndex;
        state.lightboxAssetId = assets[nextIndex]?.id || null;
      });
    },

    prevInLightbox: () => {
      const assets = get().getSortedAssets();
      set((state) => {
        const prevIndex = (state.lightboxIndex - 1 + assets.length) % assets.length;
        state.lightboxIndex = prevIndex;
        state.lightboxAssetId = assets[prevIndex]?.id || null;
      });
    },

    // Queries
    getFilteredAssets: () => {
      const { assets, gallery } = get();
      const { filters } = gallery;
      let result = Array.from(assets.values());

      // Apply filters
      if (!filters.includeArchived) {
        result = result.filter((a) => !a.isArchived);
      }

      if (filters.types?.length) {
        result = result.filter((a) => filters.types!.includes(a.type));
      }

      if (filters.formats?.length) {
        result = result.filter((a) => filters.formats!.includes(a.format));
      }

      if (filters.tags?.length) {
        result = result.filter((a) =>
          filters.tags!.some((tag) => a.tags.includes(tag))
        );
      }

      if (filters.projectId) {
        result = result.filter((a) => a.projectId === filters.projectId);
      }

      if (filters.collectionId) {
        const collection = get().collections.get(filters.collectionId);
        if (collection) {
          const assetIdSet = new Set(collection.assetIds);
          result = result.filter((a) => assetIdSet.has(a.id));
        }
      }

      if (filters.isFavorite !== undefined) {
        result = result.filter((a) => a.isFavorite === filters.isFavorite);
      }

      if (filters.query) {
        const query = filters.query.toLowerCase();
        result = result.filter(
          (a) =>
            a.name.toLowerCase().includes(query) ||
            a.description?.toLowerCase().includes(query) ||
            a.tags.some((t) => t.toLowerCase().includes(query))
        );
      }

      if (filters.fromDate) {
        result = result.filter((a) => a.createdAt >= filters.fromDate!);
      }

      if (filters.toDate) {
        result = result.filter((a) => a.createdAt <= filters.toDate!);
      }

      if (filters.minSize) {
        result = result.filter((a) => a.metadata.fileSize >= filters.minSize!);
      }

      if (filters.maxSize) {
        result = result.filter((a) => a.metadata.fileSize <= filters.maxSize!);
      }

      return result;
    },

    getSortedAssets: () => {
      const assets = get().getFilteredAssets();
      const { sorting } = get().gallery;

      return [...assets].sort((a, b) => {
        let comparison = 0;

        switch (sorting.field) {
          case 'createdAt':
            comparison = a.createdAt - b.createdAt;
            break;
          case 'updatedAt':
            comparison = a.updatedAt - b.updatedAt;
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'fileSize':
            comparison = a.metadata.fileSize - b.metadata.fileSize;
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
        }

        return sorting.direction === 'asc' ? comparison : -comparison;
      });
    },

    getAssetsByType: (type) => {
      return Array.from(get().assets.values()).filter((a) => a.type === type && !a.isArchived);
    },

    getAssetsByCollection: (collectionId) => {
      const collection = get().collections.get(collectionId);
      if (!collection) return [];

      return collection.assetIds
        .map((id) => get().assets.get(id))
        .filter((a): a is Asset => a !== undefined);
    },

    getRecentAssets: (limit = 10) => {
      return Array.from(get().assets.values())
        .filter((a) => !a.isArchived)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    },

    getFavoriteAssets: () => {
      return Array.from(get().assets.values()).filter((a) => a.isFavorite && !a.isArchived);
    },

    searchAssets: (query) => {
      const q = query.toLowerCase();
      return Array.from(get().assets.values()).filter(
        (a) =>
          !a.isArchived &&
          (a.name.toLowerCase().includes(q) ||
            a.description?.toLowerCase().includes(q) ||
            a.tags.some((t) => t.toLowerCase().includes(q)))
      );
    },

    getAllTags: () => {
      const tags = new Set<string>();
      for (const asset of get().assets.values()) {
        for (const tag of asset.tags) {
          tags.add(tag);
        }
      }
      return Array.from(tags).sort();
    },

    // Upload
    uploadAsset: async (input) => {
      set((state) => {
        state.isUploading = true;
        state.uploadProgress = 0;
      });

      try {
        const assetId = createUUID();
        let url: string;
        let thumbnailUrl: string | undefined;
        let storageLocation: 'local' | 'blob' = 'blob';

        // Get metadata
        const metadata = await extractFileMetadata(input.file);

        set((state) => {
          state.uploadProgress = 20;
        });

        // Try to use file storage if available
        if (isStorageInitialized()) {
          try {
            const storage = getStorage();
            const storageType = storage.getStorageType();

            // Save the file
            await storage.saveFile(assetId, input.file, {
              name: input.name || input.file.name,
              mimeType: input.file.type,
              size: input.file.size,
              createdAt: Date.now(),
            });

            // Create storage URL
            url = `${storageType}://${assetId}`;
            storageLocation = 'local';

            set((state) => {
              state.uploadProgress = 60;
            });

            // Generate and store thumbnail
            const thumbnail = await generateThumbnail(input.file, input.file.type);
            if (thumbnail) {
              thumbnailUrl = await storage.saveThumbnail(assetId, thumbnail);
            }

            set((state) => {
              state.uploadProgress = 80;
            });

            console.log(`[AssetStore] Uploaded asset ${assetId} to ${storageType}`);
          } catch (storageError) {
            console.warn('[AssetStore] File storage failed, falling back to data URL:', storageError);
            // Fall back to data URL
            url = await readFileAsDataUrl(input.file);
            storageLocation = 'blob';
          }
        } else {
          // Storage not initialized, use data URL
          url = await readFileAsDataUrl(input.file);
        }

        // Create asset
        const id = get().createAsset({
          name: input.name || input.file.name,
          description: input.description,
          type: getContentTypeFromMime(input.file.type),
          format: getFormatFromMime(input.file.type),
          url,
          thumbnailUrl,
          storageLocation,
          metadata,
          projectId: input.projectId,
          tags: input.tags || [],
          isFavorite: false,
          isArchived: false,
        });

        set((state) => {
          state.isUploading = false;
          state.uploadProgress = 100;
        });

        return id;
      } catch (error) {
        set((state) => {
          state.isUploading = false;
          state.uploadProgress = 0;
        });
        throw error;
      }
    },

    setUploadProgress: (progress) => {
      set((state) => {
        state.uploadProgress = progress;
      });
    },

    // Persistence
    loadFromDatabase: (assets, collections) => {
      set((state) => {
        state.assets.clear();
        state.collections.clear();

        for (const asset of assets) {
          state.assets.set(asset.id, asset);
        }

        for (const collection of collections) {
          state.collections.set(collection.id, collection);
        }

        state.gallery.totalCount = assets.length;
      });
    },
  }))
);

// Helper functions
async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractFileMetadata(file: File): Promise<AssetMetadata> {
  const metadata: AssetMetadata = {
    fileSize: file.size,
    mimeType: file.type,
  };

  // Extract image dimensions
  if (file.type.startsWith('image/')) {
    try {
      const dimensions = await getImageDims(file);
      metadata.width = dimensions.width;
      metadata.height = dimensions.height;
    } catch {
      // Ignore dimension extraction errors
    }
  }

  // Extract video metadata
  if (file.type.startsWith('video/')) {
    try {
      const videoMeta = await getVideoMetadata(file);
      metadata.width = videoMeta.width;
      metadata.height = videoMeta.height;
      metadata.duration = videoMeta.duration;
    } catch {
      // Ignore video metadata extraction errors
    }
  }

  return metadata;
}

function getContentTypeFromMime(mimeType: string): ContentType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'text';
}

function getFormatFromMime(mimeType: string): AssetFormat {
  const formats: Record<string, AssetFormat> = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };
  return formats[mimeType] || 'png';
}

// Selectors - Use proper memoization to prevent infinite re-renders

/**
 * Returns sorted assets with stable reference.
 * Only recomputes when assets, filters, or sorting changes.
 */
export const useAssets = () => {
  const assets = useAssetStore((state) => state.assets);
  const filters = useAssetStore((state) => state.gallery.filters);
  const sorting = useAssetStore((state) => state.gallery.sorting);
  const collections = useAssetStore((state) => state.collections);
  const getSortedAssets = useAssetStore((state) => state.getSortedAssets);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- dependencies trigger re-computation via getSortedAssets
  return useMemo(() => getSortedAssets(), [assets, filters, sorting, collections, getSortedAssets]);
};

/**
 * Returns a single asset by ID with stable reference.
 */
export const useAsset = (id: UUID | null) => {
  const assets = useAssetStore((state) => state.assets);

  return useMemo(() => (id ? assets.get(id) : undefined), [assets, id]);
};

/**
 * Returns selected assets with stable reference.
 * Only recomputes when selection or assets change.
 */
export const useSelectedAssets = () => {
  const assets = useAssetStore((state) => state.assets);
  const selectedAssetIds = useAssetStore((state) => state.selectedAssetIds);

  return useMemo(() => {
    const selectedIds = Array.from(selectedAssetIds);
    return selectedIds
      .map((id) => assets.get(id))
      .filter((a): a is Asset => !!a);
  }, [assets, selectedAssetIds]);
};

/**
 * Returns all collections with stable reference.
 */
export const useCollections = () => {
  const collections = useAssetStore((state) => state.collections);

  return useMemo(() => Array.from(collections.values()), [collections]);
};

/**
 * Returns a single collection by ID with stable reference.
 */
export const useCollection = (id: UUID | null) => {
  const collections = useAssetStore((state) => state.collections);

  return useMemo(
    () => (id ? collections.get(id) : undefined),
    [collections, id]
  );
};

/**
 * Returns gallery state with stable reference.
 */
export const useGalleryState = () => {
  const viewMode = useAssetStore((state) => state.gallery.viewMode);
  const gridColumns = useAssetStore((state) => state.gallery.gridColumns);
  const filters = useAssetStore((state) => state.gallery.filters);
  const sorting = useAssetStore((state) => state.gallery.sorting);
  const visibleRange = useAssetStore((state) => state.gallery.visibleRange);
  const isLoading = useAssetStore((state) => state.gallery.isLoading);
  const hasMore = useAssetStore((state) => state.gallery.hasMore);
  const totalCount = useAssetStore((state) => state.gallery.totalCount);

  return useMemo(
    () => ({
      viewMode,
      gridColumns,
      filters,
      sorting,
      visibleRange,
      isLoading,
      hasMore,
      totalCount,
    }),
    [viewMode, gridColumns, filters, sorting, visibleRange, isLoading, hasMore, totalCount]
  );
};

/**
 * Returns lightbox state with stable reference.
 */
export const useLightboxState = () => {
  const lightboxAssetId = useAssetStore((state) => state.lightboxAssetId);
  const lightboxIndex = useAssetStore((state) => state.lightboxIndex);

  return useMemo(
    () => ({
      assetId: lightboxAssetId,
      index: lightboxIndex,
      isOpen: lightboxAssetId !== null,
    }),
    [lightboxAssetId, lightboxIndex]
  );
};

/**
 * Returns upload state with stable reference.
 */
export const useUploadState = () => {
  const isUploading = useAssetStore((state) => state.isUploading);
  const uploadProgress = useAssetStore((state) => state.uploadProgress);

  return useMemo(
    () => ({
      isUploading,
      progress: uploadProgress,
    }),
    [isUploading, uploadProgress]
  );
};
