/**
 * Runway Gen-4 Provider Adapter
 * Professional video generation with camera control
 * https://docs.runwayml.com/
 */

import { BaseAdapter } from './baseAdapter';
import type { ProviderCapability } from '../../../core/types/provider';
import type {
  VideoGenerationRequest,
  VideoGenerationJob,
} from '../../../core/types/provider';
import type { ContentType } from '../../../core/types/common';

export class RunwayAdapter extends BaseAdapter {
  private baseUrl = 'https://api.runwayml.com/v1';

  get providerType() {
    return 'runway' as const;
  }

  get displayName() {
    return 'Runway Gen-4';
  }

  get description() {
    return 'Professional video generation with motion control and keyframes';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'video',
        models: ['gen4', 'gen3a_turbo'],
        maxResolution: '1920x1080',
        supportsStreaming: false,
        supportsBatching: false,
        supportsAsyncJobs: true,
        costPerUnit: 0.12, // ~$0.12 per second
        rateLimitPerMinute: 10,
      },
    ];
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.credential?.apiKey) return false;

    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'GET',
        headers: this.getAuthHeader(),
      });
      return response.ok || response.status === 404; // 404 is ok, means authenticated
    } catch {
      return false;
    }
  }

  async submitVideoJob(request: VideoGenerationRequest): Promise<VideoGenerationJob> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Runway API key not configured', false);
    }

    const model = request.model || 'gen4';
    const endpoint = request.imageUrl
      ? `${this.baseUrl}/image_to_video`
      : `${this.baseUrl}/text_to_video`;

    const body: Record<string, unknown> = {
      model,
      prompt: request.prompt,
      duration: request.duration || 5,
      ratio: this.mapAspectRatio(request.aspectRatio),
    };

    if (request.imageUrl) {
      body.init_image = request.imageUrl;
    }

    if (request.seed) {
      body.seed = request.seed;
    }

    const response = await this.fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleApiError(
        new Error(error.error?.message || error.message || `HTTP ${response.status}`)
      );
    }

    const data = await response.json();

    return {
      jobId: data.id,
      status: 'queued',
      progress: 0,
    };
  }

  async getVideoJobStatus(jobId: string): Promise<VideoGenerationJob> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Runway API key not configured', false);
    }

    const response = await fetch(`${this.baseUrl}/tasks/${jobId}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleApiError(
        new Error(error.error?.message || `HTTP ${response.status}`)
      );
    }

    const data = await response.json();

    return {
      jobId,
      status: this.mapStatus(data.status),
      progress: data.progress || 0,
      estimatedTimeRemainingMs: data.estimated_time_remaining
        ? data.estimated_time_remaining * 1000
        : undefined,
      resultUrl: data.output?.[0],
      error: data.failure
        ? this.createError('GENERATION_FAILED', data.failure, false)
        : undefined,
    };
  }

  async cancelVideoJob(jobId: string): Promise<boolean> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Runway API key not configured', false);
    }

    const response = await fetch(`${this.baseUrl}/tasks/${jobId}/cancel`, {
      method: 'POST',
      headers: this.getAuthHeader(),
    });

    return response.ok;
  }

  /**
   * Convenience method to generate video and wait for completion
   */
  async generateVideoAndWait(
    request: VideoGenerationRequest,
    onProgress?: (job: VideoGenerationJob) => void,
    timeoutMs = 600000 // 10 minutes
  ): Promise<VideoGenerationJob> {
    const job = await this.submitVideoJob(request);
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getVideoJobStatus(job.jobId);
      onProgress?.(status);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw status.error || this.createError('GENERATION_FAILED', 'Video generation failed', false);
      }

      // Wait before polling again
      await this.sleep(5000);
    }

    throw this.createError('TIMEOUT', 'Video generation timed out', true);
  }

  private mapStatus(status: string): 'queued' | 'processing' | 'completed' | 'failed' {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'queued':
        return 'queued';
      case 'running':
      case 'processing':
        return 'processing';
      case 'succeeded':
      case 'completed':
        return 'completed';
      case 'failed':
      case 'cancelled':
        return 'failed';
      default:
        return 'processing';
    }
  }

  private mapAspectRatio(ratio?: string): string {
    switch (ratio) {
      case '16:9':
        return '16:9';
      case '9:16':
        return '9:16';
      case '4:3':
        return '4:3';
      case '3:4':
        return '3:4';
      case '21:9':
        return '21:9';
      default:
        return '16:9';
    }
  }

  estimateCost(
    type: ContentType,
    params: {
      videoSeconds?: number;
    }
  ): number {
    if (type === 'video') {
      // Runway: ~$0.12 per second
      return (params.videoSeconds ?? 5) * 0.12;
    }

    return 0;
  }
}
