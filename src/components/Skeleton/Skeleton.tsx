/**
 * Skeleton Components
 * Loading placeholders with shimmer animation
 */

import { cn } from '../../core/utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-[var(--color-text)]/[0.08] rounded animate-pulse',
        className
      )}
    />
  );
}

interface ShimmerSkeletonProps {
  className?: string;
}

export function ShimmerSkeleton({ className }: ShimmerSkeletonProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--color-text)]/[0.05] to-transparent animate-shimmer" />
    </div>
  );
}

export function SkeletonText({ className, lines = 1 }: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}
