/**
 * Google Gemini Provider Adapter
 * Supports: Gemini 3 Pro/Flash, Gemini 2.5 Pro/Flash, Gemini 2.0 Flash
 * Capabilities: Text generation, reasoning, image generation (via Gemini Image models)
 * 
 * Model families:
 * - Gemini 3 Pro/Flash: Latest models with advanced reasoning
 * - Gemini 2.5 Pro: High-capability reasoning and coding
 * - Gemini 2.5 Flash: Fast, controllable thinking
 * - Gemini 2.5 Flash Image: Image generation with conversational editing
 * - Gemini 2.0 Flash: Multimodal performance
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

// Text-focused models
const TEXT_MODELS = [
  'gemini-2.5-pro-preview-06-05',
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-flash-lite-preview-06-17',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  // Preview models
  'gemini-3.0-pro-preview',
  'gemini-3.0-flash-preview',
];

// Image generation models (native image output)
// Per docs: gemini-2.5-flash-image and gemini-3-pro-image-preview
const IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
];

export class GeminiAdapter extends BaseAdapter {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  get providerType() {
    return 'gemini' as const;
  }

  get displayName() {
    return 'Google Gemini';
  }

  get description() {
    return 'Gemini models for text, vision, reasoning, and image generation';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'text',
        models: TEXT_MODELS,
        maxTokens: 1000000, // 1M context window for 2.5 Pro
        supportsStreaming: true,
        supportsBatching: true,
        supportsAsyncJobs: false,
        costPerUnit: 1.25, // $1.25 per 1M input tokens for Flash
        rateLimitPerMinute: 1000,
      },
      {
        type: 'image',
        models: IMAGE_MODELS,
        maxResolution: '1024x1024',
        supportsStreaming: false,
        supportsBatching: false,
        supportsAsyncJobs: false,
        costPerUnit: 0.04, // Approximate cost per image
        rateLimitPerMinute: 60,
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

    const model = request.model || 'gemini-2.5-flash-preview-05-20';
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

    const model = request.model || 'gemini-2.5-flash-preview-05-20';
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

  /**
   * Generate images using Gemini's native image generation models
   * Uses Gemini 2.5 Flash Image or Gemini 3 Pro Image Preview
   * 
   * API structure per docs:
   * - Model names: gemini-2.5-flash-image, gemini-3-pro-image-preview
   * - Uses imageConfig inside generationConfig (not responseModalities)
   * - Supports aspectRatio and imageSize parameters
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Gemini API key not configured', false);
    }

    // Use appropriate image model
    const model = request.model || 'gemini-2.5-flash-image';
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.credential!.apiKey}`;

    // Map dimensions to aspect ratio
    const aspectRatio = this.getAspectRatio(request.width, request.height);

    // Gemini image generation uses imageConfig inside generationConfig
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: request.prompt }],
          },
        ],
        generationConfig: {
          imageConfig: {
            aspectRatio,
            // imageSize only available for gemini-3-pro-image-preview
            ...(model === 'gemini-3-pro-image-preview' && { imageSize: '1K' }),
          },
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
    const images: { url: string; base64?: string }[] = [];

    // Extract images from response
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        const base64 = part.inlineData.data;
        images.push({
          base64,
          url: `data:${part.inlineData.mimeType};base64,${base64}`,
        });
      }
    }

    if (images.length === 0) {
      throw this.createError('GENERATION_FAILED', 'No images generated', true);
    }

    return {
      images,
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
      // Gemini 2.5 Flash pricing: $0.075/1M input, $0.30/1M output
      const inputCost = ((params.inputTokens ?? 0) / 1_000_000) * 0.075;
      const outputCost = ((params.outputTokens ?? 0) / 1_000_000) * 0.30;
      return inputCost + outputCost;
    }

    if (type === 'image') {
      // Approximate Gemini image generation cost
      return (params.imageCount ?? 1) * 0.04;
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

  /**
   * Convert width/height to supported Gemini aspect ratio
   * Supported: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
   */
  private getAspectRatio(width?: number, height?: number): string {
    if (!width || !height) return '1:1';

    const ratio = width / height;

    // Match closest supported aspect ratio
    if (ratio > 2.2) return '21:9';
    if (ratio > 1.6) return '16:9';
    if (ratio > 1.4) return '3:2';
    if (ratio > 1.2) return '4:3';
    if (ratio > 1.1) return '5:4';
    if (ratio > 0.9) return '1:1';
    if (ratio > 0.8) return '4:5';
    if (ratio > 0.7) return '3:4';
    if (ratio > 0.6) return '2:3';
    return '9:16';
  }
}
