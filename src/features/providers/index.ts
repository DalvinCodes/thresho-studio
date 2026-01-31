/**
 * Providers Feature Exports
 */

// Store
export {
  useProviderStore,
  useProviders,
  useProvider,
  useActiveProviders,
  useProvidersForType,
  useDefaultProvider,
  useIsValidating,
} from './store';

// Adapters
export {
  BaseAdapter,
  OpenAIAdapter,
  AnthropicAdapter,
  GeminiAdapter,
  GeminiNanoAdapter,
  FluxProAdapter,
  ImagenAdapter,
  RunwayAdapter,
  VeoAdapter,
  createAdapter,
  getAdapterClass,
  hasAdapter,
  getSupportedProviderTypes,
  providerMeta,
} from './adapters';

// Services
export {
  generateText,
  streamText,
  generateImage,
  submitVideoJob,
  getVideoJobStatus,
  cancelVideoJob,
  estimateCost,
  recommendProvider,
  hasProviderForType,
  getModelsForType,
  checkProviderStatus,
  checkAllProviderStatuses,
  getProviderStatusSummary,
} from './services/providerService';

// Components
export { ProviderSettings } from './components/ProviderSettings';

// Types (re-export from core)
export type {
  ProviderConfig,
  ProviderCredential,
  ProviderState,
  ProviderStatus,
  ProviderError,
  ProviderCapability,
  ProviderUsage,
  TextGenerationRequest,
  TextGenerationResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoGenerationRequest,
  VideoGenerationJob,
  StreamChunk,
} from '../../core/types/provider';
