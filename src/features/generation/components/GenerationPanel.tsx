/**
 * Generation Panel Component
 * Displays active generations, queue, and history
 */

import { useState, useCallback } from 'react';
import { FileText, Image, Video, Search, ClipboardList, Zap, Check, X } from 'lucide-react';
import type { UUID, ContentType } from '../../../core/types/common';
import type {
  ActiveGeneration,
  GenerationRecord,
  GenerationStatus,
  GenerationStats,
} from '../../../core/types/generation';
import {
  useGenerationStore,
  useActiveGenerations,
  useGenerationHistory,
  useGenerationQueue,
  useGenerationStats,
  useStreamedContent,
  useBatchQueue,
  useBatchQueueStats,
} from '../store';
import { GenerationQueue } from './GenerationQueue';

interface GenerationPanelProps {
  onViewResult?: (id: UUID) => void;
}

export function GenerationPanel({ onViewResult }: GenerationPanelProps) {
  const activeGenerations = useActiveGenerations();
  const queue = useGenerationQueue();
  const _batchQueue = useBatchQueue();
  const batchQueueStats = useBatchQueueStats();
  const history = useGenerationHistory({ limit: 20 });
  const stats: GenerationStats | null = useGenerationStats();
  const { cancelGeneration, retryGeneration, clearHistory } = useGenerationStore();

  const [activeTab, setActiveTab] = useState<'active' | 'queue' | 'batch' | 'history'>('active');

  // Count queued items from batch queue
  const batchQueuedCount = batchQueueStats?.queued || 0;
  const batchProcessingCount = batchQueueStats?.processing || 0;

  const handleCancel = useCallback(async (id: UUID) => {
    await cancelGeneration(id);
  }, [cancelGeneration]);

  const handleRetry = useCallback((id: UUID) => {
    retryGeneration(id);
  }, [retryGeneration]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface">
        <h2 className="text-lg font-semibold text-text-primary">Generation</h2>
        {stats && (
          <p className="text-sm text-text-secondary mt-1">
            {stats.totalGenerations} total • {activeGenerations.length} active • {batchQueuedCount + batchProcessingCount} in batch queue
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface">
        {[
          { key: 'active', label: 'Active', count: activeGenerations.length },
          { key: 'batch', label: 'Batch Queue', count: batchQueuedCount + batchProcessingCount },
          { key: 'queue', label: 'Legacy Queue', count: queue.length },
          { key: 'history', label: 'History', count: history.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`
              px-4 py-2 text-sm font-medium transition-colors relative
              ${activeTab === tab.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'active' && (
          <ActiveGenerationsList
            generations={activeGenerations}
            onCancel={handleCancel}
            onViewResult={onViewResult}
          />
        )}

        {activeTab === 'batch' && (
          <GenerationQueue onViewResult={onViewResult} />
        )}

        {activeTab === 'queue' && (
          <QueueList
            queue={queue}
            onRemove={(id) => useGenerationStore.getState().removeFromQueue(id)}
          />
        )}

        {activeTab === 'history' && (
          <HistoryList
            history={history}
            onRetry={handleRetry}
            onViewResult={onViewResult}
            onClear={clearHistory}
          />
        )}
      </div>

      {/* Stats Footer */}
      {stats && activeTab !== 'batch' && (
        <div className="p-4 border-t border-border bg-surface">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-text-primary">{stats.byType.text}</p>
              <p className="text-xs text-text-secondary">Text</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{stats.byType.image}</p>
              <p className="text-xs text-text-secondary">Images</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{stats.byType.video}</p>
              <p className="text-xs text-text-secondary">Videos</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">
                ${stats.totalCostUsd.toFixed(2)}
              </p>
              <p className="text-xs text-text-secondary">Est. Cost</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Active Generations List
interface ActiveGenerationsListProps {
  generations: ActiveGeneration[];
  onCancel: (id: UUID) => void;
  onViewResult?: (id: UUID) => void;
}

function ActiveGenerationsList({ generations, onCancel, onViewResult }: ActiveGenerationsListProps) {
  if (generations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <p>No active generations</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {generations.map((gen) => (
        <ActiveGenerationCard
          key={gen.id}
          generation={gen}
          onCancel={() => onCancel(gen.id)}
          onViewResult={() => onViewResult?.(gen.id)}
        />
      ))}
    </div>
  );
}

// Active Generation Card
interface ActiveGenerationCardProps {
  generation: ActiveGeneration;
  onCancel: () => void;
  onViewResult: () => void;
}

function TypeIcon({ type }: { type: ContentType }) {
  const iconClass = "w-5 h-5 text-text-primary";
  switch (type) {
    case 'text': return <FileText className={iconClass} />;
    case 'image': return <Image className={iconClass} />;
    case 'video': return <Video className={iconClass} />;
  }
}

function StatusIcon({ status }: { status: GenerationStatus }) {
  const iconClass = "w-4 h-4";
  switch (status) {
    case 'pending': return <span className="text-text-secondary">⏳</span>;
    case 'validating': return <Search className={`${iconClass} text-blue-500`} />;
    case 'preparing': return <ClipboardList className={`${iconClass} text-purple-500`} />;
    case 'executing': return <Zap className={`${iconClass} text-yellow-500`} />;
    case 'streaming': return <span className="text-green-500">📡</span>;
    case 'completed': return <Check className={`${iconClass} text-emerald-500`} />;
    case 'failed': return <X className={`${iconClass} text-red-500`} />;
    case 'cancelled': return <span className="text-gray-500">🚫</span>;
  }
}

function ActiveGenerationCard({ generation, onCancel, onViewResult }: ActiveGenerationCardProps) {
  const streamedContent = useStreamedContent(generation.id);

  const statusColors: Record<GenerationStatus, string> = {
    pending: 'bg-gray-500',
    validating: 'bg-blue-500',
    preparing: 'bg-purple-500',
    executing: 'bg-yellow-500',
    streaming: 'bg-green-500',
    completed: 'bg-emerald-500',
    failed: 'bg-red-500',
    cancelled: 'bg-gray-500',
  };

  return (
    <div className="p-4 bg-surface rounded-3xl border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TypeIcon type={generation.type} />
          <div>
            <p className="font-medium text-text-primary capitalize">{generation.type} Generation</p>
            <p className="text-xs text-text-secondary">
              Started {new Date(generation.startedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span data-testid="generation-status" className={`px-2 py-0.5 text-xs text-white rounded ${statusColors[generation.status]}`}>
            {generation.status}
          </span>
          {generation.canCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-text-secondary hover:text-red-500 transition-colors"
              title="Cancel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-text-secondary mb-1">
          <span>Progress</span>
          <span>{generation.progress}%</span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${generation.progress}%` }}
          />
        </div>
      </div>

      {/* Streamed content preview */}
      {generation.type === 'text' && streamedContent && (
        <div data-testid="stream-output" className="mt-3 p-3 bg-background rounded border border-border max-h-32 overflow-y-auto">
          <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono">
            {streamedContent.slice(-500)}
            {generation.status === 'streaming' && (
              <span className="animate-pulse">▌</span>
            )}
          </pre>
        </div>
      )}

      {/* Actions */}
      {generation.status === 'completed' && (
        <button
          onClick={onViewResult}
          className="mt-3 w-full py-2 bg-primary text-white rounded-3xl hover:bg-primary/90 transition-colors text-sm"
        >
          View Result
        </button>
      )}
    </div>
  );
}

// Queue List
interface QueueListProps {
  queue: { id: UUID; type: ContentType; createdAt: number }[];
  onRemove: (id: UUID) => void;
}

function QueueList({ queue, onRemove }: QueueListProps) {
  if (queue.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <p>Queue is empty</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {queue.map((item, index) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 bg-surface rounded-3xl border border-border"
        >
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 flex items-center justify-center bg-primary/20 text-primary text-xs rounded-full font-medium">
              {index + 1}
            </span>
            <TypeIcon type={item.type} />
            <div>
              <p className="text-sm font-medium text-text-primary capitalize">{item.type}</p>
              <p className="text-xs text-text-secondary">
                Queued {new Date(item.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 text-text-secondary hover:text-red-500 transition-colors"
            title="Remove from queue"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// History List
interface HistoryListProps {
  history: GenerationRecord[];
  onRetry: (id: UUID) => void;
  onViewResult?: (id: UUID) => void;
  onClear: () => void;
}

function HistoryList({ history, onRetry, onViewResult, onClear }: HistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <p>No generation history</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-end mb-3">
        <button
          onClick={onClear}
          className="text-sm text-text-secondary hover:text-red-500 transition-colors"
        >
          Clear History
        </button>
      </div>

      <div className="space-y-2">
        {history.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between p-3 bg-surface rounded-3xl border border-border hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TypeIcon type={record.type} />
              <div>
                <div className="flex items-center gap-2">
                  <StatusIcon status={record.status} />
                  <p className="text-sm font-medium text-text-primary capitalize">
                    {record.type} • {record.model || record.providerType}
                  </p>
                </div>
                <p className="text-xs text-text-secondary">
                  {new Date(record.createdAt).toLocaleString()}
                  {record.durationMs && ` • ${(record.durationMs / 1000).toFixed(1)}s`}
                  {record.costEstimateUsd && ` • $${record.costEstimateUsd.toFixed(3)}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {record.status === 'completed' && (
                <button
                  onClick={() => onViewResult?.(record.id)}
                  className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
                >
                  View
                </button>
              )}
              {record.status === 'failed' && (
                <button
                  onClick={() => onRetry(record.id)}
                  className="px-2 py-1 text-xs text-yellow-500 hover:bg-yellow-500/10 rounded transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GenerationPanel;
