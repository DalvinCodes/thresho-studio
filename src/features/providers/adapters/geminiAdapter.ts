/**
 * Google Gemini Provider Adapter
 * Supports: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash (text/multimodal)
 */

import { BaseAdapter } from './baseAdapter';
import type { ProviderCapability } from '../../../core/types/provider';
import type {
  TextGenerationRequest,
  TextGenerationResponse,
  StreamChunk,
} from '../../../core/types/provider';
import type { ContentType } from '../../../core/types/common';

export class GeminiAdapter extends BaseAdapter {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  get providerType() {
    return 'gemini' as const;
  }

  get displayName() {
    return 'Google Gemini';
  }

  get description() {
    return 'Gemini models for text, vision, and multimodal understanding';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'text',
        models: [
          'gemini-2.0-flash-exp',
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-1.5-flash-8b',
        ],
        maxTokens: 2000000, // 2M context window for 1.5 Pro
        supportsStreaming: true,
        supportsBatching: true,
        supportsAsyncJobs: false,
        costPerUnit: 1.25, // $1.25 per 1M input tokens for Flash
        rateLimitPerMinute: 1000,
      },
    ];
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.credential?.apiKey) return false;

    try {
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.credential.apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Gemini API key not configured', false);
    }

    const model = request.model || 'gemini-2.0-flash-exp';
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.credential!.apiKey}`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: request.userPrompt }],
          },
        ],
        systemInstruction: request.systemPrompt
          ? { parts: [{ text: request.systemPrompt }] }
          : undefined,
        generationConfig: {
          maxOutputTokens: request.maxTokens,
          temperature: request.temperature,
          topP: request.topP,
          stopSequences: request.stopSequences,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleApiError(
        new Error(error.error?.message || `HTTP ${response.status}`)
      );
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '';

    return {
      content,
      model,
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      finishReason: this.mapFinishReason(candidate?.finishReason),
    };
  }

  async *streamText(
    request: TextGenerationRequest
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Gemini API key not configured', false);
    }

    const model = request.model || 'gemini-2.0-flash-exp';
    const url = `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.credential!.apiKey}&alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: request.userPrompt }],
          },
        ],
        systemInstruction: request.systemPrompt
          ? { parts: [{ text: request.systemPrompt }] }
          : undefined,
        generationConfig: {
          maxOutputTokens: request.maxTokens,
          temperature: request.temperature,
          topP: request.topP,
          stopSequences: request.stopSequences,
        },
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
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;

              if (text) {
                yield { type: 'token', content: text };
              }

              if (parsed.candidates?.[0]?.finishReason) {
                yield {
                  type: 'metadata',
                  metadata: {
                    finishReason: parsed.candidates[0].finishReason,
                    usage: parsed.usageMetadata,
                  },
                };
              }
            } catch {
              // Ignore parse errors
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
      // Gemini Flash pricing: $0.075/1M input, $0.30/1M output
      const inputCost = ((params.inputTokens ?? 0) / 1_000_000) * 0.075;
      const outputCost = ((params.outputTokens ?? 0) / 1_000_000) * 0.30;
      return inputCost + outputCost;
    }

    return 0;
  }

  private mapFinishReason(
    reason?: string
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
        return 'content_filter';
      default:
        return 'error';
    }
  }
}
