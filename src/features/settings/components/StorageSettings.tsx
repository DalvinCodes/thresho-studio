/**
 * Storage Settings Component
 * Displays storage information and provides management actions
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getStorage,
  isStorageInitialized,
  type StorageUsage,
  type FileInfo,
} from '../../../core/storage';

interface StorageStats {
  type: string;
  usage: StorageUsage;
  fileCount: number;
  files: FileInfo[];
}

/**
 * StorageSettings - Settings panel for file storage management
 */
export function StorageSettings() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load storage statistics
  const loadStats = useCallback(async () => {
    if (!isStorageInitialized()) {
      setError('Storage not initialized');
      setLoading(false);
      return;
    }

    try {
      const storage = getStorage();
      const [usage, files] = await Promise.all([
        storage.getStorageUsage(),
        storage.listFiles(),
      ]);

      setStats({
        type: storage.getStorageType(),
        usage,
        fileCount: files.length,
        files,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Clear all files
  const handleClearAll = async () => {
    if (!isStorageInitialized()) return;

    setClearing(true);
    try {
      const storage = getStorage();
      await storage.clearAll();
      await loadStats();
      setShowConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear storage');
    } finally {
      setClearing(false);
    }
  };

  // Export all assets
  const handleExportAll = async () => {
    if (!stats || stats.fileCount === 0) return;

    const storage = getStorage();

    for (const file of stats.files) {
      try {
        const blob = await storage.getFile(file.id);
        if (blob) {
          // Create download link
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.metadata.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Small delay between downloads
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (err) {
        console.error(`Failed to export ${file.id}:`, err);
      }
    }
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    if (!isFinite(bytes)) return 'Unlimited';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get storage type label
  const getStorageTypeLabel = (type: string): string => {
    switch (type) {
      case 'opfs':
        return 'Origin Private File System (OPFS)';
      case 'indexeddb':
        return 'IndexedDB';
      case 'memory':
        return 'In-Memory (temporary)';
      default:
        return type;
    }
  };

  // Calculate usage percentage
  const getUsagePercent = (usage: StorageUsage): number => {
    if (!isFinite(usage.available) || usage.available === 0) return 0;
    const total = usage.used + usage.available;
    return Math.round((usage.used / total) * 100);
  };

  if (loading) {
    return (
      <div className="text-text-secondary text-center py-4">
        Loading storage information...
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="space-y-3">
        <p className="text-red-400">Error: {error}</p>
        <button 
          onClick={loadStats}
          className="px-4 py-2 bg-background border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h4 className="font-medium text-text-primary">File Storage</h4>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Storage Type */}
          <div className="space-y-1">
            <p className="text-sm text-text-secondary">Storage Type</p>
            <p className="font-medium text-text-primary">
              {getStorageTypeLabel(stats.type)}
            </p>
            {stats.type === 'memory' && (
              <p className="text-sm text-yellow-400">
                Warning: Data will be lost when you close the browser
              </p>
            )}
          </div>

          {/* Usage Statistics */}
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">Storage Usage</p>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all" 
                style={{ width: `${getUsagePercent(stats.usage)}%` }}
              />
            </div>
            <p className="text-sm text-text-primary font-mono">
              {formatBytes(stats.usage.used)} used
              {isFinite(stats.usage.available) && (
                <span className="text-text-secondary">
                  {' '}of {formatBytes(stats.usage.used + stats.usage.available)}
                </span>
              )}
            </p>
          </div>

          {/* File Count */}
          <div className="space-y-1">
            <p className="text-sm text-text-secondary">Stored Files</p>
            <p className="font-medium text-text-primary">
              {stats.fileCount} file{stats.fileCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {stats.fileCount > 0 && (
              <button
                className="w-full py-2 bg-background border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors"
                onClick={handleExportAll}
              >
                Export All Files
              </button>
            )}

            {!showConfirm ? (
              <button
                className="w-full py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowConfirm(true)}
                disabled={stats.fileCount === 0}
              >
                Clear All Files
              </button>
            ) : (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-3">
                <p className="text-red-400 text-sm">
                  Delete all {stats.fileCount} files? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                    onClick={handleClearAll}
                    disabled={clearing}
                  >
                    {clearing ? 'Clearing...' : 'Yes, Delete All'}
                  </button>
                  <button
                    className="flex-1 py-2 bg-background border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors"
                    onClick={() => setShowConfirm(false)}
                    disabled={clearing}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button
              className="w-full py-2 bg-background border border-border rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              onClick={loadStats}
            >
              Refresh Stats
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default StorageSettings;
