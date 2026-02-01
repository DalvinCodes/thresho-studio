/**
 * useStorageUrl Hook
 * Resolves storage URLs (opfs://, idb://) to displayable blob URLs
 */

import { useState, useEffect, useRef } from 'react';
import {
  getStorage,
  isStorageInitialized,
  isStorageUrl,
  parseStorageUrl,
} from '../core/storage';

/**
 * Hook to resolve a storage URL to a displayable URL
 * Handles blob URL lifecycle (creation and revocation)
 *
 * @param url URL to resolve (can be regular URL or storage URL)
 * @returns Resolved URL that can be used in src attributes, or null if loading
 */
export function useStorageUrl(url: string | undefined | null): string | null {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    if (!url) {
      setResolvedUrl(null);
      return;
    }

    // Not a storage URL, use as-is
    if (!isStorageUrl(url)) {
      setResolvedUrl(url);
      return;
    }

    // Storage URL - need to resolve
    if (!isStorageInitialized()) {
      console.warn('[useStorageUrl] Storage not initialized');
      setResolvedUrl(null);
      return;
    }

    const parsed = parseStorageUrl(url);
    if (!parsed) {
      console.warn('[useStorageUrl] Invalid storage URL:', url);
      setResolvedUrl(null);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      setLoading(true);

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
      } catch (error) {
        console.error('[useStorageUrl] Failed to resolve URL:', error);
        if (!cancelled) {
          setResolvedUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return resolvedUrl;
}

/**
 * Hook to resolve a thumbnail URL
 * Similar to useStorageUrl but specifically for thumbnails
 */
export function useThumbnailUrl(assetId: string | undefined | null): string | null {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!assetId || !isStorageInitialized()) {
      setThumbnailUrl(null);
      return;
    }

    let cancelled = false;

    const loadThumbnail = async () => {
      try {
        const storage = getStorage();
        const thumbnailBlob = await storage.getThumbnail(assetId);

        if (cancelled || !thumbnailBlob) {
          return;
        }

        // Revoke old URL
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }

        const newUrl = URL.createObjectURL(thumbnailBlob);
        blobUrlRef.current = newUrl;
        setThumbnailUrl(newUrl);
      } catch (error) {
        console.error('[useThumbnailUrl] Failed to load thumbnail:', error);
        if (!cancelled) {
          setThumbnailUrl(null);
        }
      }
    };

    loadThumbnail();

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return thumbnailUrl;
}

export default useStorageUrl;
