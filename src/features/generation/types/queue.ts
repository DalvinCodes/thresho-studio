/**
 * Queue types for batch generation system
 */

import type { UUID, Timestamp } from '../../../core/types/common';
import type { GenerationRequest, GenerationResult } from '../../../core/types/generation';

/**
 * Status of a queued generation item
 */
export type QueuedGenerationStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * A generation request in the queue
 */
export interface QueuedGeneration {
  id: UUID;
  request: GenerationRequest;
  priority: number; // 1-5, higher = more urgent
  addedAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  status: QueuedGenerationStatus;
  retryCount: number;
  maxRetries: number;
  result?: GenerationResult;
  error?: string;
  // Callbacks - stored but not serialized
  onComplete?: (result: GenerationResult) => void;
  onError?: (error: string) => void;
}

/**
 * Configuration for the generation queue
 */
export interface QueueConfig {
  maxConcurrent: number; // Default 2
  retryDelayMs: number; // Default 5000
  maxRetries: number; // Default 3
  priorityBoostPerMinute: number; // Increase priority of waiting items per minute
}

/**
 * Statistics about the queue state
 */
export interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalProcessed: number;
  averageWaitTimeMs: number;
  averageProcessingTimeMs: number;
}

/**
 * Options for adding an item to the queue
 */
export interface QueueAddOptions {
  priority?: number;
  maxRetries?: number;
  onComplete?: (result: GenerationResult) => void;
  onError?: (error: string) => void;
}

/**
 * Default queue configuration
 */
export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrent: 2,
  retryDelayMs: 5000,
  maxRetries: 3,
  priorityBoostPerMinute: 0.5,
};
