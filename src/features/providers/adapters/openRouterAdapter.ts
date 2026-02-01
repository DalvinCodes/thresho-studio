/**
 * OpenRouter Adapter
 * Unified API for multiple AI providers through OpenRouter
 * Supports text and image generation with model selection per content type
 * Note: OpenRouter supports video INPUT for analysis, but not video OUTPUT/generation
 */

import { BaseAdapter } from './baseAdapter';
import type {
  ProviderConfig,
  ProviderCredential,
  ProviderCapability,
  TextGenerationRequest,
  TextGenerationResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  StreamChunk,
} from '../../../core/types/provider';
import type { ProviderType, ContentType } from '../../../core/types/common';

export interface OpenRouterAPIModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    request?: string;
  };
  context_length: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
    instruct_type?: string | null;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: {
    prompt_tokens?: string;
    completion_tokens?: string;
  } | null;
  supported_parameters?: string[];
}

export class OpenRouterAdapter extends BaseAdapter {
  private baseUrl = 'https://openrouter.ai/api/v1';
  private selectedModels: Record<ContentType, string> = {
    text: 'openai/gpt-4o',
    image: '',
    video: '', // Not used - OpenRouter doesn't support video generation
  };

  constructor(config: ProviderConfig, credential?: ProviderCredential) {
    super(config, credential);
    // Load selected models from config if available
    if (config.metadata?.models) {
      this.selectedModels = {
        ...this.selectedModels,
        ...config.metadata.models as Record<ContentType, string>,
      };
    }
  }

  get providerType(): ProviderType {
    return 'openrouter';
  }

  get displayName(): string {
    return 'OpenRouter';
  }

  get description(): string {
    return 'Access 100+ AI models with one API key. Choose from OpenAI, Anthropic, Google, and more.';
  }

  getCapabilities(): ProviderCapability[] {
    // OpenRouter supports text and image generation through various models
    // Video GENERATION is not supported (only video INPUT for analysis)
    // The actual available models are fetched dynamically from the API
    return [
      {
        type: 'text' as ContentType,
        models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro'],
        supportsStreaming: true,
        supportsBatching: false,
        supportsAsyncJobs: false,
      },
      {
        type: 'image' as ContentType,
        models: ['black-forest-labs/flux-1.1-pro', 'google/gemini-2.5-flash-image-preview'],
        supportsStreaming: false,
        supportsBatching: false,
        supportsAsyncJobs: false,
      },
      // Note: OpenRouter does NOT support video generation (output)
      // It only supports video input for analysis with compatible models
    ];
  }

  private isTextModel(model: OpenRouterAPIModel): boolean {
    // Most models on OpenRouter are text models
    // Check if it's NOT an image/video specific model
    const id = model.id.toLowerCase();
    return !id.includes('dall-e') && 
           !id.includes('imagen') && 
           !id.includes('flux') &&
           !id.includes('video') &&
           !id.includes('veo') &&
           !id.includes('runway');
  }

  private isImageModel(model: OpenRouterAPIModel): boolean {
    const id = model.id.toLowerCase();
    return id.includes('dall-e') || 
           id.includes('imagen') || 
           id.includes('flux') ||
           id.includes('stable') ||
           id.includes('midjourney');
  }

  getSelectedModel(type: ContentType): string {
    return this.selectedModels[type];
  }

  setSelectedModel(type: ContentType, modelId: string): void {
    this.selectedModels[type] = modelId;
    // Update config metadata
    this.config.metadata = {
      ...this.config.metadata,
      models: this.selectedModels,
    };
  }

  getAvailableModels(): OpenRouterAPIModel[] {
    // Return cached models from store or empty array
    return [];
  }

