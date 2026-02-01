/**
 * Generation Store
 * Manages active generations and generation history
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createActor } from 'xstate';
import type { UUID } from '../../core/types/common';
import { createUUID, createTimestamp } from '../../core/types/common';
import type {
  GenerationRequest,
  GenerationRecord,
  GenerationHistoryQuery,
  GenerationStats,
  ActiveGeneration,
} from '../../core/types/generation';
import type {
  QueuedGeneration,
  QueueConfig,
  QueueStats,
  QueueAddOptions,
} from './types/queue';
import { DEFAULT_QUEUE_CONFIG } from './types/queue';
import {
  createGenerationMachine,
  type GenerationMachineContext,
} from './machines/generationMachine';
import {
  createGenerationRecord,
  cancelGeneration,
} from './services/generationService';
import {
  loadGenerationHistoryFromDb,
  saveGenerationRecordToDb,
} from './services/generationDbService';
import * as queueService from './services/generationQueue';

interface GenerationState {
  // Active generations (in-flight)
  activeGenerations: Map<UUID, ActiveGeneration>;
  activeActors: Map<UUID, ReturnType<typeof createActor<ReturnType<typeof createGenerationMachine>>>>;

  // History
  history: Map<UUID, GenerationRecord>;
  historyOrder: UUID[]; // For maintaining order

  // Legacy queue (keeping for backward compatibility)
  queue: GenerationRequest[];
  maxConcurrent: number;

  // New batch queue system
  batchQueue: Map<UUID, QueuedGeneration>;
  queueConfig: QueueConfig;
  queuePaused: boolean;
  queueStats: QueueStats | null;

  // Statistics cache
  stats: GenerationStats | null;
}

interface GenerationActions {
  // Generation lifecycle
  startGeneration: (request: Omit<GenerationRequest, 'id' | 'createdAt'>) => UUID;
  cancelGeneration: (id: UUID) => Promise<boolean>;
  retryGeneration: (id: UUID) => UUID | null;

  // Legacy queue management (keeping for backward compatibility)
  addToQueue: (request: GenerationRequest) => void;
  removeFromQueue: (id: UUID) => void;
  processQueue: () => void;

  // Batch queue management
  queueGeneration: (request: GenerationRequest, options?: QueueAddOptions) => UUID;
  cancelQueuedGeneration: (id: UUID) => boolean;
  cancelAllQueuedGenerations: () => void;
  setQueueConfig: (config: Partial<QueueConfig>) => void;
  pauseQueue: () => void;
  resumeQueue: () => void;
  updateQueuePriority: (id: UUID, priority: number) => boolean;
  clearFinishedQueueItems: () => void;
  getBatchQueueStats: () => QueueStats;
  getBatchQueueItems: () => QueuedGeneration[];

  // Active generation updates
  updateActiveGeneration: (id: UUID, updates: Partial<ActiveGeneration>) => void;
  removeActiveGeneration: (id: UUID) => void;

  // History
  addToHistory: (record: GenerationRecord) => void;
  getHistoryRecord: (id: UUID) => GenerationRecord | undefined;
  queryHistory: (query: GenerationHistoryQuery) => GenerationRecord[];
  clearHistory: () => void;

  // Statistics
  getStats: () => GenerationStats;
  refreshStats: () => void;

  // Streaming content
  getStreamedContent: (id: UUID) => string;

  // Persistence
  loadFromDatabase: (records: GenerationRecord[]) => void;
  initializeFromDatabase: () => Promise<void>;

  // Internal: sync queue from service
  _syncQueueFromService: (items: Map<UUID, QueuedGeneration>) => void;
  _syncQueueStats: (stats: QueueStats) => void;
}

type GenerationStore = GenerationState & GenerationActions;

export const useGenerationStore = create<GenerationStore>()(
  immer((set, get) => {
    // Set up queue service callbacks for synchronization
    queueService.setQueueCallbacks(
      (items) => get()._syncQueueFromService(items),
      (stats) => get()._syncQueueStats(stats)
    );

    return {
      // Initial state
      activeGenerations: new Map(),
      activeActors: new Map(),
      history: new Map(),
      historyOrder: [],
      queue: [],
      maxConcurrent: 3,
      stats: null,

      // Batch queue state
      batchQueue: new Map(),
      queueConfig: { ...DEFAULT_QUEUE_CONFIG },
      queuePaused: false,
      queueStats: null,

    // Start a new generation
    startGeneration: (requestInput) => {
      const id = createUUID();
      const request: GenerationRequest = {
        ...requestInput,
        id,
        createdAt: createTimestamp(),
      };

      // Check if we can start immediately
      const state = get();
      if (state.activeGenerations.size >= state.maxConcurrent) {
        // Add to queue
        state.addToQueue(request);
        return id;
      }

      // Create and start the state machine
      const machine = createGenerationMachine(request);
      const actor = createActor(machine, {
        // Provide service implementations
        inspect: (inspectionEvent) => {
          // Handle state transitions for UI updates
          if (inspectionEvent.type === '@xstate.snapshot') {
            const snapshot = inspectionEvent.snapshot as any;
            const context = snapshot.context as GenerationMachineContext;

            get().updateActiveGeneration(id, {
              status: context.status,
              progress: context.progress,
              streamedContent: context.streamedContent,
            });
          }
        },
      });

      // Add to active generations
      set((state) => {
        state.activeGenerations.set(id, {
          id,
          type: request.type,
          status: 'pending',
          progress: 0,
          startedAt: createTimestamp(),
          canCancel: true,
        });
        state.activeActors.set(id, actor as any);
      });

      // Start the actor
      actor.start();
      actor.send({ type: 'START' });

      // Set up completion handler
      actor.subscribe({
        complete: () => {
          const snapshot = actor.getSnapshot();
          const context = snapshot.context as GenerationMachineContext;

          // Create history record
          const record = createGenerationRecord(
            request,
            { systemPrompt: '', userPrompt: '', renderedPrompt: '' },
            context.result,
            context.error
          );

          // Add to history and remove from active
          get().addToHistory(record);
          get().removeActiveGeneration(id);

          // Process queue
          get().processQueue();
        },
      });

      return id;
    },

    // Cancel a generation
    cancelGeneration: async (id) => {
      const actor = get().activeActors.get(id);
      if (!actor) {
        return false;
      }

      const snapshot = actor.getSnapshot();
      const context = snapshot.context as GenerationMachineContext;

      // Try to cancel provider job if applicable
      const cancelled = await cancelGeneration(context.request, context.providerJobId);

      // Send cancel event to state machine
      actor.send({ type: 'CANCEL' });

      return cancelled;
    },

    // Retry a failed generation
    retryGeneration: (id) => {
      const record = get().history.get(id);
      if (!record || record.status !== 'failed') {
        return null;
      }

      // Create new generation with same parameters
      const newId = get().startGeneration({
        type: record.type,
        providerId: record.providerId,
        providerType: record.providerType,
        model: record.model,
        promptTemplateId: record.promptTemplateId,
        promptVersionId: record.promptVersionId,
        brandId: record.brandId,
        variables: record.variablesUsed,
        parameters: record.parametersUsed,
        customPrompt: record.renderedPrompt,
      });

      return newId;
    },

    // Queue management
    addToQueue: (request) => {
      set((state) => {
        state.queue.push(request);
      });
    },

    removeFromQueue: (id) => {
      set((state) => {
        state.queue = state.queue.filter((r) => r.id !== id);
      });
    },

    processQueue: () => {
      const state = get();
      const availableSlots = state.maxConcurrent - state.activeGenerations.size;

      if (availableSlots <= 0 || state.queue.length === 0) {
        return;
      }

      // Start queued generations
      const toStart = state.queue.slice(0, availableSlots);
      set((s) => {
        s.queue = s.queue.slice(availableSlots);
      });

      for (const request of toStart) {
        // Re-start the generation (remove from queue first)
        const machine = createGenerationMachine(request);
        const actor = createActor(machine);

        set((s) => {
          s.activeGenerations.set(request.id, {
            id: request.id,
            type: request.type,
            status: 'pending',
            progress: 0,
            startedAt: createTimestamp(),
            canCancel: true,
          });
          s.activeActors.set(request.id, actor as any);
        });

        actor.start();
        actor.send({ type: 'START' });
      }
    },

    // Update active generation
    updateActiveGeneration: (id, updates) => {
      set((state) => {
        const gen = state.activeGenerations.get(id);
        if (gen) {
          Object.assign(gen, updates);
        }
      });
    },

    // Remove active generation
    removeActiveGeneration: (id) => {
      set((state) => {
        state.activeGenerations.delete(id);
        state.activeActors.delete(id);
      });
    },

    // Add to history
    addToHistory: (record) => {
      set((state) => {
        state.history.set(record.id, record);
        state.historyOrder.unshift(record.id); // Most recent first

        // Limit history size
        if (state.historyOrder.length > 1000) {
          const toRemove = state.historyOrder.pop();
          if (toRemove) {
            state.history.delete(toRemove);
          }
        }

        // Invalidate stats cache
        state.stats = null;
      });

      // Persist to database (fire and forget)
      saveGenerationRecordToDb(record).catch((err) => {
        console.error('Failed to persist generation record to database:', err);
      });
    },

    // Get history record
    getHistoryRecord: (id) => {
      return get().history.get(id);
    },

    // Query history
    queryHistory: (query) => {
      const state = get();
      let results = state.historyOrder.map((id) => state.history.get(id)!);

      // Apply filters
      if (query.projectId) {
        // Filter by project would require projectId on records
      }

      if (query.type) {
        results = results.filter((r) => r.type === query.type);
      }

      if (query.providerId) {
        results = results.filter((r) => r.providerId === query.providerId);
      }

      if (query.status) {
        results = results.filter((r) => r.status === query.status);
      }

      if (query.promptTemplateId) {
        results = results.filter((r) => r.promptTemplateId === query.promptTemplateId);
      }

      if (query.brandId) {
        results = results.filter((r) => r.brandId === query.brandId);
      }

      if (query.fromDate) {
        results = results.filter((r) => r.createdAt >= query.fromDate!);
      }

      if (query.toDate) {
        results = results.filter((r) => r.createdAt <= query.toDate!);
      }

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 50;
      results = results.slice(offset, offset + limit);

      return results;
    },

    // Clear history
    clearHistory: () => {
      set((state) => {
        state.history.clear();
        state.historyOrder = [];
        state.stats = null;
      });
    },

    // Get statistics
    getStats: () => {
      const state = get();

      // Return cached stats if available
      if (state.stats) {
        return state.stats;
      }

      // Calculate stats
      const stats: GenerationStats = {
        totalGenerations: state.history.size,
        byType: { text: 0, image: 0, video: 0 },
        byProvider: {} as Record<string, number>,
        byStatus: {
          pending: 0,
          validating: 0,
          preparing: 0,
          executing: 0,
          streaming: 0,
          completed: 0,
          failed: 0,
          cancelled: 0,
        },
        totalCostUsd: 0,
        averageDurationMs: 0,
      };

      let totalDuration = 0;
      let durationCount = 0;

      for (const record of state.history.values()) {
        stats.byType[record.type]++;
        stats.byProvider[record.providerType] = (stats.byProvider[record.providerType] || 0) + 1;
        stats.byStatus[record.status]++;

        if (record.costEstimateUsd) {
          stats.totalCostUsd += record.costEstimateUsd;
        }

        if (record.durationMs) {
          totalDuration += record.durationMs;
          durationCount++;
        }
      }

      if (durationCount > 0) {
        stats.averageDurationMs = totalDuration / durationCount;
      }

      // Cache stats
      set((s) => {
        s.stats = stats;
      });

      return stats;
    },

    // Refresh stats
    refreshStats: () => {
      set((state) => {
        state.stats = null;
      });
      get().getStats();
    },

    // Get streamed content for an active generation
    getStreamedContent: (id) => {
      const actor = get().activeActors.get(id);
      if (!actor) {
        return '';
      }

      const snapshot = actor.getSnapshot();
      const context = snapshot.context as GenerationMachineContext;
      return context.streamedContent;
    },

    // Load from database
    loadFromDatabase: (records) => {
      set((state) => {
        state.history.clear();
        state.historyOrder = [];

        for (const record of records) {
          state.history.set(record.id, record);
          state.historyOrder.push(record.id);
        }

        state.stats = null;
      });
    },

    // Initialize from database (load persisted records)
    initializeFromDatabase: async () => {
      try {
        const records = await loadGenerationHistoryFromDb();
        get().loadFromDatabase(records);
        console.log(`Loaded ${records.length} generation records from database`);
      } catch (error) {
        console.error('Failed to initialize generation history from database:', error);
      }
    },

    // Batch queue methods
    queueGeneration: (request, options = {}) => {
      return queueService.addToQueue(request, options);
    },

    cancelQueuedGeneration: (id) => {
      return queueService.cancelQueued(id);
    },

    cancelAllQueuedGenerations: () => {
      queueService.cancelAll();
    },

    setQueueConfig: (config) => {
      queueService.setQueueConfig(config);
      set((state) => {
        state.queueConfig = { ...state.queueConfig, ...config };
      });
    },

    pauseQueue: () => {
      queueService.pauseQueue();
      set((state) => {
        state.queuePaused = true;
      });
    },

    resumeQueue: () => {
      queueService.resumeQueue();
      set((state) => {
        state.queuePaused = false;
      });
    },

    updateQueuePriority: (id, priority) => {
      return queueService.updatePriority(id, priority);
    },

    clearFinishedQueueItems: () => {
      queueService.clearFinishedItems();
    },

    getBatchQueueStats: () => {
      return queueService.getQueueStats();
    },

    getBatchQueueItems: () => {
      return queueService.getQueuedItems();
    },

    // Internal sync methods for queue service callbacks
    _syncQueueFromService: (items) => {
      set((state) => {
        state.batchQueue = items;
      });
    },

    _syncQueueStats: (stats) => {
      set((state) => {
        state.queueStats = stats;
      });
    },
  };
  })
);

// Selectors - using useMemo to prevent infinite re-renders from new array/object creation

export const useActiveGenerations = () => {
  const activeGenerations = useGenerationStore((state) => state.activeGenerations);
  return useMemo(() => Array.from(activeGenerations.values()), [activeGenerations]);
};

export const useActiveGeneration = (id: UUID | null) => {
  const activeGenerations = useGenerationStore((state) => state.activeGenerations);
  return useMemo(() => (id ? activeGenerations.get(id) : undefined), [activeGenerations, id]);
};

export const useGenerationHistory = (query?: GenerationHistoryQuery) => {
  const history = useGenerationStore((state) => state.history);
  const historyOrder = useGenerationStore((state) => state.historyOrder);
  const queryHistory = useGenerationStore((state) => state.queryHistory);

  return useMemo(() => {
    if (query) {
      return queryHistory(query);
    }
    return historyOrder.map((id) => history.get(id)!);
  }, [history, historyOrder, query, queryHistory]);
};

export const useGenerationStats = () => {
  const stats = useGenerationStore((state) => state.stats);
  const history = useGenerationStore((state) => state.history);

  return useMemo(() => {
    // Return cached stats if available
    if (stats) {
      return stats;
    }

    // Compute stats without setting state (avoids infinite loop)
    const computedStats: GenerationStats = {
      totalGenerations: history.size,
      byType: { text: 0, image: 0, video: 0 },
      byProvider: {} as Record<string, number>,
      byStatus: {
        pending: 0,
        validating: 0,
        preparing: 0,
        executing: 0,
        streaming: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      },
      totalCostUsd: 0,
      averageDurationMs: 0,
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const record of history.values()) {
      computedStats.byType[record.type]++;
      computedStats.byProvider[record.providerType] = (computedStats.byProvider[record.providerType] || 0) + 1;
      computedStats.byStatus[record.status]++;

      if (record.costEstimateUsd) {
        computedStats.totalCostUsd += record.costEstimateUsd;
      }

      if (record.durationMs) {
        totalDuration += record.durationMs;
        durationCount++;
      }
    }

    if (durationCount > 0) {
      computedStats.averageDurationMs = totalDuration / durationCount;
    }

    return computedStats;
  }, [stats, history]);
};

export const useGenerationQueue = () => {
  const queue = useGenerationStore((state) => state.queue);
  return useMemo(() => [...queue], [queue]);
};

export const useStreamedContent = (id: UUID | null) => {
  const getStreamedContent = useGenerationStore((state) => state.getStreamedContent);
  return useMemo(() => (id ? getStreamedContent(id) : ''), [getStreamedContent, id]);
};

// Batch queue selectors
export const useBatchQueue = () => {
  const batchQueue = useGenerationStore((state) => state.batchQueue);
  return useMemo(() => Array.from(batchQueue.values()), [batchQueue]);
};

export const useBatchQueueStats = () => {
  const queueStats = useGenerationStore((state) => state.queueStats);
  const getBatchQueueStats = useGenerationStore((state) => state.getBatchQueueStats);
  return useMemo(() => queueStats || getBatchQueueStats(), [queueStats, getBatchQueueStats]);
};

export const useQueuePaused = () => {
  return useGenerationStore((state) => state.queuePaused);
};

export const useQueueConfig = () => {
  return useGenerationStore((state) => state.queueConfig);
};

export const useBatchQueueItem = (id: UUID | null) => {
  const batchQueue = useGenerationStore((state) => state.batchQueue);
  return useMemo(() => (id ? batchQueue.get(id) : undefined), [batchQueue, id]);
};
