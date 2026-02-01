/**
 * Export Service
 * Handles exporting assets, shot lists, and storyboards
 */

import type { UUID } from '../types/common';
import type { Asset, AssetCollection } from '../types/asset';
import type { Shot, ShotList, StoryboardExportOptions } from '../types/shotList';
import { getStorage, isStorageInitialized, parseStorageUrl, isStorageUrl } from '../storage';

// ============================================================================
// Types
// ============================================================================

export interface AssetExportOptions {
  assets: Asset[];
  format: 'zip' | 'json' | 'csv';
  includeFiles: boolean;
  includeThumbnails: boolean;
  includeMetadata: boolean;
}

export interface ShotListExportOptions {
  shotList: ShotList;
  shots: Shot[];
  format: 'json' | 'csv' | 'pdf';
  includePrompts: boolean;
  includeTechnicalSpecs: boolean;
}

export interface ExportProgress {
  current: number;
  total: number;
  phase: 'preparing' | 'processing' | 'packaging' | 'complete';
  message: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

// ============================================================================
// Asset Export
// ============================================================================

/**
 * Export assets to a downloadable format
 */
export async function exportAssets(
  options: AssetExportOptions,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const { assets, format, includeFiles, includeThumbnails, includeMetadata } = options;

  onProgress?.({
    current: 0,
    total: assets.length,
    phase: 'preparing',
    message: 'Preparing export...',
  });

  switch (format) {
    case 'json':
      return exportAssetsAsJson(assets, includeMetadata);

    case 'csv':
      return exportAssetsAsCsv(assets);

    case 'zip':
      return exportAssetsAsZip(assets, includeFiles, includeThumbnails, onProgress);

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Export assets metadata as JSON
 */
function exportAssetsAsJson(assets: Asset[], includeMetadata: boolean): Blob {
  const data = assets.map((asset) => {
    const base = {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      type: asset.type,
      format: asset.format,
      tags: asset.tags,
      isFavorite: asset.isFavorite,
      createdAt: new Date(asset.createdAt).toISOString(),
      updatedAt: new Date(asset.updatedAt).toISOString(),
    };

    if (includeMetadata) {
      return {
        ...base,
        metadata: asset.metadata,
        generationRecordId: asset.generationRecordId,
        projectId: asset.projectId,
      };
    }

    return base;
  });

  return new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
}

/**
 * Export assets metadata as CSV
 */
function exportAssetsAsCsv(assets: Asset[]): Blob {
  const headers = [
    'ID',
    'Name',
    'Description',
    'Type',
    'Format',
    'Tags',
    'Favorite',
    'File Size',
    'Width',
    'Height',
    'Duration',
    'Created',
    'Updated',
  ];

  const rows = assets.map((asset) => [
    asset.id,
    escapeCsv(asset.name),
    escapeCsv(asset.description || ''),
    asset.type,
    asset.format,
    escapeCsv(asset.tags.join(', ')),
    asset.isFavorite ? 'Yes' : 'No',
    asset.metadata.fileSize,
    asset.metadata.width || '',
    asset.metadata.height || '',
    asset.metadata.duration || '',
    new Date(asset.createdAt).toISOString(),
    new Date(asset.updatedAt).toISOString(),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return new Blob([csv], { type: 'text/csv' });
}

/**
 * Export assets with files as ZIP
 */
async function exportAssetsAsZip(
  assets: Asset[],
  includeFiles: boolean,
  includeThumbnails: boolean,
  onProgress?: ProgressCallback
): Promise<Blob> {
  // Dynamically import JSZip
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  // Add metadata JSON
  const metadataJson = JSON.stringify(
    assets.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      type: a.type,
      format: a.format,
      tags: a.tags,
      metadata: a.metadata,
      createdAt: a.createdAt,
    })),
    null,
    2
  );
  zip.file('metadata.json', metadataJson);

  // Add files if requested
  if (includeFiles || includeThumbnails) {
    const assetsFolder = zip.folder('assets');
    const thumbsFolder = includeThumbnails ? zip.folder('thumbnails') : null;

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];

      onProgress?.({
        current: i + 1,
        total: assets.length,
        phase: 'processing',
        message: `Processing ${asset.name}...`,
      });

      // Add main file
      if (includeFiles && asset.url) {
        try {
          const fileData = await fetchAssetData(asset.url);
          if (fileData) {
            const ext = getExtensionFromFormat(asset.format);
            assetsFolder?.file(`${asset.id}.${ext}`, fileData);
          }
        } catch (err) {
          console.warn(`Failed to export asset ${asset.id}:`, err);
        }
      }

      // Add thumbnail
      if (includeThumbnails && thumbsFolder && asset.thumbnailUrl) {
        try {
          const thumbData = await fetchAssetData(asset.thumbnailUrl);
          if (thumbData) {
            thumbsFolder.file(`${asset.id}_thumb.jpg`, thumbData);
          }
        } catch (err) {
          console.warn(`Failed to export thumbnail for ${asset.id}:`, err);
        }
      }
    }
  }

