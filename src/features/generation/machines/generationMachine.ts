/**
 * Generation State Machine
 * XState machine for orchestrating AI content generation workflows
 */

import { createMachine, assign } from 'xstate';
import type { UUID, ContentType, Timestamp } from '../../../core/types/common';
import { createTimestamp } from '../../../core/types/common';
import type {
  GenerationRequest,
  GenerationResult,
  GenerationStatus,
  GenerationWorkflowContext,
} from '../../../core/types/generation';
import type { ProviderError, StreamChunk } from '../../../core/types/provider';

// Machine context
export interface GenerationMachineContext extends GenerationWorkflowContext {
  retryCount: number;
  maxRetries: number;
  pollingInterval: number;
  providerJobId?: string;
}

// Machine events
export type GenerationMachineEvent =
  | { type: 'START' }
  | { type: 'CANCEL' }
  | { type: 'RETRY' }
  | { type: 'VALIDATION_SUCCESS' }
  | { type: 'VALIDATION_FAILURE'; error: ProviderError }
  | { type: 'PREPARATION_COMPLETE'; renderedPrompt: string }
  | { type: 'STREAM_CHUNK'; chunk: StreamChunk }
  | { type: 'STREAM_COMPLETE'; content: string }
  | { type: 'EXECUTION_START'; providerJobId?: string }
  | { type: 'EXECUTION_PROGRESS'; progress: number }
  | { type: 'EXECUTION_COMPLETE'; result: GenerationResult }
  | { type: 'EXECUTION_ERROR'; error: ProviderError }
  | { type: 'POLL_RESULT'; status: 'pending' | 'processing' | 'complete' | 'failed'; result?: GenerationResult; error?: ProviderError };

