/**
 * Generation workflow types for AI content generation
 */

import type { UUID, Timestamp, ProviderType, ContentType, BaseEntity } from './common';
import type { ProviderError, StreamChunk } from './provider';

// Generation status
export type GenerationStatus =
  | 'pending'
  | 'validating'
  | 'preparing'
  | 'executing'
  | 'streaming'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Generation request input
export interface GenerationRequest {
  id: UUID;
  projectId?: UUID;
  type: ContentType;

  // Provider selection
  providerId?: UUID;
  providerType?: ProviderType;
  model?: string;

  // Prompt source (one of these)
  promptTemplateId?: UUID;
  promptVersionId?: UUID;
  promptLabel?: string;
  customPrompt?: string;

  // Brand and variables
  brandId?: UUID;
  variables?: Record<string, string | number | boolean>;

  // Generation parameters
  parameters?: GenerationParameters;

  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}

// Type-specific generation parameters
export interface GenerationParameters {
  // Text parameters
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;

  // Image parameters
  width?: number;
  height?: number;
  seed?: number;
  negativePrompt?: string;
  guidanceScale?: number;
  numVariants?: number;

  // Video parameters
  duration?: number;
  aspectRatio?: string;
  fps?: number;

  // Common
  style?: string;
}

// Generation record stored in database
export interface GenerationRecord extends BaseEntity {
  requestId: UUID;
  status: GenerationStatus;

  // Provider info
  providerId: UUID;
  providerType: ProviderType;
  model: string;

  // Content type
  type: ContentType;

  // Prompt lineage
  promptTemplateId?: UUID;
  promptVersionId?: UUID;
  brandId?: UUID;
  renderedPrompt: string;
  variablesUsed?: Record<string, string | number | boolean>;

  // Generation parameters used
  parametersUsed: GenerationParameters;

  // Usage and cost
  inputTokens?: number;
  outputTokens?: number;
  costEstimateUsd?: number;

  // Result
  result?: GenerationResult;
  error?: ProviderError;

  // Timing
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  durationMs?: number;

  // Provider reference
  providerRequestId?: string;
}

// Generation result based on content type
export interface GenerationResult {
  type: ContentType;

  // Text result
  textContent?: string;

  // Image/Video result
  assetIds?: UUID[];
  urls?: string[];

  // Additional metadata from provider
  metadata?: Record<string, unknown>;
}

// Generation workflow context for XState
export interface GenerationWorkflowContext {
  requestId: UUID;
  request: GenerationRequest;
  status: GenerationStatus;
  progress: number; // 0-100

  // Streaming state
  streamedContent: string;
  streamChunks: StreamChunk[];

  // Result
  result?: GenerationResult;
  error?: ProviderError;

  // Timing
  startedAt?: Timestamp;
}

// Generation history query options
export interface GenerationHistoryQuery {
  projectId?: UUID;
  type?: ContentType;
  providerId?: UUID;
  status?: GenerationStatus;
  promptTemplateId?: UUID;
  brandId?: UUID;
  fromDate?: Timestamp;
  toDate?: Timestamp;
  limit?: number;
  offset?: number;
}

// Generation statistics
export interface GenerationStats {
  totalGenerations: number;
  byType: Record<ContentType, number>;
  byProvider: Record<ProviderType, number>;
  byStatus: Record<GenerationStatus, number>;
  totalCostUsd: number;
  averageDurationMs: number;
}

// Active generation for UI display
export interface ActiveGeneration {
  id: UUID;
  type: ContentType;
  status: GenerationStatus;
  progress: number;
  streamedContent?: string;
  startedAt: Timestamp;
  canCancel: boolean;
}