  onProgress?.({
    current: assets.length,
    total: assets.length,
    phase: 'packaging',
    message: 'Creating ZIP file...',
  });

  return zip.generateAsync({ type: 'blob' });
}

// ============================================================================
// Shot List Export
// ============================================================================

/**
 * Export shot list to a downloadable format
 */
export async function exportShotList(
  options: ShotListExportOptions,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const { format } = options;

  onProgress?.({
    current: 0,
    total: 1,
    phase: 'preparing',
    message: 'Preparing export...',
  });

  switch (format) {
    case 'json':
      return exportShotListAsJson(options);

    case 'csv':
      return exportShotListAsCsv(options);

    case 'pdf':
      return exportShotListAsPdf(options, onProgress);

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Export shot list as JSON
 */
function exportShotListAsJson(options: ShotListExportOptions): Blob {
  const { shotList, shots, includePrompts, includeTechnicalSpecs } = options;

  const data = {
    shotList: {
      id: shotList.id,
      name: shotList.name,
      description: shotList.description,
      createdAt: new Date(shotList.createdAt).toISOString(),
      updatedAt: new Date(shotList.updatedAt).toISOString(),
    },
    shots: shots.map((shot) => {
      const base: Record<string, unknown> = {
        id: shot.id,
        shotNumber: shot.shotNumber,
        name: shot.name,
        description: shot.description,
        shotType: shot.shotType,
        subjects: shot.subjects,
        notes: shot.notes,
        status: shot.status,
        duration: shot.duration,
      };

      if (includePrompts && shot.generatedPrompt) {
        base.generatedPrompt = shot.generatedPrompt;
      }

      if (includeTechnicalSpecs) {
        base.technical = {
          cameraMovement: shot.cameraMovement,
          lighting: shot.lighting,
          aspectRatio: shot.aspectRatio,
          location: shot.location,
          fps: shot.fps,
        };
      }

      return base;
    }),
  };

  return new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
}

/**
 * Export shot list as CSV
 */
function exportShotListAsCsv(options: ShotListExportOptions): Blob {
  const { shots, includePrompts, includeTechnicalSpecs } = options;

  const headers = [
    'Shot #',
    'Name',
    'Description',
    'Type',
    'Subjects',
    'Notes',
    'Status',
    'Duration',
  ];

  if (includeTechnicalSpecs) {
    headers.push('Camera Movement', 'Lighting', 'Aspect Ratio', 'Location', 'FPS');
  }

  if (includePrompts) {
    headers.push('Generated Prompt');
  }

  const rows = shots.map((shot) => {
    const row = [
      shot.shotNumber,
      escapeCsv(shot.name || ''),
      escapeCsv(shot.description || ''),
      shot.shotType,
      escapeCsv((shot.subjects || []).join(', ')),
      escapeCsv(shot.notes || ''),
      shot.status,
      shot.duration || '',
    ];

    if (includeTechnicalSpecs) {
      row.push(
        shot.cameraMovement || '',
        shot.lighting || '',
        shot.aspectRatio || '',
        shot.location || '',
        shot.fps || ''
      );
    }

    if (includePrompts) {
      row.push(escapeCsv(shot.generatedPrompt || ''));
    }

    return row;
  });

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  return new Blob([csv], { type: 'text/csv' });
}

/**
 * Export shot list as PDF (simple HTML-based)
 */
async function exportShotListAsPdf(
  options: ShotListExportOptions,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const { shotList, shots, includePrompts, includeTechnicalSpecs } = options;

  onProgress?.({
    current: 0,
    total: 1,
    phase: 'processing',
    message: 'Generating PDF...',
  });

  // Generate HTML content for the PDF
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(shotList.name)} - Shot List</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          color: #333;
        }
        h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        .shot {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          page-break-inside: avoid;
        }
        .shot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .shot-number {
          background: #333;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: bold;
        }
        .shot-type {
          background: #e0e0e0;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .shot-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .status-planned { background: #e3f2fd; color: #1976d2; }
        .status-scripted { background: #fff3e0; color: #f57c00; }
        .status-approved { background: #e8f5e9; color: #388e3c; }
        .status-completed { background: #f3e5f5; color: #7b1fa2; }
        .shot-content { margin-top: 12px; }
        .shot-content p { margin: 4px 0; }
        .label { color: #666; font-size: 12px; }
        .technical {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 4px;
          margin-top: 12px;
          font-size: 13px;
        }
        .technical-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .prompt {
          background: #fffde7;
          padding: 12px;
          border-radius: 4px;
          margin-top: 12px;
          font-family: monospace;
          font-size: 12px;
          white-space: pre-wrap;
        }
        @media print {
          body { padding: 20px; }
          .shot { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(shotList.name)}</h1>
      ${shotList.description ? `<p>${escapeHtml(shotList.description)}</p>` : ''}
      <p><strong>${shots.length} shots</strong> • Created ${new Date(shotList.createdAt).toLocaleDateString()}</p>
      
      <h2>Shots</h2>
      ${shots
        .map(
          (shot) => `
        <div class="shot">
          <div class="shot-header">
            <span class="shot-number">Shot ${shot.shotNumber}</span>
            <span class="shot-type">${shot.shotType}</span>
            <span class="shot-status status-${shot.status}">${shot.status}</span>
          </div>
          ${shot.name ? `<h3 style="margin: 0">${escapeHtml(shot.name)}</h3>` : ''}
          <div class="shot-content">
            ${shot.description ? `<p>${escapeHtml(shot.description)}</p>` : ''}
            ${shot.subjects?.length ? `<p><span class="label">Subjects:</span> ${escapeHtml(shot.subjects.join(', '))}</p>` : ''}
            ${shot.notes ? `<p><span class="label">Notes:</span> ${escapeHtml(shot.notes)}</p>` : ''}
            ${shot.duration ? `<p><span class="label">Duration:</span> ${shot.duration}s</p>` : ''}
          </div>
          ${
            includeTechnicalSpecs
              ? `
            <div class="technical">
              <div class="technical-grid">
                ${shot.cameraMovement ? `<div><span class="label">Camera:</span> ${shot.cameraMovement}</div>` : ''}
                ${shot.lighting ? `<div><span class="label">Lighting:</span> ${shot.lighting}</div>` : ''}
                ${shot.aspectRatio ? `<div><span class="label">Aspect:</span> ${shot.aspectRatio}</div>` : ''}
                ${shot.location ? `<div><span class="label">Location:</span> ${escapeHtml(shot.location)}</div>` : ''}
                ${shot.fps ? `<div><span class="label">FPS:</span> ${shot.fps}</div>` : ''}
              </div>
            </div>
          `
              : ''
          }
          ${
            includePrompts && shot.generatedPrompt
              ? `<div class="prompt">${escapeHtml(shot.generatedPrompt)}</div>`
              : ''
          }
        </div>
      `
        )
        .join('')}
    </body>
    </html>
  `;

  onProgress?.({
    current: 1,
    total: 1,
    phase: 'complete',
    message: 'PDF ready',
  });

  // Return as HTML blob (can be printed to PDF by the browser)
  return new Blob([html], { type: 'text/html' });
}

// ============================================================================
// Collection Export
// ============================================================================

/**
 * Export a collection with all its assets
 */
export async function exportCollection(
  collection: AssetCollection,
  assets: Asset[],
  options: { includeFiles: boolean; includeThumbnails: boolean },
  onProgress?: ProgressCallback
): Promise<Blob> {
  return exportAssets(
    {
      assets,
      format: 'zip',
      includeFiles: options.includeFiles,
      includeThumbnails: options.includeThumbnails,
      includeMetadata: true,
    },
    onProgress
  );
}

// ============================================================================
// Download Helpers
// ============================================================================

/**
 * Trigger a download of a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Fetch asset data from URL (handles storage URLs)
 */
async function fetchAssetData(url: string): Promise<Blob | null> {
  if (isStorageUrl(url)) {
    const parsed = parseStorageUrl(url);
    if (!parsed || !isStorageInitialized()) return null;

    const storage = getStorage();
    return storage.getFile(parsed.id);
  }

  // Regular URL or data URL
  if (url.startsWith('data:')) {
    return dataUrlToBlob(url);
  }

  const response = await fetch(url);
  return response.blob();
}

/**
 * Convert data URL to blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const data = atob(parts[1]);
  const array = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    array[i] = data.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

// ============================================================================
// Utilities
// ============================================================================

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getExtensionFromFormat(format: string): string {
  const extensions: Record<string, string> = {
    png: 'png',
    jpeg: 'jpg',
    jpg: 'jpg',
    webp: 'webp',
    gif: 'gif',
    svg: 'svg',
    mp4: 'mp4',
    webm: 'webm',
    mov: 'mov',
  };
  return extensions[format] || format;
}
