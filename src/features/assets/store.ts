/**
 * Asset Store
 * Manages generated assets with filtering, sorting, and virtualization support
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
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
  AssetWithGeneration,
} from '../../core/types/asset';

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

      return id;
    },

    updateAsset: (id, updates) => {
      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          Object.assign(asset, updates, { updatedAt: createTimestamp() });
        }
      });
    },

    deleteAsset: (id) => {
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
    },

    archiveAsset: (id) => {
      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.isArchived = true;
          asset.updatedAt = createTimestamp();
        }
      });
    },

    unarchiveAsset: (id) => {
      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.isArchived = false;
          asset.updatedAt = createTimestamp();
        }
      });
    },

    // Bulk operations
    batchOperation: (operation) => {
      const { assetIds, operation: op, params } = operation;

      set((state) => {
        for (const id of assetIds) {
          const asset = state.assets.get(id);
          if (!asset) continue;

          switch (op) {
            case 'delete':
              state.assets.delete(id);
              state.selectedAssetIds.delete(id);
              break;
            case 'archive':
              asset.isArchived = true;
              break;
            case 'unarchive':
              asset.isArchived = false;
              break;
            case 'favorite':
              asset.isFavorite = true;
              break;
            case 'unfavorite':
              asset.isFavorite = false;
              break;
            case 'tag':
              if (params?.tags) {
                asset.tags = [...new Set([...asset.tags, ...params.tags])];
              }
              break;
            case 'untag':
              if (params?.tags) {
                asset.tags = asset.tags.filter((t) => !params.tags!.includes(t));
              }
              break;
            case 'move':
              if (params?.projectId !== undefined) {
                asset.projectId = params.projectId;
              }
              break;
          }

          asset.updatedAt = createTimestamp();
        }
      });
    },

    deleteAssets: (ids) => {
      get().batchOperation({ assetIds: ids, operation: 'delete' });
    },

    // Favorites
    toggleFavorite: (id) => {
      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.isFavorite = !asset.isFavorite;
          asset.updatedAt = createTimestamp();
        }
      });
    },

    setFavorite: (id, isFavorite) => {
      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.isFavorite = isFavorite;
          asset.updatedAt = createTimestamp();
        }
      });
    },

    // Tags
    addTag: (id, tag) => {
      set((state) => {
        const asset = state.assets.get(id);
        if (asset && !asset.tags.includes(tag)) {
          asset.tags.push(tag);
          asset.updatedAt = createTimestamp();
        }
      });
    },

    removeTag: (id, tag) => {
      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.tags = asset.tags.filter((t) => t !== tag);
          asset.updatedAt = createTimestamp();
        }
      });
    },

    setTags: (id, tags) => {
      set((state) => {
        const asset = state.assets.get(id);
        if (asset) {
          asset.tags = tags;
          asset.updatedAt = createTimestamp();
        }
      });
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

      return id;
    },

    updateCollection: (id, updates) => {
      set((state) => {
        const collection = state.collections.get(id);
        if (collection) {
          Object.assign(collection, updates, { updatedAt: createTimestamp() });
        }
      });
    },

    deleteCollection: (id) => {
      set((state) => {
        state.collections.delete(id);
      });
    },

    addToCollection: (collectionId, assetIds) => {
      set((state) => {
        const collection = state.collections.get(collectionId);
        if (collection) {
          collection.assetIds = [...new Set([...collection.assetIds, ...assetIds])];
          collection.updatedAt = createTimestamp();
        }
      });
    },

    removeFromCollection: (collectionId, assetIds) => {
      set((state) => {
        const collection = state.collections.get(collectionId);
        if (collection) {
          const toRemove = new Set(assetIds);
          collection.assetIds = collection.assetIds.filter((id) => !toRemove.has(id));
          collection.updatedAt = createTimestamp();
        }
      });
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
        // Read file
        const fileData = await readFileAsDataUrl(input.file);

        // Get metadata
        const metadata = await extractFileMetadata(input.file);

        // Create asset
        const id = get().createAsset({
          name: input.name || input.file.name,
          description: input.description,
          type: getContentTypeFromMime(input.file.type),
          format: getFormatFromMime(input.file.type),
          url: fileData,
          storageLocation: 'blob',
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
      const dimensions = await getImageDimensions(file);
      metadata.width = dimensions.width;
      metadata.height = dimensions.height;
    } catch {
      // Ignore dimension extraction errors
    }
  }

  // Extract video metadata would require more complex handling
  // (e.g., using a video element to get duration)

  return metadata;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
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

// Selectors

export const useAssets = () => {
  const store = useAssetStore();
  return store.getSortedAssets();
};

export const useAsset = (id: UUID | null) => {
  const store = useAssetStore();
  return id ? store.assets.get(id) : undefined;
};

export const useSelectedAssets = () => {
  const store = useAssetStore();
  const selectedIds = Array.from(store.selectedAssetIds);
  return selectedIds.map((id) => store.assets.get(id)).filter((a): a is Asset => !!a);
};

export const useCollections = () => {
  const store = useAssetStore();
  return Array.from(store.collections.values());
};

export const useCollection = (id: UUID | null) => {
  const store = useAssetStore();
  return id ? store.collections.get(id) : undefined;
};

export const useGalleryState = () => {
  const store = useAssetStore();
  return store.gallery;
};

export const useLightboxState = () => {
  const store = useAssetStore();
  return {
    assetId: store.lightboxAssetId,
    index: store.lightboxIndex,
    isOpen: store.lightboxAssetId !== null,
  };
};

export const useUploadState = () => {
  const store = useAssetStore();
  return {
    isUploading: store.isUploading,
    progress: store.uploadProgress,
  };
};
