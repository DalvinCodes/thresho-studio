/**
 * Generation Store
 * Manages active generations and generation history
 */

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
import type { StreamChunk } from '../../core/types/provider';
import {
  createGenerationMachine,
  type GenerationMachineContext,
} from './machines/generationMachine';
import {
  createGenerationRecord,
  cancelGeneration,
} from './services/generationService';

interface GenerationState {
  // Active generations (in-flight)
  activeGenerations: Map<UUID, ActiveGeneration>;
  activeActors: Map<UUID, ReturnType<typeof createActor<ReturnType<typeof createGenerationMachine>>>>;

  // History
  history: Map<UUID, GenerationRecord>;
  historyOrder: UUID[]; // For maintaining order

  // Queue
  queue: GenerationRequest[];
  maxConcurrent: number;

  // Statistics cache
  stats: GenerationStats | null;
}

interface GenerationActions {
  // Generation lifecycle
  startGeneration: (request: Omit<GenerationRequest, 'id' | 'createdAt'>) => UUID;
  cancelGeneration: (id: UUID) => Promise<boolean>;
  retryGeneration: (id: UUID) => UUID | null;

  // Queue management
  addToQueue: (request: GenerationRequest) => void;
  removeFromQueue: (id: UUID) => void;
  processQueue: () => void;

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
}

type GenerationStore = GenerationState & GenerationActions;

export const useGenerationStore = create<GenerationStore>()(
  immer((set, get) => ({
    // Initial state
    activeGenerations: new Map(),
    activeActors: new Map(),
    history: new Map(),
    historyOrder: [],
    queue: [],
    maxConcurrent: 3,
    stats: null,

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
  }))
);

// Selectors

export const useActiveGenerations = () => {
  const store = useGenerationStore();
  return Array.from(store.activeGenerations.values());
};

export const useActiveGeneration = (id: UUID | null) => {
  const store = useGenerationStore();
  return id ? store.activeGenerations.get(id) : undefined;
};

export const useGenerationHistory = (query?: GenerationHistoryQuery) => {
  const store = useGenerationStore();
  return query ? store.queryHistory(query) : store.historyOrder.map((id) => store.history.get(id)!);
};

export const useGenerationStats = () => {
  const store = useGenerationStore();
  // Return cached stats or compute without caching in selector
  if (store.stats) {
    return store.stats;
  }

  // Compute stats without setting state (avoids infinite loop)
  const stats: GenerationStats = {
    totalGenerations: store.history.size,
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

  for (const record of store.history.values()) {
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

  return stats;
};

export const useGenerationQueue = () => {
  const store = useGenerationStore();
  return store.queue;
};

export const useStreamedContent = (id: UUID | null) => {
  const store = useGenerationStore();
  return id ? store.getStreamedContent(id) : '';
};
