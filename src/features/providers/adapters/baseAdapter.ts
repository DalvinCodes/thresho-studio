/**
 * Base adapter class for AI provider implementations
 * All provider adapters extend this class and implement the abstract methods
 */

import type {
  ProviderType,
  ContentType,
} from '../../../core/types/common';
import type {
  ProviderConfig,
  ProviderCredential,
  ProviderCapability,
  ProviderError,
  TextGenerationRequest,
  TextGenerationResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoGenerationRequest,
  VideoGenerationJob,
  StreamChunk,
} from '../../../core/types/provider';

/**
 * Abstract base class for all AI provider adapters
 */
export abstract class BaseAdapter {
  protected config: ProviderConfig;
  protected credential?: ProviderCredential;

  constructor(config: ProviderConfig, credential?: ProviderCredential) {
    this.config = config;
    this.credential = credential;
  }

  // Provider identification
  abstract get providerType(): ProviderType;
  abstract get displayName(): string;
  abstract get description(): string;

  // Capability detection
  abstract getCapabilities(): ProviderCapability[];

  supportsContentType(type: ContentType): boolean {
    return this.getCapabilities().some((cap) => cap.type === type);
  }

  supportsStreaming(): boolean {
    return this.getCapabilities().some((cap) => cap.supportsStreaming);
  }

  supportsAsyncJobs(): boolean {
    return this.getCapabilities().some((cap) => cap.supportsAsyncJobs);
  }

  getModelsForType(type: ContentType): string[] {
    const capability = this.getCapabilities().find((cap) => cap.type === type);
    return capability?.models ?? [];
  }

  // Credential management
  abstract validateCredentials(): Promise<boolean>;

  hasCredentials(): boolean {
    return !!this.credential?.apiKey;
  }

  setCredential(credential: ProviderCredential): void {
    this.credential = credential;
  }

  // Text generation (optional - not all providers support this)
  async generateText(
    _request: TextGenerationRequest
  ): Promise<TextGenerationResponse> {
    throw this.createError(
      'UNSUPPORTED_OPERATION',
      `${this.displayName} does not support text generation`,
      false
    );
  }

  async *streamText(
    _request: TextGenerationRequest
  ): AsyncGenerator<StreamChunk, void, unknown> {
    throw this.createError(
      'UNSUPPORTED_OPERATION',
      `${this.displayName} does not support streaming text generation`,
      false
    );
  }

  // Image generation (optional)
  async generateImage(
    _request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    throw this.createError(
      'UNSUPPORTED_OPERATION',
      `${this.displayName} does not support image generation`,
      false
    );
  }

  // Video generation (optional - async job-based)
  async submitVideoJob(
    _request: VideoGenerationRequest
  ): Promise<VideoGenerationJob> {
    throw this.createError(
      'UNSUPPORTED_OPERATION',
      `${this.displayName} does not support video generation`,
      false
    );
  }

  async getVideoJobStatus(_jobId: string): Promise<VideoGenerationJob> {
    throw this.createError(
      'UNSUPPORTED_OPERATION',
      `${this.displayName} does not support video generation`,
      false
    );
  }

  async cancelVideoJob(_jobId: string): Promise<boolean> {
    throw this.createError(
      'UNSUPPORTED_OPERATION',
      `${this.displayName} does not support video generation`,
      false
    );
  }

  // Cost estimation
  abstract estimateCost(
    type: ContentType,
    params: {
      inputTokens?: number;
      outputTokens?: number;
      imageCount?: number;
      videoSeconds?: number;
    }
  ): number;

  // Error handling
  protected createError(
    code: string,
    message: string,
    retryable: boolean,
    statusCode?: number,
    raw?: unknown
  ): ProviderError {
    return {
      code,
      message,
      retryable,
      statusCode,
      raw,
    };
  }

  protected handleApiError(error: unknown): ProviderError {
    if (error instanceof Error) {
      // Check for common error patterns
      const message = error.message.toLowerCase();

      if (message.includes('rate limit') || message.includes('429')) {
        return this.createError(
          'RATE_LIMITED',
          'Rate limit exceeded. Please try again later.',
          true,
          429
        );
      }

      if (message.includes('unauthorized') || message.includes('401')) {
        return this.createError(
          'UNAUTHORIZED',
          'Invalid API key or unauthorized access.',
          false,
          401
        );
      }

      if (message.includes('forbidden') || message.includes('403')) {
        return this.createError(
          'FORBIDDEN',
          'Access forbidden. Check your API key permissions.',
          false,
          403
        );
      }

      if (message.includes('not found') || message.includes('404')) {
        return this.createError(
          'NOT_FOUND',
          'Resource not found.',
          false,
          404
        );
      }

      if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        return this.createError(
          'TIMEOUT',
          'Request timed out. Please try again.',
          true
        );
      }

      return this.createError('UNKNOWN_ERROR', error.message, true, undefined, error);
    }

    return this.createError(
      'UNKNOWN_ERROR',
      'An unknown error occurred',
      true,
      undefined,
      error
    );
  }

  // Request helpers
  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        // Don't retry on client errors (except rate limiting)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return response;
        }

        // Retry on rate limiting with exponential backoff
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }

        // Retry on server errors
        if (response.status >= 500) {
          await this.sleep(baseDelay * Math.pow(2, attempt));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await this.sleep(baseDelay * Math.pow(2, attempt));
      }
    }

    throw lastError ?? new Error('Max retries exceeded');
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected getAuthHeader(): Record<string, string> {
    if (!this.credential?.apiKey) {
      return {};
    }
    return {
      Authorization: `Bearer ${this.credential.apiKey}`,
    };
  }
}

/**
 * Type for adapter constructor
 */
export type AdapterConstructor = new (
  config: ProviderConfig,
  credential?: ProviderCredential
) => BaseAdapter;
