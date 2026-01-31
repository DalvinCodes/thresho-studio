/**
 * Provider types for multi-provider AI orchestration
 */

import type { UUID, Timestamp, ProviderType, ContentType, BaseEntity } from './common';

// Provider capability definition
export interface ProviderCapability {
  type: ContentType;
  models: string[];
  maxTokens?: number;
  maxResolution?: string;
  supportsStreaming: boolean;
  supportsBatching: boolean;
  supportsAsyncJobs: boolean;
  costPerUnit?: number; // Per 1M tokens for text, per image, per second for video
  rateLimitPerMinute?: number;
}

// Provider configuration stored in database
export interface ProviderConfig extends BaseEntity {
  type: ProviderType;
  name: string;
  displayName: string;
  description: string;
  apiBaseUrl?: string;
  capabilities: ProviderCapability[];
  isActive: boolean;
  isDefault: boolean;
  metadata?: Record<string, unknown>;
}

// Provider credential (encrypted in storage)
export interface ProviderCredential {
  id: UUID;
  providerId: UUID;
  apiKey: string; // Encrypted when stored
  organizationId?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Timestamp;
  lastValidated?: Timestamp;
  createdAt: Timestamp;
}

// Provider status for UI display
export type ProviderStatus = 'active' | 'inactive' | 'error' | 'rate-limited' | 'validating';

export interface ProviderState {
  config: ProviderConfig;
  credential?: ProviderCredential;
  status: ProviderStatus;
  lastError?: ProviderError;
  usageThisMonth?: ProviderUsage;
}

// Provider error structure
export interface ProviderError {
  code: string;
  message: string;
  retryable: boolean;
  statusCode?: number;
  retryAfterMs?: number;
  raw?: unknown;
}

// Provider usage tracking
export interface ProviderUsage {
  providerId: UUID;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  textTokensIn: number;
  textTokensOut: number;
  imagesGenerated: number;
  videoSecondsGenerated: number;
  estimatedCostUsd: number;
}

// Request/Response types for adapters
export interface TextGenerationRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface TextGenerationResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  providerRequestId?: string;
}

export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  guidanceScale?: number;
  numImages?: number;
  style?: string;
}

export interface ImageGenerationResponse {
  images: Array<{
    url: string;
    base64?: string;
    revisedPrompt?: string;
  }>;
  model: string;
  providerRequestId?: string;
}

export interface VideoGenerationRequest {
  model: string;
  prompt: string;
  imageUrl?: string; // For image-to-video
  duration?: number;
  aspectRatio?: string;
  seed?: number;
}

export interface VideoGenerationJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  estimatedTimeRemainingMs?: number;
  resultUrl?: string;
  error?: ProviderError;
}

// Stream chunk types
export interface StreamChunk {
  type: 'token' | 'metadata' | 'complete' | 'error';
  content?: string;
  metadata?: Record<string, unknown>;
  error?: ProviderError;
}
