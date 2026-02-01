/**
 * Export Dialog Component
 * Dialog for exporting assets in various formats
 */

import { useState, useCallback } from 'react';
import type { Asset } from '../../../core/types/asset';
import {
  exportAssets,
  downloadBlob,
  type AssetExportOptions,
  type ExportProgress,
} from '../../../core/services/exportService';

interface ExportDialogProps {
  assets: Asset[];
  onClose: () => void;
}

export function ExportDialog({ assets, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<'json' | 'csv' | 'zip'>('zip');
  const [includeFiles, setIncludeFiles] = useState(true);
  const [includeThumbnails, setIncludeThumbnails] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      const options: AssetExportOptions = {
        assets,
        format,
        includeFiles: format === 'zip' ? includeFiles : false,
        includeThumbnails: format === 'zip' ? includeThumbnails : false,
        includeMetadata,
      };

      const blob = await exportAssets(options, setProgress);

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const ext = format === 'zip' ? 'zip' : format === 'json' ? 'json' : 'csv';
      const filename = `assets-export-${timestamp}.${ext}`;

      downloadBlob(blob, filename);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  }, [assets, format, includeFiles, includeThumbnails, includeMetadata, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Export Assets</h2>
          <p className="text-sm text-text-secondary mt-1">
            {assets.length} asset{assets.length !== 1 ? 's' : ''} selected
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Export Format
            </label>
            <div className="flex gap-2">
              {(['zip', 'json', 'csv'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`
                    flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${format === f
                      ? 'bg-primary text-white'
                      : 'bg-background text-text-secondary hover:text-text-primary'
                    }
                  `}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ZIP options */}
          {format === 'zip' && (
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={includeFiles}
                  onChange={(e) => setIncludeFiles(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-text-primary">Include original files</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={includeThumbnails}
                  onChange={(e) => setIncludeThumbnails(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-text-primary">Include thumbnails</span>
              </label>
            </div>
          )}

          {/* Metadata option */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-primary">Include metadata</span>
          </label>

          {/* Progress */}
          {isExporting && progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-text-secondary">
                <span>{progress.message}</span>
                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || assets.length === 0}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;
