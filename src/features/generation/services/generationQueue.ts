/**
 * Generation Queue Service
 * Manages batch generation with configurable concurrency and priority
 */

import type { UUID } from '../../../core/types/common';
import { createUUID, createTimestamp } from '../../../core/types/common';
import type { GenerationRequest, GenerationResult } from '../../../core/types/generation';
import type {
  QueuedGeneration,
  QueueConfig,
  QueueStats,
  QueueAddOptions,
} from '../types/queue';
import { DEFAULT_QUEUE_CONFIG } from '../types/queue';
import {
  validateRequest,
  preparePrompt,
  generateText,
  generateImage,
  submitVideoJob,
  pollVideoJob,
} from './generationService';

// Rate limiting state
interface RateLimitState {
  lastError: number;
  backoffMs: number;
  consecutiveErrors: number;
}

// Internal queue state
let queueItems: Map<UUID, QueuedGeneration> = new Map();
let queueConfig: QueueConfig = { ...DEFAULT_QUEUE_CONFIG };
let isPaused = false;
let isProcessing = false;
let processingIds: Set<UUID> = new Set();
let rateLimitState: RateLimitState = {
  lastError: 0,
  backoffMs: 0,
  consecutiveErrors: 0,
};

// Stats tracking
let completedCount = 0;
let failedCount = 0;
let cancelledCount = 0;
let totalWaitTimeMs = 0;
let totalProcessingTimeMs = 0;
let processedForStats = 0;

// Callbacks for store synchronization
type QueueChangeCallback = (items: Map<UUID, QueuedGeneration>) => void;
type StatsChangeCallback = (stats: QueueStats) => void;

let onQueueChange: QueueChangeCallback | null = null;
let onStatsChange: StatsChangeCallback | null = null;

/**
 * Set callbacks for queue changes (used by store)
 */
export function setQueueCallbacks(
  onQueue: QueueChangeCallback,
  onStats: StatsChangeCallback
): void {
  onQueueChange = onQueue;
  onStatsChange = onStats;
}

/**
 * Notify listeners of queue changes
 */
function notifyQueueChange(): void {
  if (onQueueChange) {
    onQueueChange(new Map(queueItems));
  }
  if (onStatsChange) {
    onStatsChange(getQueueStats());
  }
}

/**
 * Set queue configuration
 */
export function setQueueConfig(config: Partial<QueueConfig>): void {
  queueConfig = { ...queueConfig, ...config };
  console.log('[Queue] Config updated:', queueConfig);
}

/**
 * Get current queue configuration
 */
export function getQueueConfig(): QueueConfig {
  return { ...queueConfig };
}

/**
 * Add a generation request to the queue
 */
export function addToQueue(
  request: GenerationRequest,
  options: QueueAddOptions = {}
): UUID {
  const id = createUUID();
  const now = createTimestamp();

  const queuedItem: QueuedGeneration = {
    id,
    request: { ...request, id: request.id || createUUID(), createdAt: request.createdAt || now },
    priority: options.priority ?? 3, // Default middle priority
    addedAt: now,
    status: 'queued',
    retryCount: 0,
    maxRetries: options.maxRetries ?? queueConfig.maxRetries,
    onComplete: options.onComplete,
    onError: options.onError,
  };

  queueItems.set(id, queuedItem);
  console.log(`[Queue] Added item ${id} with priority ${queuedItem.priority}, type: ${request.type}`);
  
  notifyQueueChange();
  
  // Trigger processing
  scheduleProcessing();
  
  return id;
}

/**
 * Cancel a queued item
 */
export function cancelQueued(id: UUID): boolean {
  const item = queueItems.get(id);
  if (!item) {
    console.log(`[Queue] Cannot cancel: item ${id} not found`);
    return false;
  }

  if (item.status === 'processing') {
    // Mark for cancellation - will be handled by processor
    item.status = 'cancelled';
    queueItems.set(id, item);
    console.log(`[Queue] Marked processing item ${id} for cancellation`);
  } else if (item.status === 'queued') {
    item.status = 'cancelled';
    item.error = 'Cancelled by user';
    queueItems.set(id, item);
    cancelledCount++;
    console.log(`[Queue] Cancelled queued item ${id}`);
  } else {
    console.log(`[Queue] Cannot cancel item ${id} with status ${item.status}`);
    return false;
  }

  notifyQueueChange();
  return true;
}

