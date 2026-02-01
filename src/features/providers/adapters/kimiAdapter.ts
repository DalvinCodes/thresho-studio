/**
 * Kimi K2.5 Provider Adapter (Moonshot AI via OpenRouter)
 * OpenAI-compatible API with 256K context window
 * Excellent for agent orchestration and long-context tasks
 * Uses OpenRouter infrastructure: https://openrouter.ai
 */

import { BaseAdapter } from './baseAdapter';
import type { ProviderCapability } from '../../../core/types/provider';
import type {
  TextGenerationRequest,
  TextGenerationResponse,
  StreamChunk,
} from '../../../core/types/provider';
import type { ContentType } from '../../../core/types/common';

export class KimiAdapter extends BaseAdapter {
  // Kimi K2.5 uses OpenRouter's API infrastructure
  private baseUrl = 'https://openrouter.ai/api/v1';

  get providerType() {
    return 'kimi' as const;
  }

  get displayName() {
    return 'Kimi K2.5';
  }

  get description() {
    return '256K context window, excellent for long documents and agent orchestration';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'text',
        models: [
          'moonshotai/kimi-k2.5',  // Kimi K2.5 via OpenRouter
        ],
        maxTokens: 256000, // 256K context window
        supportsStreaming: true,
        supportsBatching: true,
        supportsAsyncJobs: false,
        costPerUnit: 0.12, // ~$0.12 per 1M tokens (very affordable)
        rateLimitPerMinute: 100,
      },
    ];
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.credential?.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          ...this.getAuthHeader(),
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Thresho Studio',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Kimi API key not configured', false);
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Thresho Studio',
      },
      body: JSON.stringify({
        model: request.model || 'moonshotai/kimi-k2.5',
        messages: [
          ...(request.systemPrompt
            ? [{ role: 'system', content: request.systemPrompt }]
            : []),
          { role: 'user', content: request.userPrompt },
        ],
        max_tokens: request.maxTokens,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP,
        stop: request.stopSequences,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleApiError(new Error(error.error?.message || `HTTP ${response.status}`));
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      model: data.model,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      finishReason: this.mapFinishReason(choice.finish_reason),
      providerRequestId: data.id,
    };
  }

  async *streamText(
    request: TextGenerationRequest
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Kimi API key not configured', false);
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Thresho Studio',
      },
      body: JSON.stringify({
        model: request.model || 'moonshotai/kimi-k2.5',
        messages: [
          ...(request.systemPrompt
            ? [{ role: 'system', content: request.systemPrompt }]
            : []),
          { role: 'user', content: request.userPrompt },
        ],
        max_tokens: request.maxTokens,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP,
        stop: request.stopSequences,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      yield {
        type: 'error',
        error: this.handleApiError(new Error(error.error?.message || `HTTP ${response.status}`)),
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: this.createError('STREAM_ERROR', 'No response body', false) };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { type: 'complete' };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield { type: 'token', content };
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: 'complete' };
  }

  estimateCost(
    type: ContentType,
    params: {
      inputTokens?: number;
      outputTokens?: number;
    }
  ): number {
    if (type === 'text') {
      // Kimi pricing: ~$0.12/1M input, ~$0.12/1M output (very affordable)
      const inputCost = ((params.inputTokens ?? 0) / 1_000_000) * 0.12;
      const outputCost = ((params.outputTokens ?? 0) / 1_000_000) * 0.12;
      return inputCost + outputCost;
    }

    return 0;
  }

  private mapFinishReason(
    reason: string
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'error';
    }
  }
}
