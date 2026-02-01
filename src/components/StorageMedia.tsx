/**
 * StorageMedia Component
 * Renders images and videos from storage URLs (opfs://, idb://)
 * Handles URL resolution from storage to displayable blob URLs
 */

import { useState, useEffect, useRef } from 'react';
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
 * Handles memory management for blob URLs
 */
function useResolvedUrl(url: string | undefined | null): {
  resolvedUrl: string | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Cleanup function to revoke blob URLs
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

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
        const newBlobUrl = await storage.getFileUrl(parsed.id);

        if (cancelled) {
          // Clean up if component unmounted during fetch
          if (newBlobUrl) {
            URL.revokeObjectURL(newBlobUrl);
          }
          return;
        }

        // Revoke old blob URL if any
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }

        blobUrlRef.current = newBlobUrl;
        setResolvedUrl(newBlobUrl);
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
        <span className="text-2xl opacity-50">🖼️</span>
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
        <span className="text-2xl opacity-50">🎬</span>
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
