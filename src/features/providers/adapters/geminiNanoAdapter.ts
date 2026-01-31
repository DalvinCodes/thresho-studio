/**
 * Gemini Nano Provider Adapter
 * Uses Chrome's built-in AI (window.ai) - no API key required
 * https://developer.chrome.com/docs/ai/built-in
 */

import { BaseAdapter } from './baseAdapter';
import type { ProviderCapability, ProviderConfig, ProviderCredential } from '../../../core/types/provider';
import type {
  TextGenerationRequest,
  TextGenerationResponse,
  StreamChunk,
} from '../../../core/types/provider';
import type { ContentType } from '../../../core/types/common';

// Chrome AI types (experimental API)
interface AILanguageModel {
  prompt(input: string): Promise<string>;
  promptStreaming(input: string): AsyncIterable<string>;
  countPromptTokens(input: string): Promise<number>;
  destroy(): void;
}

interface AILanguageModelFactory {
  create(options?: { systemPrompt?: string; temperature?: number; topK?: number }): Promise<AILanguageModel>;
  capabilities(): Promise<{ available: 'no' | 'readily' | 'after-download' }>;
}

declare global {
  interface Window {
    ai?: {
      languageModel?: AILanguageModelFactory;
    };
  }
}

export class GeminiNanoAdapter extends BaseAdapter {
  private session: AILanguageModel | null = null;

  constructor(config: ProviderConfig, credential?: ProviderCredential) {
    super(config, credential);
  }

  get providerType() {
    return 'gemini-nano' as const;
  }

  get displayName() {
    return 'Gemini Nano (Local)';
  }

  get description() {
    return 'Chrome built-in AI - runs locally, no API key needed';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'text',
        models: ['gemini-nano'],
        maxTokens: 4096, // Smaller context for on-device
        supportsStreaming: true,
        supportsBatching: false,
        supportsAsyncJobs: false,
        costPerUnit: 0, // Free - runs locally
        rateLimitPerMinute: undefined, // No rate limit
      },
    ];
  }

  /**
   * Check if Chrome AI is available
   */
  static async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!window.ai?.languageModel) return false;

    try {
      const capabilities = await window.ai.languageModel.capabilities();
      return capabilities.available !== 'no';
    } catch {
      return false;
    }
  }

  /**
   * Check availability status
   */
  static async getAvailabilityStatus(): Promise<'no' | 'readily' | 'after-download'> {
    if (typeof window === 'undefined') return 'no';
    if (!window.ai?.languageModel) return 'no';

    try {
      const capabilities = await window.ai.languageModel.capabilities();
      return capabilities.available;
    } catch {
      return 'no';
    }
  }

  async validateCredentials(): Promise<boolean> {
    // No credentials needed - check if Chrome AI is available
    return GeminiNanoAdapter.isAvailable();
  }

  hasCredentials(): boolean {
    // Always return true - no credentials needed
    return true;
  }

  private async getSession(systemPrompt?: string, temperature?: number): Promise<AILanguageModel> {
    if (!window.ai?.languageModel) {
      throw this.createError(
        'NOT_AVAILABLE',
        'Chrome AI is not available. Please use Chrome 127+ with AI features enabled.',
        false
      );
    }

    // Create new session if needed
    if (!this.session) {
      this.session = await window.ai.languageModel.create({
        systemPrompt,
        temperature,
      });
    }

    return this.session;
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    const session = await this.getSession(request.systemPrompt, request.temperature);

    try {
      const inputTokens = await session.countPromptTokens(request.userPrompt);
      const content = await session.prompt(request.userPrompt);
      const outputTokens = await session.countPromptTokens(content);

      return {
        content,
        model: 'gemini-nano',
        inputTokens,
        outputTokens,
        finishReason: 'stop',
      };
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  async *streamText(
    request: TextGenerationRequest
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const session = await this.getSession(request.systemPrompt, request.temperature);

    try {
      const stream = session.promptStreaming(request.userPrompt);

      let previousText = '';
      for await (const chunk of stream) {
        // Chrome AI returns cumulative text, so extract the delta
        const newText = chunk.slice(previousText.length);
        previousText = chunk;

        if (newText) {
          yield { type: 'token', content: newText };
        }
      }

      yield { type: 'complete' };
    } catch (error) {
      yield {
        type: 'error',
        error: this.handleApiError(error),
      };
    }
  }

  estimateCost(
    _type: ContentType,
    _params: {
      inputTokens?: number;
      outputTokens?: number;
    }
  ): number {
    // Gemini Nano is free - runs locally
    return 0;
  }

  /**
   * Clean up the session when done
   */
  destroy(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
  }
}
