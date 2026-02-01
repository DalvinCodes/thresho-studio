/**
 * Asset Gallery Component
 * Virtualized grid/list view for browsing assets with TanStack Virtual
 */

import { useRef, useCallback, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { UUID, ContentType } from '../../../core/types/common';
import type { Asset } from '../../../core/types/asset';
import {
  useAssetStore,
  useAssets,
  useGalleryState,
  useSelectedAssets,
  useLightboxState,
} from '../store';
import { StorageImage, StorageVideo } from '../../../components/StorageMedia';
import { ExportDialog } from './ExportDialog';

interface AssetGalleryProps {
  onAssetSelect?: (asset: Asset) => void;
  onAssetDoubleClick?: (asset: Asset) => void;
}

export function AssetGallery({ onAssetSelect, onAssetDoubleClick }: AssetGalleryProps) {
  const assets = useAssets();
  const galleryState = useGalleryState();
  const selectedAssets = useSelectedAssets();
  const lightboxState = useLightboxState();

  const {
    setFilters,
    // setSorting, - unused
    setViewMode,
    setGridColumns,
    // clearFilters, - unused
    toggleSelection,
    selectRange,
    selectAll,
    deselectAll,
    openLightbox,
    closeLightbox,
    nextInLightbox,
    prevInLightbox,
    uploadAsset,
    deleteAssets,
    toggleFavorite,
  } = useAssetStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [lastSelectedId, setLastSelectedId] = useState<UUID | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate row count for virtualization
  const rowCount = useMemo(() => {
    if (galleryState.viewMode === 'list') {
      return assets.length;
    }
    return Math.ceil(assets.length / galleryState.gridColumns);
  }, [assets.length, galleryState.viewMode, galleryState.gridColumns]);

  // Virtualizer for rows
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => galleryState.viewMode === 'list' ? 72 : 200,
    overscan: 5,
  });

  // Handle asset click
  const handleAssetClick = useCallback((asset: Asset, e: React.MouseEvent) => {
    if (e.shiftKey && lastSelectedId) {
      selectRange(lastSelectedId, asset.id);
    } else if (e.ctrlKey || e.metaKey) {
      toggleSelection(asset.id);
    } else {
      deselectAll();
      toggleSelection(asset.id);
      onAssetSelect?.(asset);
    }
    setLastSelectedId(asset.id);
  }, [lastSelectedId, selectRange, toggleSelection, deselectAll, onAssetSelect]);

  // Handle asset double-click
  const handleAssetDoubleClick = useCallback((asset: Asset) => {
    if (asset.type === 'image' || asset.type === 'video') {
      openLightbox(asset.id);
    }
    onAssetDoubleClick?.(asset);
  }, [openLightbox, onAssetDoubleClick]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setFilters({ query: query || undefined });
  }, [setFilters]);

  // Handle type filter
  const handleTypeFilter = useCallback((type: ContentType | '') => {
    setFilters({ types: type ? [type] : undefined });
  }, [setFilters]);

  // Handle file drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        await uploadAsset({ file });
      }
    }
  }, [uploadAsset]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      selectAll();
    } else if (e.key === 'Escape') {
      deselectAll();
      closeLightbox();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedAssets.length > 0) {
        if (confirm(`Delete ${selectedAssets.length} asset(s)?`)) {
          deleteAssets(selectedAssets.map((a) => a.id));
        }
      }
    } else if (e.key === 'ArrowRight' && lightboxState.isOpen) {
      nextInLightbox();
    } else if (e.key === 'ArrowLeft' && lightboxState.isOpen) {
      prevInLightbox();
    }
  }, [selectAll, deselectAll, closeLightbox, selectedAssets, deleteAssets, lightboxState.isOpen, nextInLightbox, prevInLightbox]);

  // Get assets for a row
  const getAssetsForRow = useCallback((rowIndex: number): Asset[] => {
    if (galleryState.viewMode === 'list') {
      return [assets[rowIndex]].filter(Boolean);
    }
    const start = rowIndex * galleryState.gridColumns;
    return assets.slice(start, start + galleryState.gridColumns);
  }, [assets, galleryState.viewMode, galleryState.gridColumns]);

  const selectedIds = useMemo(() => new Set(selectedAssets.map((a) => a.id)), [selectedAssets]);

  return (
    <div
      className="h-full flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Toolbar */}
      <div className="p-4 border-b border-border bg-surface flex items-center gap-4">
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search assets..."
          className="flex-1 max-w-xs px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />

        {/* Type filter */}
        <select
          value={galleryState.filters.types?.[0] || ''}
          onChange={(e) => handleTypeFilter(e.target.value as ContentType | '')}
          className="px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm"
        >
          <option value="">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="text">Text</option>
        </select>

        {/* Favorites filter */}
        <button
          onClick={() => setFilters({
            isFavorite: galleryState.filters.isFavorite ? undefined : true
          })}
          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
            galleryState.filters.isFavorite
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-background text-text-secondary hover:text-text-primary'
          }`}
        >
          ⭐ Favorites
        </button>

        <div className="flex-1" />

        {/* View mode toggle */}
        <div className="flex bg-background rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              galleryState.viewMode === 'grid'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            ▦ Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              galleryState.viewMode === 'list'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            ≡ List
          </button>
        </div>

        {/* Grid columns */}
        {galleryState.viewMode === 'grid' && (
          <select
            value={galleryState.gridColumns}
            onChange={(e) => setGridColumns(Number(e.target.value))}
            className="px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm"
          >
            <option value={2}>2 columns</option>
            <option value={3}>3 columns</option>
            <option value={4}>4 columns</option>
            <option value={5}>5 columns</option>
            <option value={6}>6 columns</option>
          </select>
        )}

        {/* Selection info */}
        {selectedAssets.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              {selectedAssets.length} selected
            </span>
            <button
              onClick={() => setShowExportDialog(true)}
              className="px-2 py-1 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
            >
              Export
            </button>
            <button
              onClick={() => deleteAssets(selectedAssets.map((a) => a.id))}
              className="px-2 py-1 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              Delete
            </button>
            <button
              onClick={deselectAll}
              className="px-2 py-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Export all button */}
        {selectedAssets.length === 0 && assets.length > 0 && (
          <button
            onClick={() => setShowExportDialog(true)}
            className="px-3 py-1.5 text-sm bg-background text-text-secondary hover:text-text-primary rounded-lg transition-colors"
          >
            Export All
          </button>
        )}
      </div>

      {/* Gallery */}
      <div
        ref={parentRef}
        className={`flex-1 overflow-auto ${isDragging ? 'ring-2 ring-primary ring-inset' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {assets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary">
            <p className="text-4xl mb-4">📁</p>
            <p className="mb-2">No assets found</p>
            <p className="text-sm">Drop files here or generate content to get started</p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const rowAssets = getAssetsForRow(virtualRow.index);

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {galleryState.viewMode === 'grid' ? (
                    <div
                      className="grid gap-4 p-4"
                      style={{
                        gridTemplateColumns: `repeat(${galleryState.gridColumns}, 1fr)`,
                      }}
                    >
                      {rowAssets.map((asset) => (
                        <AssetGridItem
                          key={asset.id}
                          asset={asset}
                          isSelected={selectedIds.has(asset.id)}
                          onClick={(e) => handleAssetClick(asset, e)}
                          onDoubleClick={() => handleAssetDoubleClick(asset)}
                          onFavorite={() => toggleFavorite(asset.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="px-4">
                      {rowAssets.map((asset) => (
                        <AssetListItem
                          key={asset.id}
                          asset={asset}
                          isSelected={selectedIds.has(asset.id)}
                          onClick={(e) => handleAssetClick(asset, e)}
                          onDoubleClick={() => handleAssetDoubleClick(asset)}
                          onFavorite={() => toggleFavorite(asset.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxState.isOpen && (
        <AssetLightbox
          onClose={closeLightbox}
          onNext={nextInLightbox}
          onPrev={prevInLightbox}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          assets={selectedAssets.length > 0 ? selectedAssets : assets}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
}

// Grid Item Component
interface AssetGridItemProps {
  asset: Asset;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onFavorite: () => void;
}

function AssetGridItem({ asset, isSelected, onClick, onDoubleClick, onFavorite }: AssetGridItemProps) {
  const typeIcons: Record<ContentType, string> = {
    text: '📝',
    image: '🖼️',
    video: '🎬',
  };

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`
        group relative rounded-lg overflow-hidden cursor-pointer transition-all
        ${isSelected ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/50'}
      `}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-background flex items-center justify-center">
        {asset.type === 'image' && asset.url ? (
          <StorageImage
            src={asset.thumbnailUrl || asset.url}
            alt={asset.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : asset.type === 'video' && asset.thumbnailUrl ? (
          <>
            <StorageImage
              src={asset.thumbnailUrl}
              alt={asset.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center text-white text-2xl">
                ▶
              </span>
            </div>
          </>
        ) : (
          <span className="text-4xl opacity-50">{typeIcons[asset.type]}</span>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs">
          ✓
        </div>
      )}

      {/* Favorite button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFavorite();
        }}
        className={`
          absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all
          ${asset.isFavorite
            ? 'bg-yellow-500 text-white'
            : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
          }
        `}
      >
        ⭐
      </button>

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-white text-sm font-medium truncate">{asset.name}</p>
        <p className="text-white/70 text-xs">
          {formatFileSize(asset.metadata.fileSize)}
          {asset.metadata.width && ` • ${asset.metadata.width}×${asset.metadata.height}`}
        </p>
      </div>
    </div>
  );
}

// List Item Component
interface AssetListItemProps {
  asset: Asset;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onFavorite: () => void;
}

function AssetListItem({ asset, isSelected, onClick, onDoubleClick, onFavorite }: AssetListItemProps) {
  const typeIcons: Record<ContentType, string> = {
    text: '📝',
    image: '🖼️',
    video: '🎬',
  };

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`
        flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all
        ${isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-surface-hover'}
      `}
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded bg-background flex items-center justify-center overflow-hidden flex-shrink-0">
        {asset.type === 'image' && asset.url ? (
          <StorageImage
            src={asset.thumbnailUrl || asset.url}
            alt={asset.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-2xl opacity-50">{typeIcons[asset.type]}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-text-primary font-medium truncate">{asset.name}</p>
        <p className="text-sm text-text-secondary">
          {formatFileSize(asset.metadata.fileSize)}
          {asset.metadata.width && ` • ${asset.metadata.width}×${asset.metadata.height}`}
          {asset.metadata.duration && ` • ${asset.metadata.duration}s`}
        </p>
      </div>

      {/* Tags */}
      {asset.tags.length > 0 && (
        <div className="flex gap-1">
          {asset.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded"
            >
              {tag}
            </span>
          ))}
          {asset.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-text-secondary">
              +{asset.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Favorite */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFavorite();
        }}
        className={`p-2 rounded transition-colors ${
          asset.isFavorite ? 'text-yellow-500' : 'text-text-secondary hover:text-yellow-500'
        }`}
      >
        ⭐
      </button>

      {/* Date */}
      <p className="text-sm text-text-secondary w-32 text-right">
        {new Date(asset.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

// Lightbox Component
interface AssetLightboxProps {
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

function AssetLightbox({ onClose, onNext, onPrev }: AssetLightboxProps) {
  const { assetId } = useLightboxState();
  const asset = useAssetStore((state) => assetId ? state.assets.get(assetId) : undefined);

  if (!asset) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        ✕
      </button>

      {/* Navigation */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        ←
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        →
      </button>

      {/* Content */}
      <div
        className="max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {asset.type === 'image' ? (
          <StorageImage
            src={asset.url}
            alt={asset.name}
            className="max-w-full max-h-[90vh] object-contain"
          />
        ) : asset.type === 'video' ? (
          <StorageVideo
            src={asset.url}
            controls
            autoPlay
            className="max-w-full max-h-[90vh]"
          />
        ) : (
          <div className="p-8 bg-surface rounded-lg max-w-2xl">
            <p className="text-text-primary whitespace-pre-wrap">
              {/* Text content would go here */}
            </p>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
        <p className="text-white font-medium">{asset.name}</p>
        <p className="text-white/70 text-sm">
          {formatFileSize(asset.metadata.fileSize)}
          {asset.metadata.width && ` • ${asset.metadata.width}×${asset.metadata.height}`}
        </p>
      </div>
    </div>
  );
}

// Utility functions
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default AssetGallery;
