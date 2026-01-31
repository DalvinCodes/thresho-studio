/**
 * OpenAI Provider Adapter
 * Supports: GPT-4, GPT-4 Turbo, GPT-3.5-Turbo (text), DALL-E 3 (images)
 */

import { BaseAdapter } from './baseAdapter';
import type { ProviderCapability } from '../../../core/types/provider';
import type {
  TextGenerationRequest,
  TextGenerationResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  StreamChunk,
} from '../../../core/types/provider';
import type { ContentType } from '../../../core/types/common';

export class OpenAIAdapter extends BaseAdapter {
  private baseUrl = 'https://api.openai.com/v1';

  get providerType() {
    return 'openai' as const;
  }

  get displayName() {
    return 'OpenAI';
  }

  get description() {
    return 'GPT-4 for text generation and DALL-E 3 for image creation';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'text',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
        maxTokens: 128000,
        supportsStreaming: true,
        supportsBatching: true,
        supportsAsyncJobs: false,
        costPerUnit: 5.0, // $5 per 1M input tokens for GPT-4o
        rateLimitPerMinute: 500,
      },
      {
        type: 'image',
        models: ['dall-e-3', 'dall-e-2'],
        maxResolution: '1792x1024',
        supportsStreaming: false,
        supportsBatching: false,
        supportsAsyncJobs: false,
        costPerUnit: 0.04, // $0.04 per image for DALL-E 3 standard
        rateLimitPerMinute: 50,
      },
    ];
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.credential?.apiKey) return false;

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getAuthHeader(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'OpenAI API key not configured', false);
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({
        model: request.model || 'gpt-4o',
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
      throw this.createError('NO_CREDENTIALS', 'OpenAI API key not configured', false);
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({
        model: request.model || 'gpt-4o',
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

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'OpenAI API key not configured', false);
    }

    const model = request.model || 'dall-e-3';
    const size = this.mapSize(request.width, request.height, model);

    const response = await this.fetchWithRetry(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        n: model === 'dall-e-3' ? 1 : (request.numImages || 1),
        size,
        quality: 'standard',
        style: request.style || 'vivid',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleApiError(new Error(error.error?.message || `HTTP ${response.status}`));
    }

    const data = await response.json();

    return {
      images: data.data.map((img: { url: string; revised_prompt?: string }) => ({
        url: img.url,
        revisedPrompt: img.revised_prompt,
      })),
      model,
    };
  }

  estimateCost(
    type: ContentType,
    params: {
      inputTokens?: number;
      outputTokens?: number;
      imageCount?: number;
    }
  ): number {
    if (type === 'text') {
      // GPT-4o pricing: $5/1M input, $15/1M output
      const inputCost = ((params.inputTokens ?? 0) / 1_000_000) * 5;
      const outputCost = ((params.outputTokens ?? 0) / 1_000_000) * 15;
      return inputCost + outputCost;
    }

    if (type === 'image') {
      // DALL-E 3 standard: $0.04 per image
      return (params.imageCount ?? 1) * 0.04;
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

  private mapSize(
    width?: number,
    height?: number,
    model?: string
  ): string {
    if (model === 'dall-e-2') {
      if (width && width <= 256) return '256x256';
      if (width && width <= 512) return '512x512';
      return '1024x1024';
    }

    // DALL-E 3 sizes
    if (width && height) {
      if (width > height) return '1792x1024';
      if (height > width) return '1024x1792';
    }
    return '1024x1024';
  }
}
