/**
 * Anthropic Provider Adapter
 * Supports: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku (text)
 */

import { BaseAdapter } from './baseAdapter';
import type { ProviderCapability } from '../../../core/types/provider';
import type {
  TextGenerationRequest,
  TextGenerationResponse,
  StreamChunk,
} from '../../../core/types/provider';
import type { ContentType } from '../../../core/types/common';

export class AnthropicAdapter extends BaseAdapter {
  private baseUrl = 'https://api.anthropic.com/v1';
  private apiVersion = '2023-06-01';

  get providerType() {
    return 'anthropic' as const;
  }

  get displayName() {
    return 'Anthropic';
  }

  get description() {
    return 'Claude models for advanced reasoning and long-context tasks';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'text',
        models: [
          'claude-sonnet-4-20250514',
          'claude-3-5-sonnet-20241022',
          'claude-3-opus-20240229',
          'claude-3-haiku-20240307',
        ],
        maxTokens: 200000, // 200K context window
        supportsStreaming: true,
        supportsBatching: true,
        supportsAsyncJobs: false,
        costPerUnit: 3.0, // $3 per 1M input tokens for Sonnet
        rateLimitPerMinute: 1000,
      },
    ];
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.credential?.apiKey) return false;

    try {
      // Use a minimal request to validate
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.credential.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      return response.ok || response.status === 400; // 400 means API is reachable
    } catch {
      return false;
    }
  }

  protected getAuthHeader(): Record<string, string> {
    if (!this.credential?.apiKey) {
      return {};
    }
    return {
      'x-api-key': this.credential.apiKey,
      'anthropic-version': this.apiVersion,
    };
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Anthropic API key not configured', false);
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({
        model: request.model || 'claude-sonnet-4-20250514',
        max_tokens: request.maxTokens || 4096,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
        temperature: request.temperature,
        top_p: request.topP,
        stop_sequences: request.stopSequences,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleApiError(
        new Error(error.error?.message || `HTTP ${response.status}`)
      );
    }

    const data = await response.json();

    return {
      content: data.content[0]?.text || '',
      model: data.model,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      finishReason: this.mapStopReason(data.stop_reason),
      providerRequestId: data.id,
    };
  }

  async *streamText(
    request: TextGenerationRequest
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Anthropic API key not configured', false);
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({
        model: request.model || 'claude-sonnet-4-20250514',
        max_tokens: request.maxTokens || 4096,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
        temperature: request.temperature,
        top_p: request.topP,
        stop_sequences: request.stopSequences,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      yield {
        type: 'error',
        error: this.handleApiError(
          new Error(error.error?.message || `HTTP ${response.status}`)
        ),
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

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text;
                if (text) {
                  yield { type: 'token', content: text };
                }
              } else if (parsed.type === 'message_stop') {
                yield { type: 'complete' };
                return;
              } else if (parsed.type === 'message_delta') {
                yield {
                  type: 'metadata',
                  metadata: {
                    stopReason: parsed.delta?.stop_reason,
                    usage: parsed.usage,
                  },
                };
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
      // Claude Sonnet pricing: $3/1M input, $15/1M output
      const inputCost = ((params.inputTokens ?? 0) / 1_000_000) * 3;
      const outputCost = ((params.outputTokens ?? 0) / 1_000_000) * 15;
      return inputCost + outputCost;
    }

    return 0;
  }

  private mapStopReason(
    reason: string
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'error';
    }
  }
}