/**
 * Cancel all queued and processing items
 */
export function cancelAll(): void {
  let cancelled = 0;
  
  for (const [id, item] of queueItems) {
    if (item.status === 'queued' || item.status === 'processing') {
      item.status = 'cancelled';
      item.error = 'Cancelled by user (cancel all)';
      queueItems.set(id, item);
      cancelledCount++;
      cancelled++;
    }
  }

  console.log(`[Queue] Cancelled ${cancelled} items`);
  notifyQueueChange();
}

/**
 * Pause queue processing
 */
export function pauseQueue(): void {
  isPaused = true;
  console.log('[Queue] Paused');
  notifyQueueChange();
}

/**
 * Resume queue processing
 */
export function resumeQueue(): void {
  isPaused = false;
  console.log('[Queue] Resumed');
  notifyQueueChange();
  scheduleProcessing();
}

/**
 * Check if queue is paused
 */
export function isQueuePaused(): boolean {
  return isPaused;
}

/**
 * Get queue statistics
 */
export function getQueueStats(): QueueStats {
  let queued = 0;
  let processing = 0;
  let completed = 0;
  let failed = 0;
  let cancelled = 0;

  for (const item of queueItems.values()) {
    switch (item.status) {
      case 'queued':
        queued++;
        break;
      case 'processing':
        processing++;
        break;
      case 'completed':
        completed++;
        break;
      case 'failed':
        failed++;
        break;
      case 'cancelled':
        cancelled++;
        break;
    }
  }

  return {
    queued,
    processing,
    completed,
    failed,
    cancelled,
    totalProcessed: completedCount + failedCount + cancelledCount,
    averageWaitTimeMs: processedForStats > 0 ? totalWaitTimeMs / processedForStats : 0,
    averageProcessingTimeMs: processedForStats > 0 ? totalProcessingTimeMs / processedForStats : 0,
  };
}

/**
 * Get all queued items (sorted by effective priority)
 */
export function getQueuedItems(): QueuedGeneration[] {
  const items = Array.from(queueItems.values());
  const now = createTimestamp();

  // Sort by effective priority (base priority + time boost)
  return items.sort((a, b) => {
    const aEffectivePriority = getEffectivePriority(a, now);
    const bEffectivePriority = getEffectivePriority(b, now);
    
    // Higher priority first
    if (bEffectivePriority !== aEffectivePriority) {
      return bEffectivePriority - aEffectivePriority;
    }
    
    // Earlier added first for same priority
    return a.addedAt - b.addedAt;
  });
}

/**
 * Get a specific queued item
 */
export function getQueuedItem(id: UUID): QueuedGeneration | undefined {
  return queueItems.get(id);
}

/**
 * Clear completed and failed items from queue
 */
export function clearFinishedItems(): void {
  for (const [id, item] of queueItems) {
    if (item.status === 'completed' || item.status === 'failed' || item.status === 'cancelled') {
      queueItems.delete(id);
    }
  }
  console.log('[Queue] Cleared finished items');
  notifyQueueChange();
}

/**
 * Update item priority
 */
export function updatePriority(id: UUID, priority: number): boolean {
  const item = queueItems.get(id);
  if (!item || item.status !== 'queued') {
    return false;
  }

  const clampedPriority = Math.max(1, Math.min(5, priority));
  item.priority = clampedPriority;
  queueItems.set(id, item);
  
  console.log(`[Queue] Updated item ${id} priority to ${clampedPriority}`);
  notifyQueueChange();
  return true;
}

/**
 * Calculate effective priority with time boost
 */
