/**
 * Generation Queue Component
 * Displays and manages the batch generation queue
 */

import { useState, useCallback, useMemo } from 'react';
import { FileText, Image, Video } from 'lucide-react';
import type { UUID, ContentType } from '../../../core/types/common';
import type { QueuedGeneration, QueueConfig } from '../types/queue';
import {
  useGenerationStore,
  useBatchQueue,
  useBatchQueueStats,
  useQueuePaused,
  useQueueConfig,
} from '../store';

interface GenerationQueueProps {
  onViewResult?: (id: UUID) => void;
}

export function GenerationQueue({ onViewResult }: GenerationQueueProps) {
  const queueItems = useBatchQueue();
  const stats = useBatchQueueStats();
  const isPaused = useQueuePaused();
  const config = useQueueConfig();
  
  const {
    cancelQueuedGeneration,
    cancelAllQueuedGenerations,
    pauseQueue,
    resumeQueue,
    updateQueuePriority,
    clearFinishedQueueItems,
    setQueueConfig,
  } = useGenerationStore();

  const [showSettings, setShowSettings] = useState(false);
  const [draggedId, setDraggedId] = useState<UUID | null>(null);

  // Separate items by status
  const { queuedItems, processingItems, completedItems, failedItems } = useMemo(() => {
    const queued: QueuedGeneration[] = [];
    const processing: QueuedGeneration[] = [];
    const completed: QueuedGeneration[] = [];
    const failed: QueuedGeneration[] = [];

    for (const item of queueItems) {
      switch (item.status) {
        case 'queued':
          queued.push(item);
          break;
        case 'processing':
          processing.push(item);
          break;
        case 'completed':
          completed.push(item);
          break;
        case 'failed':
        case 'cancelled':
          failed.push(item);
          break;
      }
    }

    // Sort queued items by priority (descending)
    queued.sort((a, b) => b.priority - a.priority);

    return {
      queuedItems: queued,
      processingItems: processing,
      completedItems: completed,
      failedItems: failed,
    };
  }, [queueItems]);

  const handleCancel = useCallback((id: UUID) => {
    cancelQueuedGeneration(id);
  }, [cancelQueuedGeneration]);

  const handlePriorityChange = useCallback((id: UUID, delta: number) => {
    const item = queueItems.find(q => q.id === id);
    if (item) {
      const newPriority = Math.max(1, Math.min(5, item.priority + delta));
      updateQueuePriority(id, newPriority);
    }
  }, [queueItems, updateQueuePriority]);

  const handleDragStart = useCallback((id: UUID) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: UUID) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedItem = queueItems.find(q => q.id === draggedId);
    const targetItem = queueItems.find(q => q.id === targetId);

    if (draggedItem && targetItem && draggedItem.status === 'queued' && targetItem.status === 'queued') {
      // Swap priorities
      updateQueuePriority(draggedId, targetItem.priority);
      updateQueuePriority(targetId, draggedItem.priority);
    }
  }, [draggedId, queueItems, updateQueuePriority]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-text-primary">Generation Queue</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-background rounded transition-colors"
              title="Queue Settings"
            >
              <SettingsIcon />
            </button>
            {queuedItems.length > 0 && (
              <button
                onClick={cancelAllQueuedGenerations}
                className="px-3 py-1 text-sm text-red-500 hover:bg-red-500/10 rounded transition-colors"
              >
                Cancel All
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {stats.queued} queued
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            {stats.processing} processing
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {stats.completed} done
          </span>
          {stats.failed > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {stats.failed} failed
            </span>
          )}
        </div>

        {/* Pause/Resume Controls */}
        <div className="mt-3 flex items-center gap-3">
          {isPaused ? (
            <button
              onClick={resumeQueue}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors"
            >
              <PlayIcon />
              Resume Queue
            </button>
          ) : (
            <button
              onClick={pauseQueue}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-primary rounded-3xl hover:bg-background transition-colors"
            >
              <PauseIcon />
              Pause Queue
            </button>
          )}
          
          {(completedItems.length > 0 || failedItems.length > 0) && (
            <button
              onClick={clearFinishedQueueItems}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Clear Finished
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <QueueSettings
          config={config}
          onConfigChange={setQueueConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Queue Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Processing Section */}
        {processingItems.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Processing ({processingItems.length}/{config.maxConcurrent})
            </h3>
            <div className="space-y-2">
              {processingItems.map((item) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  onCancel={() => handleCancel(item.id)}
                  onViewResult={onViewResult}
                />
              ))}
            </div>
          </section>
        )}

        {/* Queued Section */}
        {queuedItems.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Waiting ({queuedItems.length})
            </h3>
            <div className="space-y-2">
              {queuedItems.map((item, index) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  position={index + 1}
                  onCancel={() => handleCancel(item.id)}
                  onPriorityUp={() => handlePriorityChange(item.id, 1)}
                  onPriorityDown={() => handlePriorityChange(item.id, -1)}
                  draggable
                  onDragStart={() => handleDragStart(item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedId === item.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed Section */}
        {completedItems.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Completed ({completedItems.length})
            </h3>
            <div className="space-y-2">
              {completedItems.slice(0, 5).map((item) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  onViewResult={onViewResult}
                  compact
                />
              ))}
              {completedItems.length > 5 && (
                <p className="text-sm text-text-secondary text-center py-2">
                  +{completedItems.length - 5} more completed
                </p>
              )}
            </div>
          </section>
        )}

        {/* Failed Section */}
        {failedItems.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Failed ({failedItems.length})
            </h3>
            <div className="space-y-2">
              {failedItems.map((item) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {queueItems.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary">
            <QueueIcon className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Queue is empty</p>
            <p className="text-sm mt-1">Add generations to process them in batch</p>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {stats.totalProcessed > 0 && (
        <div className="p-4 border-t border-border bg-surface">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="font-semibold text-text-primary">{stats.totalProcessed}</p>
              <p className="text-xs text-text-secondary">Total Processed</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary">
                {stats.averageWaitTimeMs > 0 ? `${(stats.averageWaitTimeMs / 1000).toFixed(1)}s` : '-'}
              </p>
              <p className="text-xs text-text-secondary">Avg Wait</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary">
                {stats.averageProcessingTimeMs > 0 ? `${(stats.averageProcessingTimeMs / 1000).toFixed(1)}s` : '-'}
              </p>
              <p className="text-xs text-text-secondary">Avg Processing</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Queue Item Card Component
interface QueueItemCardProps {
  item: QueuedGeneration;
  position?: number;
  onCancel?: () => void;
  onViewResult?: (id: UUID) => void;
  onPriorityUp?: () => void;
  onPriorityDown?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  compact?: boolean;
}

function TypeIcon({ type }: { type: ContentType }) {
  const iconClass = "w-5 h-5 text-text-primary";
  switch (type) {
    case 'text': return <FileText className={iconClass} />;
    case 'image': return <Image className={iconClass} />;
    case 'video': return <Video className={iconClass} />;
  }
}

function QueueItemCard({
  item,
  position,
  onCancel,
  onViewResult,
  onPriorityUp,
  onPriorityDown,
  draggable,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  compact,
}: QueueItemCardProps) {

  const statusColors: Record<string, string> = {
    queued: 'bg-blue-500',
    processing: 'bg-yellow-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    cancelled: 'bg-gray-500',
  };

  const priorityLabels: Record<number, string> = {
    1: 'Low',
    2: 'Low-Med',
    3: 'Normal',
    4: 'High',
    5: 'Urgent',
  };

  const waitTimeMs = item.startedAt
    ? item.startedAt - item.addedAt
    : item.completedAt
      ? item.completedAt - item.addedAt
      : 0; // Don't compute dynamically in render

  const formatTime = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 bg-surface rounded border border-border">
        <div className="flex items-center gap-2">
            <TypeIcon type={item.request.type} />
          <span className={`w-2 h-2 rounded-full ${statusColors[item.status]}`} />
          <span className="text-sm text-text-primary capitalize">
            {item.request.type}
          </span>
          {item.error && (
            <span className="text-xs text-red-500 truncate max-w-[200px]" title={item.error}>
              {item.error}
            </span>
          )}
        </div>
        {item.status === 'completed' && onViewResult && (
          <button
            onClick={() => onViewResult(item.id)}
            className="text-xs text-primary hover:underline"
          >
            View
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-3 bg-surface rounded-3xl border transition-all ${
        isDragging ? 'border-primary opacity-50' : 'border-border'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {position !== undefined && (
            <span className="w-6 h-6 flex items-center justify-center bg-primary/20 text-primary text-xs rounded-full font-medium">
              {position}
            </span>
          )}
          <TypeIcon type={item.request.type} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary capitalize">
                {item.request.type} Generation
              </span>
              <span className={`px-1.5 py-0.5 text-xs text-white rounded ${statusColors[item.status]}`}>
                {item.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
              <span>Priority: {priorityLabels[item.priority] || item.priority}</span>
              <span>Wait: {formatTime(waitTimeMs)}</span>
              {item.retryCount > 0 && (
                <span className="text-yellow-500">
                  Retry {item.retryCount}/{item.maxRetries}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Priority controls for queued items */}
          {item.status === 'queued' && onPriorityUp && onPriorityDown && (
            <div className="flex flex-col mr-2">
              <button
                onClick={onPriorityUp}
                disabled={item.priority >= 5}
                className="p-0.5 text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                title="Increase priority"
              >
                <ChevronUpIcon />
              </button>
              <button
                onClick={onPriorityDown}
                disabled={item.priority <= 1}
                className="p-0.5 text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                title="Decrease priority"
              >
                <ChevronDownIcon />
              </button>
            </div>
          )}

          {/* View result for completed */}
          {item.status === 'completed' && onViewResult && (
            <button
              onClick={() => onViewResult(item.id)}
              className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
            >
              View
            </button>
          )}

          {/* Cancel for queued/processing */}
          {(item.status === 'queued' || item.status === 'processing') && onCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-text-secondary hover:text-red-500 transition-colors"
              title="Cancel"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {item.error && (
        <div className="mt-2 p-2 bg-red-500/10 rounded text-sm text-red-500">
          {item.error}
        </div>
      )}
    </div>
  );
}

// Queue Settings Component
interface QueueSettingsProps {
  config: QueueConfig;
  onConfigChange: (config: Partial<QueueConfig>) => void;
  onClose: () => void;
}

function QueueSettings({ config, onConfigChange, onClose }: QueueSettingsProps) {
  return (
    <div className="p-4 border-b border-border bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-text-primary">Queue Settings</h3>
        <button
          onClick={onClose}
          className="p-1 text-text-secondary hover:text-text-primary"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Max Concurrent
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={config.maxConcurrent}
            onChange={(e) => onConfigChange({ maxConcurrent: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary"
          />
          <p className="text-xs text-text-secondary mt-1">
            Simultaneous generations
          </p>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Max Retries
          </label>
          <input
            type="number"
            min={0}
            max={10}
            value={config.maxRetries}
            onChange={(e) => onConfigChange({ maxRetries: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary"
          />
          <p className="text-xs text-text-secondary mt-1">
            Retry attempts on failure
          </p>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Retry Delay (ms)
          </label>
          <input
            type="number"
            min={1000}
            max={60000}
            step={1000}
            value={config.retryDelayMs}
            onChange={(e) => onConfigChange({ retryDelayMs: parseInt(e.target.value) || 5000 })}
            className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary"
          />
          <p className="text-xs text-text-secondary mt-1">
            Wait before retry
          </p>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Priority Boost/Min
          </label>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={config.priorityBoostPerMinute}
            onChange={(e) => onConfigChange({ priorityBoostPerMinute: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary"
          />
          <p className="text-xs text-text-secondary mt-1">
            Priority increase for waiting items
          </p>
        </div>
      </div>
    </div>
  );
}

// Icons
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function QueueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

export default GenerationQueue;
