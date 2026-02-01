/**
 * Provider Mock Verification Tests
 * 
 * Simple tests to verify that provider mocks work correctly
 */

import { test, expect } from '@playwright/test';
import { setupProviderMocks, providerMocks, waitForProviderRequest } from '../../helpers/provider-mocks';

test.describe('Provider Mock System', () => {
  test('OpenAI text mock intercepts requests', async ({ page }) => {
    await setupProviderMocks(page, {
      openai: { text: providerMocks.openai.text.success('Hello from OpenAI mock!') }
    });

    // Make a direct fetch request to verify interception
    const response = await page.evaluate(async () => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Test' }]
        })
      });
      return res.json();
    });

    expect(response.choices[0].message.content).toBe('Hello from OpenAI mock!');
    expect(response.model).toBe('gpt-4o');
  });

  test('Anthropic messages mock intercepts requests', async ({ page }) => {
    await setupProviderMocks(page, {
      anthropic: { messages: providerMocks.anthropic.messages.success('Hello from Claude!') }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{ role: 'user', content: 'Test' }]
        })
      });
      return res.json();
    });

    expect(response.content[0].text).toBe('Hello from Claude!');
    expect(response.role).toBe('assistant');
  });

  test('Kimi text mock uses OpenAI-compatible format', async ({ page }) => {
    await setupProviderMocks(page, {
      kimi: { text: providerMocks.kimi.text.success('Hello from Kimi!') }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'moonshot-v1-128k',
          messages: [{ role: 'user', content: 'Test' }]
        })
      });
      return res.json();
    });

    expect(response.choices[0].message.content).toBe('Hello from Kimi!');
    expect(response.model).toBe('moonshot-v1-128k');
  });

  test('Gemini generateContent mock works', async ({ page }) => {
    await setupProviderMocks(page, {
      gemini: { generateContent: providerMocks.gemini.generateContent.success('Hello from Gemini!') }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Test' }] }]
        })
      });
      return res.json();
    });

    expect(response.candidates[0].content.parts[0].text).toBe('Hello from Gemini!');
  });

  test('Flux submit mock returns task ID', async ({ page }) => {
    await setupProviderMocks(page, {
      flux: { submit: providerMocks.flux.submit.success('task-flux-123') }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://api.bfl.ml/v1/flux-pro-1.1', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Key': 'test-key'
        },
        body: JSON.stringify({
          prompt: 'A beautiful landscape',
          width: 1024,
          height: 1024
        })
      });
      return res.json();
    });

    expect(response.id).toBe('task-flux-123');
  });

  test('Flux status polling mock works', async ({ page }) => {
    await setupProviderMocks(page, {
      flux: { 
        status: providerMocks.flux.status.completed('task-flux-123', 'https://example.com/image.jpg')
      }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://api.bfl.ml/v1/get_result?id=task-flux-123', {
        headers: { 'X-Key': 'test-key' }
      });
      return res.json();
    });

    expect(response.status).toBe('Ready');
    expect(response.result.sample).toBe('https://example.com/image.jpg');
  });

  test('Imagen predict mock returns base64 image', async ({ page }) => {
    await setupProviderMocks(page, {
      imagen: { predict: providerMocks.imagen.predict.success() }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: 'A cat' }],
          parameters: { sampleCount: 1 }
        })
      });
      return res.json();
    });

    expect(response.predictions).toHaveLength(1);
    expect(response.predictions[0].bytesBase64Encoded).toBeDefined();
  });

  test('Runway createJob mock returns job ID', async ({ page }) => {
    await setupProviderMocks(page, {
      runway: { createJob: providerMocks.runway.createJob.success('job-runway-456') }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://api.runwayml.com/v1/text_to_video', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key'
        },
        body: JSON.stringify({
          model: 'gen4',
          prompt: 'A dancing robot',
          duration: 5
        })
      });
      return res.json();
    });

    expect(response.id).toBe('job-runway-456');
    expect(response.status).toBe('pending');
  });

  test('Runway getJob mock returns status', async ({ page }) => {
    await setupProviderMocks(page, {
      runway: { 
        getJob: providerMocks.runway.getJob.completed('job-runway-456', 'https://example.com/video.mp4')
      }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://api.runwayml.com/v1/tasks/job-runway-456', {
        headers: { 'Authorization': 'Bearer test-key' }
      });
      return res.json();
    });

    expect(response.status).toBe('succeeded');
    expect(response.output[0]).toBe('https://example.com/video.mp4');
  });

  test('Veo generateVideos mock returns operation', async ({ page }) => {
    await setupProviderMocks(page, {
      veo: { generateVideos: providerMocks.veo.generateVideos.success('operations/veo-789') }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/veo-3.0:generateVideo?key=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'A sunset',
          generationConfig: { videoDuration: '8s' }
        })
      });
      return res.json();
    });

    expect(response.name).toBe('operations/veo-789');
  });

  test('Veo getJob mock returns completed operation', async ({ page }) => {
    await setupProviderMocks(page, {
      veo: { 
        getJob: providerMocks.veo.getJob.completed('operations/veo-789', 'https://example.com/veo-video.mp4')
      }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/operations/veo-789?key=test');
      return res.json();
    });

    expect(response.done).toBe(true);
    expect(response.response.generatedVideos[0].video.uri).toBe('https://example.com/veo-video.mp4');
  });

  test('OpenAI streaming mock works', async ({ page }) => {
    await setupProviderMocks(page, {
      openai: { stream: providerMocks.openai.stream.success('Streaming works!') }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Test' }],
          stream: true
        })
      });
      return res.text();
    });

    expect(response).toContain('data:');
    expect(response).toContain('[DONE]');
  });

  test('OpenAI error mock returns proper error format', async ({ page }) => {
    await setupProviderMocks(page, {
      openai: { text: providerMocks.openai.text.error('invalid_api_key', 'Invalid API key') }
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Test' }]
        })
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_api_key');
  });

  test('waitForProviderRequest detects requests', async ({ page }) => {
    await setupProviderMocks(page, {
      openai: { text: providerMocks.openai.text.success('Test') }
    });

    // Start waiting for request
    const requestPromise = waitForProviderRequest(page, 'openai');

    // Trigger the request
    await page.evaluate(async () => {
      await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Test' }]
        })
      });
    });

    // Should resolve without timeout
    await expect(requestPromise).resolves.toBeUndefined();
  });
});
