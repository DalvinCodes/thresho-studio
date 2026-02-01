/**
 * Asset Skeleton Components
 * Loading placeholders for AssetGallery
 */

import { cn } from '../../core/utils/cn';

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-[var(--color-text)]/[0.08] rounded animate-pulse',
        className
      )}
    />
  );
}

function ShimmerOverlay() {
  return (
    <div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--color-text)]/[0.05] to-transparent"
      style={{
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

// Grid view skeleton - single card
export function AssetCardSkeleton() {
  return (
    <div className="group relative rounded-3xl overflow-hidden">
      {/* Image placeholder */}
      <div className="aspect-square bg-gradient-to-br from-[var(--color-surface-raised)] to-[var(--color-surface)] relative overflow-hidden">
        <ShimmerOverlay />
      </div>

      {/* Info overlay skeleton */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
        <Skeleton className="h-4 bg-surface-raised rounded w-3/4 mb-1" />
        <Skeleton className="h-3 bg-surface-raised rounded w-1/2" />
      </div>
    </div>
  );
}

// List view skeleton - single item
export function AssetListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-3xl">
      {/* Thumbnail placeholder */}
      <div className="w-14 h-14 rounded bg-[var(--color-surface)] relative overflow-hidden flex-shrink-0">
        <ShimmerOverlay />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>

      {/* Tags placeholder */}
      <div className="flex gap-1">
        <Skeleton className="h-5 w-12 rounded" />
        <Skeleton className="h-5 w-10 rounded" />
      </div>

      {/* Date placeholder */}
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

interface AssetGallerySkeletonProps {
  viewMode: 'grid' | 'list';
  gridColumns?: number;
  count?: number;
}

// Full gallery skeleton
export function AssetGallerySkeleton({
  viewMode,
  gridColumns = 4,
  count = 12,
}: AssetGallerySkeletonProps) {
  if (viewMode === 'list') {
    return (
      <div className="px-4 space-y-1">
        {Array.from({ length: count }).map((_, i) => (
          <AssetListItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Grid view
  const rows = Math.ceil(count / gridColumns);

  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}
        >
          {Array.from({ length: gridColumns }).map((_, colIndex) => {
            const index = rowIndex * gridColumns + colIndex;
            if (index >= count) return null;
            return <AssetCardSkeleton key={colIndex} />;
          })}
        </div>
      ))}
    </div>
  );
}