  async fetchAvailableModels(): Promise<OpenRouterAPIModel[]> {
    if (!this.credential?.apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.credential.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Thresho Studio',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.credential?.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.credential.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Thresho Studio',
        },
      });

      return response.status === 200;
    } catch {
      return false;
    }
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (!this.credential?.apiKey) {
      throw this.createError('MISSING_CREDENTIALS', 'OpenRouter API key is required', false);
    }

    const modelId = this.selectedModels.text || 'openai/gpt-4o';

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.credential.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Thresho Studio',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
            { role: 'user', content: request.userPrompt },
          ],
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 2000,
          top_p: request.topP ?? 1,
          ...(request.stopSequences && { stop: request.stopSequences }),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw this.createError(
          'GENERATION_ERROR',
          error.error?.message || `HTTP ${response.status}`,
          response.status >= 500,
          response.status
        );
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model || modelId,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        finishReason: data.choices[0]?.finish_reason || 'stop',
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      throw this.handleApiError(error);
    }
  }

  async *streamText(request: TextGenerationRequest): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.credential?.apiKey) {
      throw this.createError('MISSING_CREDENTIALS', 'OpenRouter API key is required', false);
    }

    const modelId = this.selectedModels.text || 'openai/gpt-4o';

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.credential.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Thresho Studio',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
            { role: 'user', content: request.userPrompt },
          ],
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 2000,
          top_p: request.topP ?? 1,
          stream: true,
          ...(request.stopSequences && { stop: request.stopSequences }),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw this.createError(
          'GENERATION_ERROR',
          error.error?.message || `HTTP ${response.status}`,
          response.status >= 500,
          response.status
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw this.createError('STREAM_ERROR', 'Failed to get stream reader', true);
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
                const delta = parsed.choices[0]?.delta;
                
                if (delta?.content) {
                  yield { type: 'token', content: delta.content };
                }
              } catch {
                // Ignore parse errors for malformed chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      yield { type: 'complete' };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      throw this.handleApiError(error);
    }
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.credential?.apiKey) {
      throw this.createError('MISSING_CREDENTIALS', 'OpenRouter API key is required', false);
    }

    const modelId = this.selectedModels.image;
    if (!modelId) {
      throw this.createError('NO_IMAGE_MODEL', 'No image model selected. Please configure an image model in settings.', false);
    }

    try {
      // OpenRouter uses chat completions API with modalities parameter for image generation
      const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.credential.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Thresho Studio',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'user', content: request.prompt },
          ],
          modalities: ['image', 'text'],
          // Optional: image configuration for supported models (e.g., Gemini)
          ...(request.width && request.height && {
            image_config: {
              aspect_ratio: this.getAspectRatio(request.width, request.height),
            },
          }),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw this.createError(
          'GENERATION_ERROR',
          error.error?.message || `HTTP ${response.status}`,
          response.status >= 500,
          response.status
        );
      }

      const data = await response.json();
      
      // OpenRouter returns images in the message.images array
      const message = data.choices?.[0]?.message;
      const images: Array<{ url: string; base64?: string; revisedPrompt?: string }> = [];
      
      if (message?.images && Array.isArray(message.images)) {
        for (const img of message.images) {
          // OpenRouter returns images as { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
          const imageUrl = img.image_url?.url || img.imageUrl?.url || img.url;
          if (imageUrl) {
            images.push({
              url: imageUrl,
              // If it's a base64 data URL, extract the base64 portion
              base64: imageUrl.startsWith('data:') ? imageUrl.split(',')[1] : undefined,
            });
          }
        }
      }

      if (images.length === 0) {
        throw this.createError(
          'NO_IMAGES_RETURNED',
          'The model did not return any images. The model may not support image generation or the prompt was rejected.',
          false
        );
      }

      return {
        images,
        model: data.model || modelId,
        providerRequestId: data.id,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      throw this.handleApiError(error);
    }
  }

  // Helper to convert width/height to aspect ratio string
  private getAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    const w = width / divisor;
    const h = height / divisor;
    
    // Map to supported OpenRouter aspect ratios
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    if (Math.abs(ratio - 16/9) < 0.1) return '16:9';
    if (Math.abs(ratio - 9/16) < 0.1) return '9:16';
    if (Math.abs(ratio - 4/3) < 0.1) return '4:3';
    if (Math.abs(ratio - 3/4) < 0.1) return '3:4';
    if (Math.abs(ratio - 3/2) < 0.1) return '3:2';
    if (Math.abs(ratio - 2/3) < 0.1) return '2:3';
    
    return `${w}:${h}`;
  }

  estimateCost(type: ContentType, params: { inputTokens?: number; outputTokens?: number }): number {
    // OpenRouter pricing varies by model
    // This is a rough estimate - actual pricing depends on the selected model
    if (type === 'text') {
      const promptTokens = params.inputTokens || 0;
      const completionTokens = params.outputTokens || 0;
      // Average cost across models (varies widely)
      const promptCost = (promptTokens / 1000000) * 2.5; // $2.50 per 1M tokens avg
      const completionCost = (completionTokens / 1000000) * 7.5; // $7.50 per 1M tokens avg
      return promptCost + completionCost;
    }
    return 0;
  }
}
