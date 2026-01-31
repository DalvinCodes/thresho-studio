/**
 * Google Imagen 3 Provider Adapter
 * Access via Vertex AI or AI Studio API
 * https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images
 */

import { BaseAdapter } from './baseAdapter';
import type { ProviderCapability } from '../../../core/types/provider';
import type {
  ImageGenerationRequest,
  ImageGenerationResponse,
} from '../../../core/types/provider';
import type { ContentType } from '../../../core/types/common';

export class ImagenAdapter extends BaseAdapter {
  // Using AI Studio endpoint (simpler auth than Vertex AI)
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  get providerType() {
    return 'imagen' as const;
  }

  get displayName() {
    return 'Google Imagen 3';
  }

  get description() {
    return 'High-quality photorealistic image generation from Google';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'image',
        models: ['imagen-3.0-generate-001', 'imagen-3.0-fast-generate-001'],
        maxResolution: '2048x2048',
        supportsStreaming: false,
        supportsBatching: true,
        supportsAsyncJobs: false,
        costPerUnit: 0.03, // ~$0.03 per image
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

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Google API key not configured', false);
    }

    const model = request.model || 'imagen-3.0-generate-001';
    const url = `${this.baseUrl}/models/${model}:predict?key=${this.credential!.apiKey}`;

    // Map dimensions to aspect ratio
    const aspectRatio = this.getAspectRatio(request.width, request.height);

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: request.prompt,
          },
        ],
        parameters: {
          sampleCount: request.numImages || 1,
          aspectRatio,
          negativePrompt: request.negativePrompt,
          seed: request.seed,
          // Safety settings
          safetyFilterLevel: 'block_some',
          personGeneration: 'allow_adult',
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

    // Imagen returns base64 encoded images
    const images = data.predictions?.map((pred: { bytesBase64Encoded: string }) => ({
      base64: pred.bytesBase64Encoded,
      url: `data:image/png;base64,${pred.bytesBase64Encoded}`,
    })) || [];

    return {
      images,
      model,
    };
  }

  private getAspectRatio(width?: number, height?: number): string {
    if (!width || !height) return '1:1';

    const ratio = width / height;

    if (ratio > 1.7) return '16:9';
    if (ratio > 1.3) return '4:3';
    if (ratio > 0.9) return '1:1';
    if (ratio > 0.7) return '3:4';
    return '9:16';
  }

  estimateCost(
    type: ContentType,
    params: {
      imageCount?: number;
    }
  ): number {
    if (type === 'image') {
      // Imagen 3: ~$0.03 per image
      return (params.imageCount ?? 1) * 0.03;
    }

    return 0;
  }
}