// Create the generation machine
export const createGenerationMachine = (request: GenerationRequest) =>
  createMachine(
    {
      id: 'generation',
      initial: 'idle',
      context: {
        requestId: request.id,
        request,
        status: 'pending' as GenerationStatus,
        progress: 0,
        streamedContent: '',
        streamChunks: [],
        retryCount: 0,
        maxRetries: 3,
        pollingInterval: 2000, // 2 seconds for video jobs
      } as GenerationMachineContext,
      states: {
        // Initial idle state
        idle: {
          on: {
            START: {
              target: 'validating',
              actions: 'setStartTime',
            },
          },
        },

        // Validate the request
        validating: {
          entry: 'setValidatingStatus',
          invoke: {
            id: 'validateRequest',
            src: 'validateRequest',
            onDone: {
              target: 'preparing',
            },
            onError: {
              target: 'failed',
              actions: 'setValidationError',
            },
          },
          on: {
            CANCEL: 'cancelled',
          },
        },

        // Prepare the prompt (render template, inject brand tokens)
        preparing: {
          entry: 'setPreparingStatus',
          invoke: {
            id: 'preparePrompt',
            src: 'preparePrompt',
            onDone: {
              target: 'executing',
              actions: 'setRenderedPrompt',
            },
            onError: {
              target: 'failed',
              actions: 'setPreparationError',
            },
          },
          on: {
            CANCEL: 'cancelled',
          },
        },

        // Execute the generation (branches based on content type)
        executing: {
          entry: 'setExecutingStatus',
          initial: 'determineType',
          states: {
            determineType: {
              always: [
                { target: 'streamingText', guard: 'isStreamingTextGeneration' },
                { target: 'syncText', guard: 'isNonStreamingTextGeneration' },
                { target: 'syncImage', guard: 'isImageGeneration' },
                { target: 'asyncVideo', guard: 'isVideoGeneration' },
                { target: '#generation.failed' },
              ],
            },

            // Streaming text generation
            streamingText: {
              entry: 'setStreamingStatus',
              invoke: {
                id: 'streamText',
                src: 'streamText',
                onDone: {
                  target: '#generation.completed',
                  actions: 'setTextResult',
                },
                onError: {
                  target: '#generation.failed',
                  actions: 'setExecutionError',
                },
              },
              on: {
                STREAM_CHUNK: {
                  actions: 'appendStreamChunk',
                },
                CANCEL: '#generation.cancelled',
              },
            },

            // Non-streaming text generation
            syncText: {
              invoke: {
                id: 'generateText',
                src: 'generateText',
                onDone: {
                  target: '#generation.completed',
                  actions: 'setTextResult',
                },
                onError: {
                  target: 'retrying',
                  actions: 'setExecutionError',
                },
              },
              on: {
                CANCEL: '#generation.cancelled',
              },
            },

            // Synchronous image generation
            syncImage: {
              invoke: {
                id: 'generateImage',
                src: 'generateImage',
                onDone: {
                  target: '#generation.completed',
                  actions: 'setImageResult',
                },
                onError: {
                  target: 'retrying',
                  actions: 'setExecutionError',
                },
              },
              on: {
                EXECUTION_PROGRESS: {
                  actions: 'updateProgress',
                },
                CANCEL: '#generation.cancelled',
              },
            },

            // Async video generation (polling)
            asyncVideo: {
              initial: 'submitting',
              states: {
                submitting: {
                  invoke: {
                    id: 'submitVideoJob',
                    src: 'submitVideoJob',
                    onDone: {
                      target: 'polling',
                      actions: 'setProviderJobId',
                    },
                    onError: {
                      target: '#generation.executing.retrying',
                      actions: 'setExecutionError',
                    },
                  },
                },
                polling: {
                  invoke: {
                    id: 'pollVideoJob',
                    src: 'pollVideoJob',
                  },
                  on: {
                    POLL_RESULT: [
                      {
                        target: '#generation.completed',
                        guard: 'isPollComplete',
                        actions: 'setVideoResult',
                      },
                      {
                        target: '#generation.failed',
                        guard: 'isPollFailed',
                        actions: 'setExecutionError',
                      },
                      {
                        target: 'polling',
                        actions: 'updateProgressFromPoll',
                      },
                    ],
                    CANCEL: '#generation.cancelled',
                  },
                  after: {
                    POLLING_DELAY: {
                      target: 'polling',
                      reenter: true,
                    },
                  },
                },
              },
              on: {
                CANCEL: '#generation.cancelled',
              },
            },

            // Retry logic
            retrying: {
              always: [
                {
                  target: 'determineType',
                  guard: 'canRetry',
                  actions: 'incrementRetryCount',
                },
                { target: '#generation.failed' },
              ],
            },
          },
        },

        // Successfully completed
        completed: {
          entry: ['setCompletedStatus', 'setCompletionTime'],
          type: 'final',
        },

        // Failed state
        failed: {
          entry: 'setFailedStatus',
          on: {
            RETRY: {
              target: 'validating',
              guard: 'canRetry',
              actions: 'incrementRetryCount',
            },
          },
          type: 'final',
        },

        // Cancelled by user
        cancelled: {
          entry: 'setCancelledStatus',
          type: 'final',
        },
      },
    },
    {
      guards: {
        isStreamingTextGeneration: ({ context }) =>
          context.request.type === 'text' && context.request.parameters?.stream !== false,

        isNonStreamingTextGeneration: ({ context }) =>
          context.request.type === 'text' && context.request.parameters?.stream === false,

        isImageGeneration: ({ context }) =>
          context.request.type === 'image',

        isVideoGeneration: ({ context }) =>
          context.request.type === 'video',

        canRetry: ({ context }) =>
          context.retryCount < context.maxRetries,

        isPollComplete: (_, event) => {
          const e = event as { type: string; status?: string };
          return e.type === 'POLL_RESULT' && e.status === 'complete';
        },

        isPollFailed: (_, event) => {
          const e = event as { type: string; status?: string };
          return e.type === 'POLL_RESULT' && e.status === 'failed';
        },
      },

      delays: {
        POLLING_DELAY: ({ context }) => context.pollingInterval,
      },

      actions: {
        setStartTime: assign({
          startedAt: () => createTimestamp(),
        }),

        setValidatingStatus: assign({
          status: () => 'validating' as GenerationStatus,
        }),

        setPreparingStatus: assign({
          status: () => 'preparing' as GenerationStatus,
        }),

        setExecutingStatus: assign({
          status: () => 'executing' as GenerationStatus,
        }),

        setStreamingStatus: assign({
          status: () => 'streaming' as GenerationStatus,
        }),

        setCompletedStatus: assign({
          status: () => 'completed' as GenerationStatus,
          progress: () => 100,
        }),

        setFailedStatus: assign({
          status: () => 'failed' as GenerationStatus,
        }),

        setCancelledStatus: assign({
          status: () => 'cancelled' as GenerationStatus,
        }),

        setCompletionTime: assign({
          // completedAt is set implicitly
        }),

        setRenderedPrompt: assign({
          // Store rendered prompt from preparation
        }),

        setValidationError: assign({
          error: (_, event: any) => event.data as ProviderError,
        }),

        setPreparationError: assign({
          error: (_, event: any) => ({
            code: 'PREPARATION_ERROR',
            message: event.data?.message || 'Failed to prepare prompt',
            retryable: true,
          } as ProviderError),
        }),

        setExecutionError: assign({
          error: (_, event: any) => event.data as ProviderError,
        }),

        appendStreamChunk: assign({
          streamedContent: ({ context }, event: any) =>
            context.streamedContent + (event.chunk?.content || ''),
          streamChunks: ({ context }, event: any) =>
            [...context.streamChunks, event.chunk],
          progress: ({ context }, event: any) =>
            event.chunk?.progress || context.progress,
        }),

        setTextResult: assign({
          result: ({ context }, event: any) => ({
            type: 'text' as ContentType,
            textContent: event.data?.content || context.streamedContent,
          } as GenerationResult),
        }),

        setImageResult: assign({
          result: (_, event: any) => ({
            type: 'image' as ContentType,
            assetIds: event.data?.assetIds,
            urls: event.data?.urls,
            metadata: event.data?.metadata,
          } as GenerationResult),
        }),

        setVideoResult: assign({
          result: (_, event: any) => ({
            type: 'video' as ContentType,
            assetIds: event.data?.assetIds || event.result?.assetIds,
            urls: event.data?.urls || event.result?.urls,
            metadata: event.data?.metadata || event.result?.metadata,
          } as GenerationResult),
        }),

        setProviderJobId: assign({
          providerJobId: (_, event: any) => event.data?.jobId,
        }),

        updateProgress: assign({
          progress: (_, event: any) => event.progress || 0,
        }),

        updateProgressFromPoll: assign({
          progress: ({ context }, event: any) => {
            if (event.status === 'processing') {
              return Math.min(context.progress + 10, 90);
            }
            return context.progress;
          },
        }),

        incrementRetryCount: assign({
          retryCount: ({ context }) => context.retryCount + 1,
        }),
      },
    }
  );

// Type exports for the machine
export type GenerationMachine = ReturnType<typeof createGenerationMachine>;
export type GenerationMachineState = ReturnType<GenerationMachine['getInitialSnapshot']>;
