/**
 * Provider Service
 * Business logic for provider management and generation orchestration
 */

import type { UUID, ContentType } from '../../../core/types/common';
import type {
  TextGenerationRequest,
  TextGenerationResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoGenerationRequest,
  VideoGenerationJob,
  StreamChunk,
  ProviderStatus,
} from '../../../core/types/provider';
import { useProviderStore } from '../store';
import type { BaseAdapter } from '../adapters';

/**
 * Execute text generation with the specified or default provider
 */
export async function generateText(
  request: TextGenerationRequest,
  providerId?: UUID
): Promise<TextGenerationResponse> {
  const adapter = getAdapterOrThrow('text', providerId);
  return adapter.generateText(request);
}

/**
 * Execute streaming text generation
 */
export async function* streamText(
  request: TextGenerationRequest,
  providerId?: UUID
): AsyncGenerator<StreamChunk, void, unknown> {
  const adapter = getAdapterOrThrow('text', providerId);
  yield* adapter.streamText(request);
}

/**
 * Execute image generation
 */
export async function generateImage(
  request: ImageGenerationRequest,
  providerId?: UUID
): Promise<ImageGenerationResponse> {
  const adapter = getAdapterOrThrow('image', providerId);
  return adapter.generateImage(request);
}

/**
 * Submit video generation job
 */
export async function submitVideoJob(
  request: VideoGenerationRequest,
  providerId?: UUID
): Promise<VideoGenerationJob> {
  const adapter = getAdapterOrThrow('video', providerId);
  return adapter.submitVideoJob(request);
}

/**
 * Get video job status
 */
export async function getVideoJobStatus(
  jobId: string,
  providerId: UUID
): Promise<VideoGenerationJob> {
  const adapter = getAdapterOrThrow('video', providerId);
  return adapter.getVideoJobStatus(jobId);
}

/**
 * Cancel video job
 */
export async function cancelVideoJob(
  jobId: string,
  providerId: UUID
): Promise<boolean> {
  const adapter = getAdapterOrThrow('video', providerId);
  return adapter.cancelVideoJob(jobId);
}

/**
 * Estimate cost for a generation request
 */
export function estimateCost(
  type: ContentType,
  params: {
    inputTokens?: number;
    outputTokens?: number;
    imageCount?: number;
    videoSeconds?: number;
  },
  providerId?: UUID
): number {
  const adapter = getAdapterOrDefault(type, providerId);
  if (!adapter) return 0;
  return adapter.estimateCost(type, params);
}

/**
 * Get best provider for a content type based on capabilities and cost
 */
export function recommendProvider(
  type: ContentType,
  requirements?: {
    streaming?: boolean;
    maxTokens?: number;
    maxCost?: number;
  }
): UUID | null {
  const state = useProviderStore.getState();
  const candidates = Array.from(state.providers.values())
    .filter((p) => p.status === 'active')
    .filter((p) => p.config.capabilities.some((c) => c.type === type));

  if (candidates.length === 0) return null;

  // Filter by requirements
  let filtered = candidates;

  if (requirements?.streaming) {
    filtered = filtered.filter((p) =>
      p.config.capabilities.some((c) => c.type === type && c.supportsStreaming)
    );
  }

  if (requirements?.maxTokens) {
    filtered = filtered.filter((p) =>
      p.config.capabilities.some(
        (c) => c.type === type && (c.maxTokens ?? Infinity) >= requirements.maxTokens!
      )
    );
  }

  // Sort by cost (lowest first)
  filtered.sort((a, b) => {
    const aCost =
      a.config.capabilities.find((c) => c.type === type)?.costPerUnit ?? Infinity;
    const bCost =
      b.config.capabilities.find((c) => c.type === type)?.costPerUnit ?? Infinity;
    return aCost - bCost;
  });

  if (requirements?.maxCost) {
    filtered = filtered.filter((p) => {
      const cost = p.config.capabilities.find((c) => c.type === type)?.costPerUnit;
      return cost !== undefined && cost <= requirements.maxCost!;
    });
  }

  if (filtered.length === 0) {
    // Fall back to any active provider
    return candidates[0]?.config.id ?? null;
  }

  return filtered[0].config.id;
}

/**
 * Check if any provider is available for a content type
 */
export function hasProviderForType(type: ContentType): boolean {
  const state = useProviderStore.getState();
  return Array.from(state.providers.values()).some(
    (p) =>
      p.status === 'active' && p.config.capabilities.some((c) => c.type === type)
  );
}

/**
 * Get all models available for a content type
 */
export function getModelsForType(type: ContentType): Array<{
  model: string;
  providerId: UUID;
  providerName: string;
}> {
  const state = useProviderStore.getState();
  const models: Array<{ model: string; providerId: UUID; providerName: string }> = [];

  for (const [id, provider] of state.providers) {
    if (provider.status !== 'active') continue;

    const capability = provider.config.capabilities.find((c) => c.type === type);
    if (!capability) continue;

    for (const model of capability.models) {
      models.push({
        model,
        providerId: id,
        providerName: provider.config.displayName,
      });
    }
  }

  return models;
}

/**
 * Check the status of a specific provider by validating its credentials
 * Returns the updated status
 */
export async function checkProviderStatus(providerId: UUID): Promise<ProviderStatus> {
  const state = useProviderStore.getState();
  const provider = state.providers.get(providerId);

  if (!provider) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  // If no credentials, status is inactive
  if (!provider.credential?.apiKey) {
    state.setProviderStatus(providerId, 'inactive');
    return 'inactive';
  }

  // Validate credentials
  const isValid = await state.validateCredential(providerId);
  return isValid ? 'active' : 'error';
}

/**
 * Check status of all providers that have credentials
 * Returns a map of providerId to status
 */
export async function checkAllProviderStatuses(): Promise<Map<UUID, ProviderStatus>> {
  const state = useProviderStore.getState();
  const results = new Map<UUID, ProviderStatus>();

  const checkPromises: Promise<void>[] = [];

  for (const [id, provider] of state.providers) {
    // Skip providers without credentials
    if (!provider.credential?.apiKey) {
      results.set(id, 'inactive');
      continue;
    }

    checkPromises.push(
      checkProviderStatus(id).then((status) => {
        results.set(id, status);
      })
    );
  }

  await Promise.all(checkPromises);
  return results;
}

/**
 * Get a summary of provider statuses
 */
export function getProviderStatusSummary(): {
  total: number;
  active: number;
  inactive: number;
  error: number;
  validating: number;
} {
  const state = useProviderStore.getState();
  const summary = {
    total: 0,
    active: 0,
    inactive: 0,
    error: 0,
    validating: 0,
  };

  for (const [, provider] of state.providers) {
    summary.total++;
    switch (provider.status) {
      case 'active':
        summary.active++;
        break;
      case 'inactive':
        summary.inactive++;
        break;
      case 'error':
        summary.error++;
        break;
      case 'validating':
        summary.validating++;
        break;
    }
  }

  return summary;
}

// Helper functions

function getAdapterOrThrow(type: ContentType, providerId?: UUID): BaseAdapter {
  const adapter = getAdapterOrDefault(type, providerId);
  if (!adapter) {
    throw new Error(`No active provider available for ${type} generation`);
  }
  return adapter;
}

function getAdapterOrDefault(
  type: ContentType,
  providerId?: UUID
): BaseAdapter | undefined {
  const state = useProviderStore.getState();

  if (providerId) {
    const adapter = state.getAdapter(providerId);
    if (adapter) return adapter;
  }

  return state.getAdapterForType(type);
}
