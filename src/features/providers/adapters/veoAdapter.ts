/**
 * Google Veo Provider Adapter
 * Video generation with native audio via Vertex AI
 * https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos
 */

import { BaseAdapter } from './baseAdapter';
import type { ProviderCapability } from '../../../core/types/provider';
import type {
  VideoGenerationRequest,
  VideoGenerationJob,
} from '../../../core/types/provider';
import type { ContentType } from '../../../core/types/common';

export class VeoAdapter extends BaseAdapter {
  // Using AI Studio endpoint for simpler auth
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  get providerType() {
    return 'veo' as const;
  }

  get displayName() {
    return 'Google Veo 3';
  }

  get description() {
    return 'Video generation with native audio - synchronized sound and music';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'video',
        models: ['veo-3.0', 'veo-2.0'],
        maxResolution: '4K',
        supportsStreaming: false,
        supportsBatching: false,
        supportsAsyncJobs: true,
        costPerUnit: 0.30, // ~$0.30 per second
        rateLimitPerMinute: 5,
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

  async submitVideoJob(request: VideoGenerationRequest): Promise<VideoGenerationJob> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Google API key not configured', false);
    }

    const model = request.model || 'veo-3.0';
    const url = `${this.baseUrl}/models/${model}:generateVideo?key=${this.credential!.apiKey}`;

    const body: Record<string, unknown> = {
      prompt: request.prompt,
      generationConfig: {
        videoDuration: `${request.duration || 8}s`,
        aspectRatio: this.mapAspectRatio(request.aspectRatio),
        numberOfVideos: 1,
        // Veo 3 specific - native audio generation
        generateAudio: true,
      },
    };

    // Image-to-video support
    if (request.imageUrl) {
      body.image = {
        imageUri: request.imageUrl,
      };
    }

    if (request.seed) {
      body.generationConfig = {
        ...(body.generationConfig as Record<string, unknown>),
        seed: request.seed,
      };
    }

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleApiError(
        new Error(error.error?.message || `HTTP ${response.status}`)
      );
    }

    const data = await response.json();

    // Veo returns a long-running operation
    return {
      jobId: data.name, // Operation name
      status: 'queued',
      progress: 0,
    };
  }

  async getVideoJobStatus(jobId: string): Promise<VideoGenerationJob> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Google API key not configured', false);
    }

    // Poll the operation status
    const url = `${this.baseUrl}/${jobId}?key=${this.credential!.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.handleApiError(
        new Error(error.error?.message || `HTTP ${response.status}`)
      );
    }

    const data = await response.json();

    if (data.done) {
      if (data.error) {
        return {
          jobId,
          status: 'failed',
          error: this.createError(
            'GENERATION_FAILED',
            data.error.message || 'Video generation failed',
            false
          ),
        };
      }

      // Extract video URL from response
      const videoUrl = data.response?.generatedVideos?.[0]?.video?.uri;

      return {
        jobId,
        status: 'completed',
        progress: 100,
        resultUrl: videoUrl,
      };
    }

    // Still processing
    const progress = data.metadata?.progress
      ? Math.round(data.metadata.progress * 100)
      : 0;

    return {
      jobId,
      status: 'processing',
      progress,
    };
  }

  async cancelVideoJob(jobId: string): Promise<boolean> {
    if (!this.hasCredentials()) {
      throw this.createError('NO_CREDENTIALS', 'Google API key not configured', false);
    }

    const url = `${this.baseUrl}/${jobId}:cancel?key=${this.credential!.apiKey}`;

    const response = await fetch(url, { method: 'POST' });
    return response.ok;
  }

  /**
   * Convenience method to generate video and wait for completion
   */
  async generateVideoAndWait(
    request: VideoGenerationRequest,
    onProgress?: (job: VideoGenerationJob) => void,
    timeoutMs = 900000 // 15 minutes (Veo can be slow)
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
      await this.sleep(10000); // 10 seconds between polls
    }

    throw this.createError('TIMEOUT', 'Video generation timed out', true);
  }

  private mapAspectRatio(ratio?: string): string {
    switch (ratio) {
      case '16:9':
        return '16:9';
      case '9:16':
        return '9:16';
      case '1:1':
        return '1:1';
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
      // Veo: ~$0.30 per second
      return (params.videoSeconds ?? 8) * 0.30;
    }

    return 0;
  }
}