function getEffectivePriority(item: QueuedGeneration, now: number): number {
  if (item.status !== 'queued') {
    return item.priority;
  }

  const waitMinutes = (now - item.addedAt) / 60000;
  const boost = waitMinutes * queueConfig.priorityBoostPerMinute;
  
  return item.priority + boost;
}

/**
 * Schedule queue processing
 */
function scheduleProcessing(): void {
  if (isProcessing) {
    return;
  }

  // Check rate limit backoff
  const now = createTimestamp();
  if (rateLimitState.backoffMs > 0) {
    const timeSinceError = now - rateLimitState.lastError;
    if (timeSinceError < rateLimitState.backoffMs) {
      const waitMs = rateLimitState.backoffMs - timeSinceError;
      console.log(`[Queue] Rate limit backoff: waiting ${waitMs}ms`);
      setTimeout(scheduleProcessing, waitMs);
      return;
    }
    // Reset backoff after waiting
    rateLimitState.backoffMs = 0;
    rateLimitState.consecutiveErrors = 0;
  }

  // Start processing
  processQueue();
}

/**
 * Process the queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing || isPaused) {
    return;
  }

  isProcessing = true;

  try {
    while (!isPaused) {
      // Get next items to process
      const availableSlots = queueConfig.maxConcurrent - processingIds.size;
      if (availableSlots <= 0) {
        break;
      }

      // Get queued items sorted by priority
      const sortedItems = getQueuedItems().filter(
        (item) => item.status === 'queued' && !processingIds.has(item.id)
      );

      if (sortedItems.length === 0) {
        break;
      }

      // Start processing items up to available slots
      const itemsToProcess = sortedItems.slice(0, availableSlots);
      
      // Process all items concurrently
      const processingPromises = itemsToProcess.map((item) => {
        processingIds.add(item.id);
        return processItem(item).finally(() => {
          processingIds.delete(item.id);
        });
      });

      // Wait for at least one to complete before checking for more
      if (processingPromises.length > 0) {
        await Promise.race(processingPromises);
      }
    }
  } finally {
    isProcessing = false;
  }

  // Schedule next processing cycle if there are more items
  const remaining = getQueuedItems().filter((item) => item.status === 'queued');
  if (remaining.length > 0 && !isPaused) {
    setTimeout(scheduleProcessing, 100);
  }
}

/**
 * Process a single queue item
 */
