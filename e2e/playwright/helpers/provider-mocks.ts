/**
 * Provider Mock System for E2E Testing
 * 
 * Provides mock responses for all 8 AI providers in Thresho Studio:
 * - OpenAI (text, image, streaming)
 * - Anthropic (messages, streaming)
 * - Kimi (OpenAI-compatible text)
 * - Gemini (generateContent)
 * - Flux Pro (async image jobs)
 * - Imagen 3 (predict API)
 * - Runway (async video jobs)
 * - Veo (async video jobs)
 */

import type { Page, Route } from '@playwright/test';

// ============================================================================
// Types
// ============================================================================

export interface MockResponse {
  status: number;
  body: Record<string, unknown> | string;
  headers?: Record<string, string>;
}

export interface MockConfig {
  openai?: {
    text?: MockResponse;
    image?: MockResponse;
    stream?: MockResponse;
  };
  anthropic?: {
    messages?: MockResponse;
    stream?: MockResponse;
  };
  kimi?: {
    text?: MockResponse;
    stream?: MockResponse;
  };
  gemini?: {
    generateContent?: MockResponse;
    streamGenerateContent?: MockResponse;
  };
  flux?: {
    submit?: MockResponse;
    status?: MockResponse;
  };
  imagen?: {
    predict?: MockResponse;
  };
  runway?: {
    createJob?: MockResponse;
    getJob?: MockResponse;
  };
  veo?: {
    generateVideos?: MockResponse;
    getJob?: MockResponse;
  };
}

// ============================================================================
// SSE Stream Helper
// ============================================================================

/**
 * Creates an SSE (Server-Sent Events) stream body from chunks
 */
export function createSSEStream(chunks: Array<{ type: string; data: unknown }>): string {
  return chunks
    .map((chunk) => {
      const data = typeof chunk.data === 'string' ? chunk.data : JSON.stringify(chunk.data);
      return `data: ${data}\n\n`;
    })
    .join('');
}

/**
 * Creates OpenAI-style SSE stream chunks
 */
export function createOpenAIStreamChunks(content: string): Array<{ type: string; data: unknown }> {
  const words = content.split(' ');
  const chunks: Array<{ type: string; data: unknown }> = [];
  
  for (let i = 0; i < words.length; i++) {
    chunks.push({
      type: 'token',
      data: {
        id: 'mock-stream-id',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [{
          index: 0,
          delta: { content: words[i] + (i < words.length - 1 ? ' ' : '') },
          finish_reason: null,
        }],
      },
    });
  }
  
  chunks.push({ type: 'complete', data: '[DONE]' });
  return chunks;
}

/**
 * Creates Anthropic-style SSE stream chunks
 */
export function createAnthropicStreamChunks(content: string): Array<{ type: string; data: unknown }> {
  const words = content.split(' ');
  const chunks: Array<{ type: string; data: unknown }> = [];
  
  // Start event
  chunks.push({
    type: 'message_start',
    data: {
      type: 'message_start',
      message: {
        id: 'mock-msg-id',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [],
      },
    },
  });
  
  // Content block start
  chunks.push({
    type: 'content_block_start',
    data: {
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text', text: '' },
    },
  });
  
  // Text deltas
  for (let i = 0; i < words.length; i++) {
    chunks.push({
      type: 'content_block_delta',
      data: {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: words[i] + (i < words.length - 1 ? ' ' : '') },
      },
    });
  }
  
  // Content block stop
  chunks.push({
    type: 'content_block_stop',
    data: { type: 'content_block_stop', index: 0 },
  });
  
  // Message delta (usage)
  chunks.push({
    type: 'message_delta',
    data: {
      type: 'message_delta',
      delta: { stop_reason: 'end_turn', stop_sequence: null },
      usage: { output_tokens: 20 },
    },
  });
  
  // Message stop
  chunks.push({ type: 'message_stop', data: { type: 'message_stop' } });
  
  return chunks;
}

