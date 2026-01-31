/**
 * Flux Pro Provider Adapter (Black Forest Labs)
 * Supports: Flux Pro, Flux Dev, Flux Schnell (images)
 * API Docs: https://docs.bfl.ml/
 */

import { BaseAdapter } from './baseAdapter';
import type { ProviderCapability } from '../../../core/types/provider';
import type {
  ImageGenerationRequest,
  ImageGenerationResponse,
} from '../../../core/types/provider';
import type { ContentType } from '../../../core/types/common';

export class FluxProAdapter extends BaseAdapter {
  private baseUrl = 'https://api.bfl.ml/v1';

  get providerType() {
    return 'flux-pro' as const;
  }

  get displayName() {
    return 'Flux Pro';
  }

  get description() {
    return 'High-quality image generation with excellent text rendering';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'image',
        models: ['flux-pro-1.1', 'flux-pro', 'flux-dev', 'flux-schnell'],
        maxResolution: '2048x2048',
        supportsStreaming: false,
        supportsBatching: false,
        supportsAsyncJobs: true, // Uses async polling
        costPerUnit: 0.04, // ~$0.04 per image for Pro
        rateLimitPerMinute: 100,
      },
    ];
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.credential?.apiKey) return false;

    try {
      // BFL doesn't have a dedicated validation endpoint, so we check account
      const response = await fetch(`${this.baseUrl}/get_result`, {
        method: 'GET',
        headers: this.getAuthHeader(),
      });
      // Even a 400 means the API key format is valid
      return response.status !== 401 && response.status !== 403;
    } catch {
      return false;
    }
  }

  protected getAuthHeader(): Record<string, string> {
    if (!this.credential?.apiKey) {
      return {};
    }
    return {
      'X-Key': this.credential.apiKey,
    };
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Flux API key not configured', false);
    }

    const model = request.model || 'flux-pro-1.1';
    const endpoint = this.getEndpointForModel(model);

    // Step 1: Submit generation request
    const submitResponse = await this.fetchWithRetry(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({
        prompt: request.prompt,
        width: request.width || 1024,
        height: request.height || 1024,
        seed: request.seed,
        guidance: request.guidanceScale || 3.5,
        safety_tolerance: 2,
        output_format: 'jpeg',
      }),
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.json().catch(() => ({}));
      throw this.handleApiError(new Error(error.message || `HTTP ${submitResponse.status}`));
    }

    const submitData = await submitResponse.json();
    const taskId = submitData.id;

    if (!taskId) {
      throw this.createError('INVALID_RESPONSE', 'No task ID received', false);
    }

    // Step 2: Poll for result
    const result = await this.pollForResult(taskId);

    return {
      images: [
        {
          url: result.sample,
          revisedPrompt: request.prompt,
        },
      ],
      model,
      providerRequestId: taskId,
    };
  }

  private async pollForResult(
    taskId: string,
    maxAttempts = 60,
    intervalMs = 2000
  ): Promise<{ sample: string }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/get_result?id=${taskId}`, {
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        throw this.handleApiError(new Error(`HTTP ${response.status}`));
      }

      const data = await response.json();

      if (data.status === 'Ready') {
        return { sample: data.result.sample };
      }

      if (data.status === 'Error') {
        throw this.createError(
          'GENERATION_FAILED',
          data.error || 'Image generation failed',
          false
        );
      }

      // Status is 'Pending' or 'Processing' - wait and retry
      await this.sleep(intervalMs);
    }

    throw this.createError('TIMEOUT', 'Image generation timed out', true);
  }

  private getEndpointForModel(model: string): string {
    switch (model) {
      case 'flux-pro-1.1':
        return 'flux-pro-1.1';
      case 'flux-pro':
        return 'flux-pro';
      case 'flux-dev':
        return 'flux-dev';
      case 'flux-schnell':
        return 'flux-schnell';
      default:
        return 'flux-pro-1.1';
    }
  }

  estimateCost(
    type: ContentType,
    params: {
      imageCount?: number;
    }
  ): number {
    if (type === 'image') {
      // Flux Pro: ~$0.04 per image
      return (params.imageCount ?? 1) * 0.04;
    }

    return 0;
  }
}
