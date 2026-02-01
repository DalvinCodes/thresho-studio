/**
 * StorageMedia Component
 * Renders images and videos from storage URLs (opfs://, idb://)
 * Handles URL resolution from storage to displayable blob URLs
 */

import { useState, useEffect } from 'react';
import { Image, Video } from 'lucide-react';
import {
  isStorageUrl,
  parseStorageUrl,
  getStorage,
  isStorageInitialized,
} from '../core/storage';

interface StorageImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | undefined | null;
  fallbackSrc?: string;
}

interface StorageVideoProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src'> {
  src: string | undefined | null;
  fallbackSrc?: string;
}

/**
 * Hook to resolve storage URLs to displayable blob URLs
 * 
 * IMPORTANT: This hook does NOT revoke blob URLs on unmount because:
 * 1. The storage layer (OPFS/IndexedDB) caches blob URLs by file ID
 * 2. If we revoke the URL, the storage cache still holds a reference to it
 * 3. Next time getFileUrl is called, it returns the cached (but now invalid) URL
 * 4. This causes "net::ERR_FILE_NOT_FOUND" errors when switching tabs
 * 
 * The storage layer manages blob URL lifecycle - URLs are only revoked when:
 * - The file is deleted (storage.deleteFile)
 * - Storage is cleared (storage.clearAll)
 * - A new blob is fetched for the same ID (automatic in createFileUrl)
 */
function useResolvedUrl(url: string | undefined | null): {
  resolvedUrl: string | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state
    setError(null);

    if (!url) {
      setResolvedUrl(null);
      setIsLoading(false);
      return;
    }

    // Not a storage URL, use as-is
    if (!isStorageUrl(url)) {
      setResolvedUrl(url);
      setIsLoading(false);
      return;
    }

    // Storage URL - need to resolve
    if (!isStorageInitialized()) {
      setError(new Error('Storage not initialized'));
      setResolvedUrl(null);
      setIsLoading(false);
      return;
    }

    const parsed = parseStorageUrl(url);
    if (!parsed) {
      setError(new Error('Invalid storage URL'));
      setResolvedUrl(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      setIsLoading(true);

      try {
        const storage = getStorage();
        const blobUrl = await storage.getFileUrl(parsed.id);

        if (cancelled) {
          // Component unmounted during fetch - don't update state
          // Note: We don't revoke the URL because the storage layer caches it
          return;
        }

        setResolvedUrl(blobUrl);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to resolve URL'));
          setResolvedUrl(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    resolve();

    return () => {
      cancelled = true;
      // Note: We intentionally don't revoke blob URLs here.
      // The storage layer caches them and returns the same URL on subsequent calls.
      // Revoking would invalidate the cached URL, causing errors on remount.
    };
  }, [url]);

  return { resolvedUrl, isLoading, error };
}

/**
 * Image component that handles storage URLs
 * Automatically resolves opfs:// and idb:// URLs to blob URLs
 */
export function StorageImage({
  src,
  fallbackSrc,
  alt = '',
  className,
  style,
  ...props
}: StorageImageProps) {
  const { resolvedUrl, isLoading, error } = useResolvedUrl(src);
  const [imgError, setImgError] = useState(false);

  // Reset img error when src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  // Determine what to display
  const displayUrl = imgError || error ? fallbackSrc : resolvedUrl;

  if (isLoading) {
    return (
      <div className={`bg-background animate-pulse ${className || ''}`} style={style} />
    );
  }

  if (!displayUrl) {
    return (
      <div className={`bg-background flex items-center justify-center text-text-secondary ${className || ''}`} style={style}>
        <Image className="w-8 h-8 opacity-50" />
      </div>
    );
  }

  return (
    <img
      src={displayUrl}
      alt={alt}
      className={className}
      style={style}
      onError={() => setImgError(true)}
      {...props}
    />
  );
}

/**
 * Video component that handles storage URLs
 * Automatically resolves opfs:// and idb:// URLs to blob URLs
 */
export function StorageVideo({
  src,
  fallbackSrc,
  className,
  style,
  ...props
}: StorageVideoProps) {
  const { resolvedUrl, isLoading, error } = useResolvedUrl(src);
  const [videoError, setVideoError] = useState(false);

  // Reset video error when src changes
  useEffect(() => {
    setVideoError(false);
  }, [src]);

  // Determine what to display
  const displayUrl = videoError || error ? fallbackSrc : resolvedUrl;

  if (isLoading) {
    return (
      <div className={`bg-background animate-pulse ${className || ''}`} style={style} />
    );
  }

  if (!displayUrl) {
    return (
      <div className={`bg-background flex items-center justify-center text-text-secondary ${className || ''}`} style={style}>
        <Video className="w-8 h-8 opacity-50" />
      </div>
    );
  }

  return (
    <video
      src={displayUrl}
      className={className}
      style={style}
      onError={() => setVideoError(true)}
      {...props}
    />
  );
}

export default StorageImage;