// ============================================================================
// Provider Mock Generators
// ============================================================================

export const providerMocks = {
  openai: {
    text: {
      success: (content: string, model = 'gpt-4o'): MockResponse => ({
        status: 200,
        body: {
          id: `mock-completion-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{
            index: 0,
            message: { role: 'assistant', content },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        },
      }),
      
      error: (code: string, message: string): MockResponse => ({
        status: 400,
        body: {
          error: {
            message,
            type: 'invalid_request_error',
            code,
          },
        },
      }),
      
      rateLimit: (): MockResponse => ({
        status: 429,
        body: {
          error: {
            message: 'Rate limit exceeded',
            type: 'rate_limit_error',
            code: 'rate_limit_exceeded',
          },
        },
        headers: { 'Retry-After': '60' },
      }),
    },
    
    stream: {
      success: (content: string, _model = 'gpt-4o'): MockResponse => {
        const chunks = createOpenAIStreamChunks(content);
        return {
          status: 200,
          body: createSSEStream(chunks),
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        };
      },
    },
    
    image: {
      success: (url: string, model = 'dall-e-3'): MockResponse => ({
        status: 200,
        body: {
          created: Math.floor(Date.now() / 1000),
          data: [{
            url,
            revised_prompt: 'Mock generated prompt based on input',
          }],
          model,
        },
      }),
      
      error: (message: string): MockResponse => ({
        status: 400,
        body: {
          error: {
            message,
            type: 'invalid_request_error',
            code: 'invalid_prompt',
          },
        },
      }),
    },
  },

  anthropic: {
    messages: {
      success: (content: string, model = 'claude-sonnet-4-20250514'): MockResponse => ({
        status: 200,
        body: {
          id: `msg_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          model,
          content: [{ type: 'text', text: content }],
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 15,
            output_tokens: 25,
          },
        },
      }),
      
      error: (message: string): MockResponse => ({
        status: 400,
        body: {
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message,
          },
        },
      }),
    },
    
    stream: {
      success: (content: string): MockResponse => {
        const chunks = createAnthropicStreamChunks(content);
        return {
          status: 200,
          body: createSSEStream(chunks),
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        };
      },
    },
  },

  kimi: {
    text: {
      success: (content: string, model = 'moonshot-v1-128k'): MockResponse => ({
        status: 200,
        body: {
          id: `mock-kimi-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{
            index: 0,
            message: { role: 'assistant', content },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        },
      }),
    },
    
    stream: {
      success: (content: string): MockResponse => {
        const chunks = createOpenAIStreamChunks(content); // Kimi uses OpenAI-compatible format
        return {
          status: 200,
          body: createSSEStream(chunks),
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        };
      },
    },
  },

  gemini: {
    generateContent: {
      success: (content: string, _model = 'gemini-2.0-flash-exp'): MockResponse => ({
        status: 200,
        body: {
          candidates: [{
            content: {
              role: 'model',
              parts: [{ text: content }],
            },
            finishReason: 'STOP',
            index: 0,
          }],
          usageMetadata: {
            promptTokenCount: 12,
            candidatesTokenCount: 22,
            totalTokenCount: 34,
          },
        },
      }),
      
      error: (message: string): MockResponse => ({
        status: 400,
        body: {
          error: {
            code: 400,
            message,
            status: 'INVALID_ARGUMENT',
          },
        },
      }),
    },
    
    streamGenerateContent: {
      success: (content: string): MockResponse => {
        const words = content.split(' ');
        const chunks: Array<{ type: string; data: unknown }> = [];
        
        for (const word of words) {
          chunks.push({
            type: 'token',
            data: {
              candidates: [{
                content: {
                  role: 'model',
                  parts: [{ text: word + ' ' }],
                },
              }],
            },
          });
        }
        
        chunks.push({
          type: 'metadata',
          data: {
            candidates: [{
              finishReason: 'STOP',
            }],
            usageMetadata: {
              promptTokenCount: 12,
              candidatesTokenCount: 22,
            },
          },
        });
        
        return {
          status: 200,
          body: createSSEStream(chunks),
          headers: {
            'Content-Type': 'text/event-stream',
          },
        };
      },
    },
  },

  flux: {
    submit: {
      success: (taskId = `task-${Date.now()}`): MockResponse => ({
        status: 200,
        body: { id: taskId },
      }),
      
      error: (message: string): MockResponse => ({
        status: 400,
        body: { message, status: 'error' },
      }),
    },
    
    status: {
      pending: (taskId: string): MockResponse => ({
        status: 200,
        body: {
          id: taskId,
          status: 'Pending',
        },
      }),
      
      processing: (taskId: string): MockResponse => ({
        status: 200,
        body: {
          id: taskId,
          status: 'Processing',
        },
      }),
      
      completed: (taskId: string, imageUrl: string): MockResponse => ({
        status: 200,
        body: {
          id: taskId,
          status: 'Ready',
          result: {
            sample: imageUrl,
            prompt: 'Mock generated image',
          },
        },
      }),
      
      failed: (taskId: string, error: string): MockResponse => ({
        status: 200,
        body: {
          id: taskId,
          status: 'Error',
          error,
        },
      }),
    },
  },

  imagen: {
    predict: {
      success: (base64Image?: string): MockResponse => {
        const imageData = base64Image || 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        return {
          status: 200,
          body: {
            predictions: [{
              bytesBase64Encoded: imageData,
              mimeType: 'image/png',
            }],
          },
        };
      },
      
      error: (message: string): MockResponse => ({
        status: 400,
        body: {
          error: {
            code: 400,
            message,
            status: 'INVALID_ARGUMENT',
          },
        },
      }),
    },
  },

  runway: {
    createJob: {
      success: (jobId = `job-${Date.now()}`): MockResponse => ({
        status: 200,
        body: {
          id: jobId,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      }),
      
      error: (message: string): MockResponse => ({
        status: 400,
        body: {
          error: {
            message,
            type: 'invalid_request',
          },
        },
      }),
    },
    
    getJob: {
      queued: (jobId: string): MockResponse => ({
        status: 200,
        body: {
          id: jobId,
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString(),
        },
      }),
      
      processing: (jobId: string, progress = 50): MockResponse => ({
        status: 200,
        body: {
          id: jobId,
          status: 'running',
          progress,
          estimated_time_remaining: 120,
        },
      }),
      
      completed: (jobId: string, videoUrl: string): MockResponse => ({
        status: 200,
        body: {
          id: jobId,
          status: 'succeeded',
          progress: 100,
          output: [videoUrl],
          completed_at: new Date().toISOString(),
        },
      }),
      
      failed: (jobId: string, failure: string): MockResponse => ({
        status: 200,
        body: {
          id: jobId,
          status: 'failed',
          progress: 0,
          failure,
        },
      }),
    },
  },

  veo: {
    generateVideos: {
      success: (operationName = `operations/veo-${Date.now()}`): MockResponse => ({
        status: 200,
        body: {
          name: operationName,
          metadata: {
            '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.CreateVideoResponse',
          },
        },
      }),
      
      error: (message: string): MockResponse => ({
        status: 400,
        body: {
          error: {
            code: 400,
            message,
            status: 'INVALID_ARGUMENT',
          },
        },
      }),
    },
    
    getJob: {
      processing: (operationName: string, progress = 0.5): MockResponse => ({
        status: 200,
        body: {
          name: operationName,
          metadata: {
            progress,
            '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.CreateVideoMetadata',
          },
          done: false,
        },
      }),
      
      completed: (operationName: string, videoUrl: string): MockResponse => ({
        status: 200,
        body: {
          name: operationName,
          done: true,
          response: {
            generatedVideos: [{
              video: {
                uri: videoUrl,
                mimeType: 'video/mp4',
              },
            }],
          },
        },
      }),
      
      failed: (operationName: string, message: string): MockResponse => ({
        status: 200,
        body: {
          name: operationName,
          done: true,
          error: {
            code: 500,
            message,
          },
        },
      }),
    },
  },
};

// ============================================================================
// Mock Setup Functions
// ============================================================================

/**
 * Sets up provider mocks for a page
 * Respects USE_REAL_PROVIDERS environment variable
 */
export async function setupProviderMocks(page: Page, mocks: MockConfig): Promise<void> {
  // Skip mocking if using real providers
  if (process.env.USE_REAL_PROVIDERS === 'true') {
    console.log('Using real providers - mocks disabled');
    return;
  }

  // OpenAI API
  if (mocks.openai) {
    await page.route('https://api.openai.com/v1/**', async (route: Route) => {
      const url = route.request().url();
      
      if (url.includes('/chat/completions')) {
        const body = await route.request().postDataJSON();
        const isStream = body?.stream === true;
        
        if (isStream && mocks.openai?.stream) {
          await route.fulfill({
            status: mocks.openai.stream.status,
            body: mocks.openai.stream.body as string,
            headers: mocks.openai.stream.headers,
          });
        } else if (mocks.openai?.text) {
          await route.fulfill({
            status: mocks.openai.text.status,
            contentType: 'application/json',
            body: JSON.stringify(mocks.openai.text.body),
          });
        } else {
          await route.continue();
        }
      } else if (url.includes('/images/generations') && mocks.openai?.image) {
        await route.fulfill({
          status: mocks.openai.image.status,
          contentType: 'application/json',
          body: JSON.stringify(mocks.openai.image.body),
        });
      } else {
        await route.continue();
      }
    });
  }

  // Anthropic API
  if (mocks.anthropic) {
    await page.route('https://api.anthropic.com/v1/**', async (route: Route) => {
      const url = route.request().url();
      
      if (url.includes('/messages')) {
        const body = await route.request().postDataJSON();
        const isStream = body?.stream === true;
        
        if (isStream && mocks.anthropic?.stream) {
          await route.fulfill({
            status: mocks.anthropic.stream.status,
            body: mocks.anthropic.stream.body as string,
            headers: mocks.anthropic.stream.headers,
          });
        } else if (mocks.anthropic?.messages) {
          await route.fulfill({
            status: mocks.anthropic.messages.status,
            contentType: 'application/json',
            body: JSON.stringify(mocks.anthropic.messages.body),
          });
        } else {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });
  }

  // Kimi API (Moonshot)
  if (mocks.kimi) {
    await page.route('https://api.moonshot.cn/v1/**', async (route: Route) => {
      const url = route.request().url();
      
      if (url.includes('/chat/completions')) {
        const body = await route.request().postDataJSON();
        const isStream = body?.stream === true;
        
        if (isStream && mocks.kimi?.stream) {
          await route.fulfill({
            status: mocks.kimi.stream.status,
            body: mocks.kimi.stream.body as string,
            headers: mocks.kimi.stream.headers,
          });
        } else if (mocks.kimi?.text) {
          await route.fulfill({
            status: mocks.kimi.text.status,
            contentType: 'application/json',
            body: JSON.stringify(mocks.kimi.text.body),
          });
        } else {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });
  }

  // Gemini API
  if (mocks.gemini) {
    await page.route('https://generativelanguage.googleapis.com/v1beta/**', async (route: Route) => {
      const url = route.request().url();
      
      if (url.includes(':generateContent') && mocks.gemini?.generateContent) {
        await route.fulfill({
          status: mocks.gemini.generateContent.status,
          contentType: 'application/json',
          body: JSON.stringify(mocks.gemini.generateContent.body),
        });
      } else if (url.includes(':streamGenerateContent') && mocks.gemini?.streamGenerateContent) {
        await route.fulfill({
          status: mocks.gemini.streamGenerateContent.status,
          body: mocks.gemini.streamGenerateContent.body as string,
          headers: mocks.gemini.streamGenerateContent.headers,
        });
      } else {
        await route.continue();
      }
    });
  }

  // Flux Pro API (Black Forest Labs)
  if (mocks.flux) {
    await page.route('https://api.bfl.ml/v1/**', async (route: Route) => {
      const url = route.request().url();
      
      if ((url.includes('/flux-pro') || url.includes('/flux-dev') || url.includes('/flux-schnell')) && mocks.flux?.submit) {
        await route.fulfill({
          status: mocks.flux.submit.status,
          contentType: 'application/json',
          body: JSON.stringify(mocks.flux.submit.body),
        });
      } else if (url.includes('/get_result') && mocks.flux?.status) {
        await route.fulfill({
          status: mocks.flux.status.status,
          contentType: 'application/json',
          body: JSON.stringify(mocks.flux.status.body),
        });
      } else {
        await route.continue();
      }
    });
  }

  // Imagen API
  if (mocks.imagen) {
    await page.route('https://generativelanguage.googleapis.com/v1beta/models/**:predict', async (route: Route) => {
      if (mocks.imagen?.predict) {
        await route.fulfill({
          status: mocks.imagen.predict.status,
          contentType: 'application/json',
          body: JSON.stringify(mocks.imagen.predict.body),
        });
      } else {
        await route.continue();
      }
    });
  }

  // Runway API
  if (mocks.runway) {
    await page.route('https://api.runwayml.com/v1/**', async (route: Route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      if ((url.includes('/text_to_video') || url.includes('/image_to_video')) && method === 'POST' && mocks.runway?.createJob) {
        await route.fulfill({
          status: mocks.runway.createJob.status,
          contentType: 'application/json',
          body: JSON.stringify(mocks.runway.createJob.body),
        });
      } else if (url.includes('/tasks/') && method === 'GET' && mocks.runway?.getJob) {
        await route.fulfill({
          status: mocks.runway.getJob.status,
          contentType: 'application/json',
          body: JSON.stringify(mocks.runway.getJob.body),
        });
      } else {
        await route.continue();
      }
    });
  }

  // Veo API
  if (mocks.veo) {
    await page.route('https://generativelanguage.googleapis.com/v1beta/models/**:generateVideo', async (route: Route) => {
      if (mocks.veo?.generateVideos) {
        await route.fulfill({
          status: mocks.veo.generateVideos.status,
          contentType: 'application/json',
          body: JSON.stringify(mocks.veo.generateVideos.body),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('https://generativelanguage.googleapis.com/v1beta/operations/**', async (route: Route) => {
      if (mocks.veo?.getJob) {
        await route.fulfill({
          status: mocks.veo.getJob.status,
          contentType: 'application/json',
          body: JSON.stringify(mocks.veo.getJob.body),
        });
      } else {
        await route.continue();
      }
    });
  }
}

// ============================================================================
// Individual Mock Helper Functions
// ============================================================================

/**
 * Mock text generation for any provider
 */
export async function mockTextGeneration(
  page: Page,
  provider: keyof MockConfig,
  response: MockResponse
): Promise<void> {
  const mocks: MockConfig = {};
  
  switch (provider) {
    case 'openai':
      mocks.openai = { text: response };
      break;
    case 'anthropic':
      mocks.anthropic = { messages: response };
      break;
    case 'kimi':
      mocks.kimi = { text: response };
      break;
    case 'gemini':
      mocks.gemini = { generateContent: response };
      break;
  }
  
  await setupProviderMocks(page, mocks);
}

/**
 * Mock image generation for any provider
 */
export async function mockImageGeneration(
  page: Page,
  provider: 'openai' | 'flux' | 'imagen',
  imageUrl: string
): Promise<void> {
  const mocks: MockConfig = {};
  
  switch (provider) {
    case 'openai':
      mocks.openai = { image: providerMocks.openai.image.success(imageUrl) };
      break;
    case 'flux':
      mocks.flux = {
        submit: providerMocks.flux.submit.success(),
        status: providerMocks.flux.status.completed('task-mock', imageUrl),
      };
      break;
    case 'imagen':
      mocks.imagen = { predict: providerMocks.imagen.predict.success() };
      break;
  }
  
  await setupProviderMocks(page, mocks);
}

/**
 * Mock streaming response for any provider
 */
export async function mockStreamingResponse(
  page: Page,
  provider: 'openai' | 'anthropic' | 'kimi' | 'gemini',
  content: string
): Promise<void> {
  const mocks: MockConfig = {};
  
  switch (provider) {
    case 'openai':
      mocks.openai = { stream: providerMocks.openai.stream.success(content) };
      break;
    case 'anthropic':
      mocks.anthropic = { stream: providerMocks.anthropic.stream.success(content) };
      break;
    case 'kimi':
      mocks.kimi = { stream: providerMocks.kimi.stream.success(content) };
      break;
    case 'gemini':
      mocks.gemini = { streamGenerateContent: providerMocks.gemini.streamGenerateContent.success(content) };
      break;
  }
  
  await setupProviderMocks(page, mocks);
}

/**
 * Mock async job workflow (for video/image providers with polling)
 */
export async function mockAsyncJob(
  page: Page,
  provider: 'flux' | 'runway' | 'veo',
  jobId: string,
  statusSequence: Array<{ status: string; data: MockResponse }>
): Promise<void> {
  let currentIndex = 0;
  
  if (provider === 'flux') {
    await page.route('https://api.bfl.ml/v1/**', async (route: Route) => {
      const url = route.request().url();
      
      if (url.includes('/get_result')) {
        const current = statusSequence[currentIndex];
        if (currentIndex < statusSequence.length - 1) {
          currentIndex++;
        }
        
        await route.fulfill({
          status: current.data.status,
          contentType: 'application/json',
          body: JSON.stringify(current.data.body),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: jobId }),
        });
      }
    });
  } else if (provider === 'runway') {
    await page.route('https://api.runwayml.com/v1/**', async (route: Route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (url.includes('/tasks/') && method === 'GET') {
        const current = statusSequence[currentIndex];
        if (currentIndex < statusSequence.length - 1) {
          currentIndex++;
        }
        
        await route.fulfill({
          status: current.data.status,
          contentType: 'application/json',
          body: JSON.stringify(current.data.body),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: jobId, status: 'pending' }),
        });
      }
    });
  } else if (provider === 'veo') {
    await page.route('https://generativelanguage.googleapis.com/v1beta/**', async (route: Route) => {
      const url = route.request().url();
      
      if (url.includes('/operations/')) {
        const current = statusSequence[currentIndex];
        if (currentIndex < statusSequence.length - 1) {
          currentIndex++;
        }
        
        await route.fulfill({
          status: current.data.status,
          contentType: 'application/json',
          body: JSON.stringify(current.data.body),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ name: `operations/${jobId}` }),
        });
      }
    });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all provider mocks for a page
 */
export async function clearProviderMocks(page: Page): Promise<void> {
  await page.unroute('**/*');
}

/**
 * Wait for a provider request to be made
 */
export async function waitForProviderRequest(
  page: Page,
  provider: string,
  timeout = 5000
): Promise<void> {
  const patterns: Record<string, string> = {
    openai: 'https://api.openai.com',
    anthropic: 'https://api.anthropic.com',
    kimi: 'https://api.moonshot.cn',
    gemini: 'https://generativelanguage.googleapis.com',
    flux: 'https://api.bfl.ml',
    imagen: 'https://generativelanguage.googleapis.com',
    runway: 'https://api.runwayml.com',
    veo: 'https://generativelanguage.googleapis.com',
  };
  
  const pattern = patterns[provider];
  if (!pattern) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  
  await page.waitForRequest((request) => request.url().includes(pattern), { timeout });
}
