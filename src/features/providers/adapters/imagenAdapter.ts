/**
 * Google Imagen Provider Adapter
 * Supports: Imagen 4, Imagen 3 for high-quality photorealistic image generation
 * Access via Google AI Studio API (generativelanguage.googleapis.com)
 * 
 * Model families:
 * - Imagen 4: Highest quality, best prompt adherence
 *   - imagen-4.0-generate-001: Standard quality
 *   - imagen-4.0-fast-generate-001: Lower latency
 *   - imagen-4.0-ultra-generate-001: Best quality and prompt adherence
 * - Imagen 3: Production stable
 *   - imagen-3.0-generate-001: Standard
 *   - imagen-3.0-generate-002: Updated
 *   - imagen-3.0-fast-generate-001: Lower latency
 * 
 * https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images
 */

import { BaseAdapter } from './baseAdapter';
import type { ProviderCapability } from '../../../core/types/provider';
import type {
  ImageGenerationRequest,
  ImageGenerationResponse,
} from '../../../core/types/provider';
import type { ContentType } from '../../../core/types/common';

// Imagen 4 models (latest)
const IMAGEN_4_MODELS = [
  'imagen-4.0-generate-001',      // Standard quality
  'imagen-4.0-fast-generate-001', // Lower latency
  'imagen-4.0-ultra-generate-001', // Best quality
];

// Imagen 3 models (stable)
const IMAGEN_3_MODELS = [
  'imagen-3.0-generate-002',      // Updated standard
  'imagen-3.0-generate-001',      // Original standard
  'imagen-3.0-fast-generate-001', // Lower latency
];

const ALL_MODELS = [...IMAGEN_4_MODELS, ...IMAGEN_3_MODELS];

export class ImagenAdapter extends BaseAdapter {
  // Using AI Studio endpoint (simpler auth than Vertex AI)
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  get providerType() {
    return 'imagen' as const;
  }

  get displayName() {
    return 'Google Imagen';
  }

  get description() {
    return 'Imagen 4 & 3 - highest quality photorealistic image generation from Google';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'image',
        models: ALL_MODELS,
        maxResolution: '2048x2048',
        supportsStreaming: false,
        supportsBatching: true,
        supportsAsyncJobs: false,
        costPerUnit: 0.04, // ~$0.04 per image for Imagen 4
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

    // Default to Imagen 4 standard
    const model = request.model || 'imagen-4.0-generate-001';
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
          // imageSize: '1K' or '2K' - supported for Standard and Ultra models
          imageSize: '1K',
          // Person generation policy: dont_allow, allow_adult, allow_all
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

    // Imagen API returns generatedImages array with image.imageBytes
    // Per docs: response.generatedImages[].image.imageBytes (base64)
    const images = data.generatedImages?.map((item: { image: { imageBytes: string; mimeType?: string } }) => ({
      base64: item.image.imageBytes,
      url: `data:${item.image.mimeType || 'image/png'};base64,${item.image.imageBytes}`,
    })) || [];

    if (images.length === 0) {
      throw this.createError('GENERATION_FAILED', 'No images generated', true);
    }

    return {
      images,
      model,
    };
  }

  private getAspectRatio(width?: number, height?: number): string {
    if (!width || !height) return '1:1';

    const ratio = width / height;

    // Supported aspect ratios for Imagen 4
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
      // Imagen 4: ~$0.04 per image (higher quality than Imagen 3)
      return (params.imageCount ?? 1) * 0.04;
    }

    return 0;
  }
}
