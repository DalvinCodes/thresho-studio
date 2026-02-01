/**
 * Generation Feature Exports
 */

// Store
export {
  useGenerationStore,
  useActiveGenerations,
  useActiveGeneration,
  useGenerationHistory,
  useGenerationStats,
  useGenerationQueue,
  useStreamedContent,
  // Batch queue selectors
  useBatchQueue,
  useBatchQueueStats,
  useQueuePaused,
  useQueueConfig,
  useBatchQueueItem,
} from './store';

// Machine
export {
  createGenerationMachine,
  type GenerationMachine,
  type GenerationMachineContext,
  type GenerationMachineEvent,
  type GenerationMachineState,
} from './machines/generationMachine';

// Services
export {
  validateRequest,
  preparePrompt,
  streamText,
  generateText,
  generateImage,
  submitVideoJob,
  pollVideoJob,
  createGenerationRecord,
  estimateCost,
  cancelGeneration,
} from './services/generationService';

// Queue Service
export {
  addToQueue as addToGenerationQueue,
  cancelQueued as cancelQueuedGeneration,
  cancelAll as cancelAllQueuedGenerations,
  pauseQueue,
  resumeQueue,
  isQueuePaused,
  getQueueStats,
  getQueuedItems,
  getQueuedItem,
  setQueueConfig,
  getQueueConfig,
  updatePriority as updateQueueItemPriority,
  clearFinishedItems as clearFinishedQueueItems,
  resetQueue,
} from './services/generationQueue';

// Components
export { GenerationPanel } from './components/GenerationPanel';
export { GenerationQueue } from './components/GenerationQueue';
export { CostDashboard } from './components/CostDashboard';

// Types (re-export from core)
export type {
  GenerationRequest,
  GenerationRecord,
  GenerationResult,
  GenerationStatus,
  GenerationParameters,
  GenerationWorkflowContext,
  GenerationHistoryQuery,
  GenerationStats,
  ActiveGeneration,
} from '../../core/types/generation';

// Queue types
export type {
  QueuedGeneration,
  QueueConfig,
  QueueStats,
  QueueAddOptions,
  QueuedGenerationStatus,
} from './types/queue';

export { DEFAULT_QUEUE_CONFIG } from './types/queue';
