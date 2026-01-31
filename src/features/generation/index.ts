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

// Components
export { GenerationPanel } from './components/GenerationPanel';

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