async function processItem(item: QueuedGeneration): Promise<void> {
  const startTime = createTimestamp();
  const waitTime = startTime - item.addedAt;

  // Update status to processing
  item.status = 'processing';
  item.startedAt = startTime;
  queueItems.set(item.id, item);
  notifyQueueChange();

  console.log(`[Queue] Processing item ${item.id} (type: ${item.request.type}, retry: ${item.retryCount})`);

  try {
    // Check for cancellation
    if (queueItems.get(item.id)?.status === 'cancelled') {
      console.log(`[Queue] Item ${item.id} was cancelled`);
      return;
    }

    // Validate request
    const validation = await validateRequest(item.request);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Prepare prompt
    const prompt = await preparePrompt(item.request);

    // Check for cancellation again
    if (queueItems.get(item.id)?.status === 'cancelled') {
      console.log(`[Queue] Item ${item.id} was cancelled during preparation`);
      return;
    }

    // Execute generation based on type
    let result: GenerationResult;

    switch (item.request.type) {
      case 'text': {
        const textResult = await generateText(item.request, prompt);
        result = {
          type: 'text',
          textContent: textResult.content,
          metadata: {
            inputTokens: textResult.inputTokens,
            outputTokens: textResult.outputTokens,
          },
        };
        break;
      }

      case 'image': {
        const imageResult = await generateImage(item.request, prompt);
        result = {
          type: 'image',
          urls: imageResult.urls,
          assetIds: imageResult.assetIds,
        };
        break;
      }

      case 'video': {
        const jobResult = await submitVideoJob(item.request, prompt);
        
        // Poll for completion
        let videoResult = await pollVideoJob(item.request, jobResult.jobId);
        let pollCount = 0;
        const maxPolls = 120; // 10 minutes with 5s intervals
        
        while (videoResult.status === 'pending' || videoResult.status === 'processing') {
          // Check for cancellation during polling
          if (queueItems.get(item.id)?.status === 'cancelled') {
            console.log(`[Queue] Item ${item.id} was cancelled during video polling`);
            return;
          }

          if (pollCount >= maxPolls) {
            throw new Error('Video generation timed out');
          }

          await sleep(5000);
          videoResult = await pollVideoJob(item.request, jobResult.jobId);
          pollCount++;
        }

        if (videoResult.status === 'failed') {
          throw new Error(videoResult.error?.message || 'Video generation failed');
        }

        result = {
          type: 'video',
          urls: videoResult.urls,
          assetIds: videoResult.assetIds,
        };
        break;
      }

      default:
        throw new Error(`Unsupported content type: ${item.request.type}`);
    }

    // Success - update item
    const endTime = createTimestamp();
    const processingTime = endTime - startTime;

    item.status = 'completed';
    item.completedAt = endTime;
    item.result = result;
    queueItems.set(item.id, item);

    // Update stats
    completedCount++;
    totalWaitTimeMs += waitTime;
    totalProcessingTimeMs += processingTime;
    processedForStats++;

    // Reset rate limit state on success
    rateLimitState.consecutiveErrors = 0;
    rateLimitState.backoffMs = 0;

    console.log(`[Queue] Completed item ${item.id} in ${processingTime}ms`);

    // Call success callback
    if (item.onComplete) {
      try {
        item.onComplete(result);
      } catch (callbackError) {
        console.error(`[Queue] onComplete callback error for ${item.id}:`, callbackError);
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Queue] Error processing item ${item.id}:`, errorMessage);

    // Check if it's a rate limit error
    const isRateLimitError = errorMessage.toLowerCase().includes('rate limit') ||
                            errorMessage.toLowerCase().includes('429') ||
                            errorMessage.toLowerCase().includes('too many requests');

    if (isRateLimitError) {
      // Apply exponential backoff
      rateLimitState.consecutiveErrors++;
      rateLimitState.lastError = createTimestamp();
      rateLimitState.backoffMs = Math.min(
        queueConfig.retryDelayMs * Math.pow(2, rateLimitState.consecutiveErrors - 1),
        60000 // Max 1 minute
      );
      console.log(`[Queue] Rate limit detected, backing off for ${rateLimitState.backoffMs}ms`);
    }

    // Check if we should retry
    if (item.retryCount < item.maxRetries) {
      item.retryCount++;
      item.status = 'queued';
      item.startedAt = undefined;
      queueItems.set(item.id, item);
      
      console.log(`[Queue] Scheduling retry ${item.retryCount}/${item.maxRetries} for item ${item.id}`);
      
      // Schedule retry with delay
      setTimeout(() => {
        notifyQueueChange();
        scheduleProcessing();
      }, queueConfig.retryDelayMs);
      
    } else {
      // Max retries exceeded
      item.status = 'failed';
      item.completedAt = createTimestamp();
      item.error = errorMessage;
      queueItems.set(item.id, item);

      failedCount++;

      console.log(`[Queue] Item ${item.id} failed after ${item.retryCount} retries`);

      // Call error callback
      if (item.onError) {
        try {
          item.onError(errorMessage);
        } catch (callbackError) {
          console.error(`[Queue] onError callback error for ${item.id}:`, callbackError);
        }
      }
    }
  }

  notifyQueueChange();
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reset queue state (for testing)
 */
export function resetQueue(): void {
  queueItems = new Map();
  queueConfig = { ...DEFAULT_QUEUE_CONFIG };
  isPaused = false;
  isProcessing = false;
  processingIds = new Set();
  rateLimitState = { lastError: 0, backoffMs: 0, consecutiveErrors: 0 };
  completedCount = 0;
  failedCount = 0;
  cancelledCount = 0;
  totalWaitTimeMs = 0;
  totalProcessingTimeMs = 0;
  processedForStats = 0;
  console.log('[Queue] Reset');
}
