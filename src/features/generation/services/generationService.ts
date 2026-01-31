/**
 * Generation Service
 * Provides actor implementations for the generation state machine
 */

import type { UUID, ContentType } from '../../../core/types/common';
import { createUUID, createTimestamp } from '../../../core/types/common';
import type {
  GenerationRequest,
  GenerationResult,
  GenerationRecord,
  GenerationParameters,
} from '../../../core/types/generation';
import type { ProviderError, StreamChunk } from '../../../core/types/provider';
import { useProviderStore } from '../../providers/store';
import { useTemplateStore } from '../../templates/store';
import { useBrandStore } from '../../brands/store';
import { renderPrompt } from '../../templates/services/templateService';
import { injectBrandTokens } from '../../../core/utils/tokenInjection';

// Service response types
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface PreparedPrompt {
  systemPrompt?: string;
  userPrompt: string;
  renderedPrompt: string;
}

interface TextGenerationResult {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
}

interface ImageGenerationResult {
  urls: string[];
  assetIds: UUID[];
  metadata?: Record<string, unknown>;
}

interface VideoJobResult {
  jobId: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  urls?: string[];
  assetIds?: UUID[];
  error?: ProviderError;
}

/**
 * Validate generation request
 */
export async function validateRequest(request: GenerationRequest): Promise<ValidationResult> {
  const errors: string[] = [];

  // Check content type
  if (!['text', 'image', 'video'].includes(request.type)) {
    errors.push(`Invalid content type: ${request.type}`);
  }

  // Check prompt source
  const hasPromptSource =
    request.customPrompt ||
    request.promptTemplateId ||
    request.promptVersionId;

  if (!hasPromptSource) {
    errors.push('No prompt source specified (customPrompt, promptTemplateId, or promptVersionId required)');
  }

  // Check provider
  if (request.providerId) {
    const providerStore = useProviderStore.getState();
    const provider = providerStore.providers.get(request.providerId);
    if (!provider) {
      errors.push(`Provider not found: ${request.providerId}`);
    } else if (!provider.config.isActive) {
      errors.push(`Provider is disabled: ${provider.config.name}`);
    }
  }

  // Validate parameters based on content type
  if (request.type === 'image' && request.parameters) {
    if (request.parameters.width && (request.parameters.width < 64 || request.parameters.width > 4096)) {
      errors.push('Image width must be between 64 and 4096');
    }
    if (request.parameters.height && (request.parameters.height < 64 || request.parameters.height > 4096)) {
      errors.push('Image height must be between 64 and 4096');
    }
  }

  if (request.type === 'video' && request.parameters) {
    if (request.parameters.duration && (request.parameters.duration < 1 || request.parameters.duration > 60)) {
      errors.push('Video duration must be between 1 and 60 seconds');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Prepare the prompt by rendering templates and injecting brand tokens
 */
export async function preparePrompt(request: GenerationRequest): Promise<PreparedPrompt> {
  let systemPrompt: string | undefined;
  let userPrompt: string;

  // Get prompt from template or custom
  if (request.customPrompt) {
    userPrompt = request.customPrompt;
  } else if (request.promptTemplateId || request.promptVersionId) {
    const templateStore = useTemplateStore.getState();

    // Get the version to render
    let version;
    if (request.promptVersionId) {
      version = templateStore.getVersion(request.promptVersionId);
    } else if (request.promptTemplateId) {
      if (request.promptLabel) {
        version = templateStore.getVersionByLabel(request.promptTemplateId, request.promptLabel as any);
      } else {
        version = templateStore.getLatestVersion(request.promptTemplateId);
      }
    }

    if (!version) {
      throw new Error('Prompt template version not found');
    }

    // Get brand if specified
    let brand;
    if (request.brandId) {
      const brandStore = useBrandStore.getState();
      brand = brandStore.brands.get(request.brandId);
    }

    // Render the prompt
    const rendered = renderPrompt(version, request.variables || {}, brand!);
    systemPrompt = rendered.systemPrompt;
    userPrompt = rendered.userPrompt;
  } else {
    throw new Error('No prompt source available');
  }

  // Inject brand tokens if brand is specified and not already done via template
  if (request.brandId && !request.promptTemplateId) {
    const brandStore = useBrandStore.getState();
    const brand = brandStore.brands.get(request.brandId);
    if (brand) {
      const injectionResult = injectBrandTokens(userPrompt, brand);
      userPrompt = injectionResult.injectedContent;
      if (systemPrompt) {
        const systemInjection = injectBrandTokens(systemPrompt, brand);
        systemPrompt = systemInjection.injectedContent;
      }
    }
  }

  return {
    systemPrompt,
    userPrompt,
    renderedPrompt: systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt,
  };
}

/**
 * Generate text with streaming
 */
export async function* streamText(
  request: GenerationRequest,
  prompt: PreparedPrompt
): AsyncGenerator<StreamChunk> {
  const providerStore = useProviderStore.getState();

  // Get provider adapter
  const providerId = request.providerId || providerStore.getDefaultProvider('text');
  if (!providerId) {
    throw new Error('No text provider available');
  }

  const provider = providerStore.providers.get(providerId);
  if (!provider) {
    throw new Error('Provider not found');
  }

  // Get adapter instance
  const adapter = providerStore.getAdapter(providerId);
  if (!adapter) {
    throw new Error('Provider adapter not available');
  }

  // Stream text
  const streamGenerator = adapter.streamText({
    model: request.model || 'default',
    userPrompt: prompt.userPrompt,
    systemPrompt: prompt.systemPrompt,
    temperature: request.parameters?.temperature,
    maxTokens: request.parameters?.maxTokens,
    topP: request.parameters?.topP,
  });

  for await (const chunk of streamGenerator) {
    yield chunk;
  }
}

/**
 * Generate text without streaming
 */
export async function generateText(
  request: GenerationRequest,
  prompt: PreparedPrompt
): Promise<TextGenerationResult> {
  const providerStore = useProviderStore.getState();

  // Get provider adapter
  const providerId = request.providerId || providerStore.getDefaultProvider('text');
  if (!providerId) {
    throw new Error('No text provider available');
  }

  const adapter = providerStore.getAdapter(providerId);
  if (!adapter) {
    throw new Error('Provider adapter not available');
  }

  const result = await adapter.generateText({
    model: request.model || 'default',
    userPrompt: prompt.userPrompt,
    systemPrompt: prompt.systemPrompt,
    temperature: request.parameters?.temperature,
    maxTokens: request.parameters?.maxTokens,
    topP: request.parameters?.topP,
  });

  return {
    content: result.content,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}

/**
 * Generate image
 */
export async function generateImage(
  request: GenerationRequest,
  prompt: PreparedPrompt,
  onProgress?: (progress: number) => void
): Promise<ImageGenerationResult> {
  const providerStore = useProviderStore.getState();

  // Get provider adapter
  const providerId = request.providerId || providerStore.getDefaultProvider('image');
  if (!providerId) {
    throw new Error('No image provider available');
  }

  const adapter = providerStore.getAdapter(providerId);
  if (!adapter) {
    throw new Error('Provider adapter not available');
  }

  onProgress?.(10);

  const result = await adapter.generateImage({
    model: request.model || 'default',
    prompt: prompt.userPrompt,
    negativePrompt: request.parameters?.negativePrompt,
    width: request.parameters?.width,
    height: request.parameters?.height,
    seed: request.parameters?.seed,
    guidanceScale: request.parameters?.guidanceScale,
    numImages: request.parameters?.numVariants,
    style: request.parameters?.style,
  });

  onProgress?.(90);

  // Generate asset IDs for the images
  const urls = result.images.map((img) => img.url);
  const assetIds = urls.map(() => createUUID());

  onProgress?.(100);

  return {
    urls,
    assetIds,
  };
}

/**
 * Submit video generation job
 */
export async function submitVideoJob(
  request: GenerationRequest,
  prompt: PreparedPrompt
): Promise<{ jobId: string }> {
  const providerStore = useProviderStore.getState();

  // Get provider adapter
  const providerId = request.providerId || providerStore.getDefaultProvider('video');
  if (!providerId) {
    throw new Error('No video provider available');
  }

  const adapter = providerStore.getAdapter(providerId);
  if (!adapter) {
    throw new Error('Provider adapter not available');
  }

  const result = await adapter.submitVideoJob({
    model: request.model || 'default',
    prompt: prompt.userPrompt,
    duration: request.parameters?.duration,
    aspectRatio: request.parameters?.aspectRatio,
  });

  return {
    jobId: result.jobId,
  };
}

/**
 * Poll video job status
 */
export async function pollVideoJob(
  request: GenerationRequest,
  jobId: string
): Promise<VideoJobResult> {
  const providerStore = useProviderStore.getState();

  const providerId = request.providerId || providerStore.getDefaultProvider('video');
  if (!providerId) {
    throw new Error('No video provider available');
  }

  const adapter = providerStore.getAdapter(providerId);
  if (!adapter) {
    throw new Error('Provider adapter not available');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (adapter as any).pollVideoJob?.(jobId) || { status: 'failed', error: 'Polling not supported' };

  if (result.status === 'complete' && result.urls) {
    const assetIds = result.urls.map(() => createUUID());
    return {
      jobId,
      status: 'complete',
      urls: result.urls,
      assetIds,
    };
  }

  if (result.status === 'failed') {
    return {
      jobId,
      status: 'failed',
      error: result.error,
    };
  }

  return {
    jobId,
    status: result.status as 'pending' | 'processing',
  };
}

/**
 * Create a generation record for persistence
 */
export function createGenerationRecord(
  request: GenerationRequest,
  prompt: PreparedPrompt,
  result?: GenerationResult,
  error?: ProviderError
): GenerationRecord {
  const now = createTimestamp();

  return {
    id: createUUID(),
    requestId: request.id,
    status: error ? 'failed' : result ? 'completed' : 'pending',
    providerId: request.providerId || ('' as UUID),
    providerType: request.providerType || 'openai',
    model: request.model || 'default',
    type: request.type,
    promptTemplateId: request.promptTemplateId,
    promptVersionId: request.promptVersionId,
    brandId: request.brandId,
    renderedPrompt: prompt.renderedPrompt,
    variablesUsed: request.variables,
    parametersUsed: request.parameters || {},
    result,
    error,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Estimate generation cost
 */
export function estimateCost(
  type: ContentType,
  parameters: GenerationParameters,
  _providerType: string
): number {
  // Cost estimation based on typical provider pricing
  // These are rough estimates and should be updated with actual pricing

  switch (type) {
    case 'text':
      // ~$0.01 per 1K tokens for GPT-4
      const estimatedTokens = (parameters.maxTokens || 1000) * 1.5;
      return (estimatedTokens / 1000) * 0.01;

    case 'image':
      // ~$0.04 per image for DALL-E 3
      const numImages = parameters.numVariants || 1;
      return numImages * 0.04;

    case 'video':
      // ~$0.50 per second for video generation
      const duration = parameters.duration || 5;
      return duration * 0.50;

    default:
      return 0;
  }
}

/**
 * Cancel a generation job
 */
export async function cancelGeneration(
  request: GenerationRequest,
  providerJobId?: string
): Promise<boolean> {
  if (!providerJobId) {
    // Text/image generations can't be cancelled mid-flight
    return false;
  }

  const providerStore = useProviderStore.getState();
  const providerId = request.providerId || providerStore.getDefaultProvider('video');

  if (!providerId) {
    return false;
  }

  const adapter = providerStore.getAdapter(providerId);
  if (!adapter || !adapter.cancelVideoJob) {
    return false;
  }

  try {
    await adapter.cancelVideoJob(providerJobId);
    return true;
  } catch {
    return false;
  }
}
