/**
 * Google Veo Provider Adapter
 * Supports: Veo 3.1, Veo 3, Veo 2 for video generation with native audio
 * Access via Google AI Studio API (generativelanguage.googleapis.com)
 * 
 * Model families:
 * - Veo 3.1: Latest with best quality
 *   - veo-3.1-generate-001: Full quality
 * - Veo 3: Text-to-video with native sound generation
 *   - veo-3.0-generate-001: Standard quality
 *   - veo-3.0-fast-generate-001: Lower latency
 * - Veo 2: Stable video generation
 *   - veo-2.0-generate-001: Standard quality
 * 
 * Features:
 * - Text to video generation
 * - Image to video (preview for some models)
 * - Native sound/audio generation
 * - 4-8 second video lengths
 * - 720p and 1080p resolutions
 * 
 * https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview
 */

import { BaseAdapter } from './baseAdapter';
import type { ProviderCapability } from '../../../core/types/provider';
import type {
  VideoGenerationRequest,
  VideoGenerationJob,
} from '../../../core/types/provider';
import type { ContentType } from '../../../core/types/common';

// Veo 3.1 models (latest)
const VEO_3_1_MODELS = [
  'veo-3.1-generate-001',
];

// Veo 3 models
const VEO_3_MODELS = [
  'veo-3.0-generate-001',
  'veo-3.0-fast-generate-001',
];

// Veo 2 models (stable)
const VEO_2_MODELS = [
  'veo-2.0-generate-001',
];

const ALL_MODELS = [...VEO_3_1_MODELS, ...VEO_3_MODELS, ...VEO_2_MODELS];

export class VeoAdapter extends BaseAdapter {
  // Using AI Studio endpoint for simpler auth
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  get providerType() {
    return 'veo' as const;
  }

  get displayName() {
    return 'Google Veo';
  }

  get description() {
    return 'Veo 3 - video generation with native audio, sound effects, and music';
  }

  getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'video',
        models: ALL_MODELS,
        maxResolution: '1080p',
        supportsStreaming: false,
        supportsBatching: false,
        supportsAsyncJobs: true,
        costPerUnit: 0.30, // ~$0.30 per second for Veo 3
        rateLimitPerMinute: 10,
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

    // Default to Veo 3.1
    const model = request.model || 'veo-3.1-generate-001';
    const url = `${this.baseUrl}/models/${model}:generateVideo?key=${this.credential!.apiKey}`;

    // Validate duration (Veo 3 supports 4, 6, or 8 seconds)
    const duration = this.validateDuration(request.duration);

    const body: Record<string, unknown> = {
      prompt: request.prompt,
      generationConfig: {
        videoDuration: `${duration}s`,
        aspectRatio: this.mapAspectRatio(request.aspectRatio),
        numberOfVideos: 1,
        // Veo 3+ supports native audio generation
        generateAudio: true,
      },
    };

    // Image-to-video support (preview for Veo 3)
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

  /**
   * Validate and normalize video duration
   * Veo 3 supports 4, 6, or 8 seconds
   */
  private validateDuration(duration?: number): number {
    if (!duration) return 8; // Default to 8 seconds
    
    // Clamp to valid values
    if (duration <= 4) return 4;
    if (duration <= 6) return 6;
    return 8;
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
        return '16:9'; // Default for video
    }
  }

  estimateCost(
    type: ContentType,
    params: {
      videoSeconds?: number;
    }
  ): number {
    if (type === 'video') {
      // Veo 3: ~$0.30 per second
      return (params.videoSeconds ?? 8) * 0.30;
    }

    return 0;
  }
}
