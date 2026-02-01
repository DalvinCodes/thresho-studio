/**
 * Assets Feature Exports
 */

// Store
export {
  useAssetStore,
  useAssets,
  useAsset,
  useSelectedAssets,
  useCollections,
  useCollection,
  useGalleryState,
  useLightboxState,
  useUploadState,
} from './store';

// Services
export {
  loadAssetsFromDb,
  saveAssetToDb,
  deleteAssetFromDb,
  deleteAssetsFromDb,
  saveCollectionToDb,
  deleteCollectionFromDb,
  getAssetFromDb,
  getCollectionFromDb,
} from './services/assetDbService';

// Components
export { AssetGallery } from './components/AssetGallery';
export { CollectionSidebar } from './components/CollectionSidebar';
export { ExportDialog } from './components/ExportDialog';

// Types (re-export from core)
export type {
  Asset,
  AssetMetadata,
  AssetCollection,
  AssetSearchParams,
  AssetSortParams,
  AssetSortField,
  AssetGalleryState,
  AssetOperationResult,
  AssetExportOptions,
  BatchAssetOperation,
  AssetUploadInput,
  AssetWithGeneration,
} from '../../core/types/asset';
