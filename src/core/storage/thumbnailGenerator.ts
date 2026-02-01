/**
 * Thumbnail Generator
 * Creates thumbnails from images and video files
 */

// Default thumbnail settings
const DEFAULT_THUMBNAIL_SIZE = 256;
const THUMBNAIL_QUALITY = 0.8;
const VIDEO_THUMBNAIL_TIME = 1; // seconds into the video

/**
 * Generate a thumbnail from an image file
 * @param file Image file as Blob
 * @param maxSize Maximum dimension for the thumbnail
 * @returns Thumbnail as Blob (JPEG format)
 */
export async function generateImageThumbnail(
  file: Blob,
  maxSize: number = DEFAULT_THUMBNAIL_SIZE
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        URL.revokeObjectURL(url);

        // Calculate dimensions maintaining aspect ratio
        const { width, height } = calculateThumbnailDimensions(
          img.width,
          img.height,
          maxSize
        );

        // Create canvas and draw scaled image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Use better quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          THUMBNAIL_QUALITY
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for thumbnail'));
    };

    img.src = url;
  });
}

/**
 * Generate a thumbnail from a video file
 * @param file Video file as Blob
 * @param timeSeconds Time in seconds to capture the frame (default: 1s)
 * @param maxSize Maximum dimension for the thumbnail
 * @returns Thumbnail as Blob (JPEG format)
 */
export async function generateVideoThumbnail(
  file: Blob,
  timeSeconds: number = VIDEO_THUMBNAIL_TIME,
  maxSize: number = DEFAULT_THUMBNAIL_SIZE
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    // Cleanup function
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.src = '';
      video.load();
    };

    video.onloadedmetadata = () => {
      // Ensure we don't seek past the video duration
      const seekTime = Math.min(timeSeconds, video.duration * 0.1, video.duration - 0.1);
      video.currentTime = Math.max(0, seekTime);
    };

    video.onseeked = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        const { width, height } = calculateThumbnailDimensions(
          video.videoWidth,
          video.videoHeight,
          maxSize
        );

        // Create canvas and draw frame
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw video frame
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          THUMBNAIL_QUALITY
        );
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video for thumbnail'));
    };

    video.src = url;
  });
}

/**
 * Generate thumbnail from any supported file type
 * @param file File as Blob
 * @param mimeType MIME type of the file
 * @param maxSize Maximum dimension for the thumbnail
 * @returns Thumbnail as Blob or null if not supported
 */
export async function generateThumbnail(
  file: Blob,
  mimeType: string,
  maxSize: number = DEFAULT_THUMBNAIL_SIZE
): Promise<Blob | null> {
  try {
    if (mimeType.startsWith('image/')) {
      // Skip SVG (no rasterization needed for display)
      if (mimeType === 'image/svg+xml') {
        return null;
      }
      return await generateImageThumbnail(file, maxSize);
    }

    if (mimeType.startsWith('video/')) {
      return await generateVideoThumbnail(file, VIDEO_THUMBNAIL_TIME, maxSize);
    }

    // Unsupported type
    return null;
  } catch (error) {
    console.warn('[ThumbnailGenerator] Failed to generate thumbnail:', error);
    return null;
  }
}

/**
 * Calculate thumbnail dimensions maintaining aspect ratio
 */
function calculateThumbnailDimensions(
  originalWidth: number,
  originalHeight: number,
  maxSize: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  if (width > height) {
    if (width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  // Ensure minimum dimensions
  width = Math.max(1, width);
  height = Math.max(1, height);

  return { width, height };
}

/**
 * Get video metadata (duration, dimensions)
 */
export async function getVideoMetadata(file: Blob): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;

    video.onloadedmetadata = () => {
      const result = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      URL.revokeObjectURL(url);
      resolve(result);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = url;
  });
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(file: Blob): Promise<{
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image dimensions'));
    };

    img.src = url;
  });
}
