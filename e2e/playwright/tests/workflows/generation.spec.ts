import { test, expect } from '../../helpers/test-fixtures';
import { GenerationPage } from '../../page-objects/GenerationPage';
import { setupProviderMocks, providerMocks } from '../../helpers/provider-mocks';
import { createBrand, createTemplate, createProviderConfig } from '../../helpers/test-data';

test.describe('Generation Workflows', () => {
  test('text generation streams correctly', async ({ page }) => {
    // Mock streaming response
    await setupProviderMocks(page, {
      openai: { 
        stream: providerMocks.openai.stream.success('Hello world!')
      }
    });
    
    const genPage = new GenerationPage(page);
    await genPage.gotoGeneration('text');
    await genPage.selectProvider('openai');
    await genPage.typePrompt('Say hello');
    await genPage.generate();
    
    // Verify progressive streaming
    await genPage.expectStreamOutput('Hello');
    await genPage.expectStreamOutput('Hello world!');
  });
  
  test('can cancel text generation', async ({ page }) => {
    // Mock slow streaming response
    await setupProviderMocks(page, {
      openai: { 
        stream: {
          status: 200,
          body: providerMocks.openai.stream.success('This is a very long response that takes time').body,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          }
        }
      }
    });
    
    const genPage = new GenerationPage(page);
    await genPage.gotoGeneration('text');
    await genPage.typePrompt('Write a long story');
    await genPage.generate();
    
    // Wait for generation to start
    await page.waitForTimeout(500);
    
    // Cancel generation
    await genPage.cancelGeneration();
    
    // Verify cancelled state shown
    await expect(page.locator('[data-testid="generation-cancelled"], [data-testid="cancelled"]')).toBeVisible();
  });
  
  test('image generation and save to gallery', async ({ page, testDb }) => {
    await setupProviderMocks(page, {
      flux: {
        submit: providerMocks.flux.submit.success('mock-task'),
        status: providerMocks.flux.status.completed('mock-task', '/fixtures/images/test-generated.svg')
      }
    });
    
    const genPage = new GenerationPage(page);
    await genPage.gotoGeneration('image');
    await genPage.selectProvider('flux-pro');
    await genPage.typePrompt('A sunset landscape');
    await genPage.generate();
    
    // Wait for image to be generated
    await genPage.expectImageGenerated();
    
    // Save to gallery
    await genPage.saveToGallery();
    
    // Verify in database
    const assets = await testDb.query(
      'SELECT * FROM assets WHERE type = ?',
      ['image']
    );
    expect(assets).toHaveLength(1);
  });
  
  test('uses selected provider', async ({ page, testDb }) => {
    // Configure multiple providers
    await createProviderConfig(testDb, 'openai', 'sk-mock-openai', { 
      name: 'OpenAI Test',
      isActive: true 
    });
    await createProviderConfig(testDb, 'anthropic', 'sk-mock-anthropic', { 
      name: 'Anthropic Test',
      isActive: true 
    });
    
    // Mock both providers but track which is called
    let openaiCalled = false;
    let anthropicCalled = false;
    
    await page.route('**/api/providers/openai/**', async (route) => {
      openaiCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{ message: { content: 'OpenAI response' } }]
        })
      });
    });
    
    await page.route('**/api/providers/anthropic/**', async (route) => {
      anthropicCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ text: 'Anthropic response' }]
        })
      });
    });
    
    const genPage = new GenerationPage(page);
    await genPage.gotoGeneration('text');
    
    // Select Anthropic specifically
    await genPage.selectProvider('anthropic');
    await genPage.typePrompt('Test prompt');
    await genPage.generate();
    
    // Wait for response
    await page.waitForTimeout(1000);
    
    // Verify only Anthropic was called
    expect(anthropicCalled).toBe(true);
    expect(openaiCalled).toBe(false);
  });
  
  test('shows error on provider failure', async ({ page }) => {
    await setupProviderMocks(page, {
      openai: { 
        text: providerMocks.openai.text.error('rate_limit', 'Rate limit exceeded')
      }
    });
    
    const genPage = new GenerationPage(page);
    await genPage.gotoGeneration('text');
    await genPage.selectProvider('openai');
    await genPage.typePrompt('Test');
    await genPage.generate();
    
    // Verify error shown
    await genPage.expectError('Rate limit exceeded');
  });
  
  test('tracks generation in history', async ({ page, testDb }) => {
    // Create a provider config
    const { providerId } = await createProviderConfig(testDb, 'openai', 'sk-test', {
      name: 'Test Provider'
    });
    
    // Create a template
    const template = await createTemplate(testDb, {
      name: 'Test Template',
      outputType: 'text'
    });
    
    // Mock successful generation
    await setupProviderMocks(page, {
      openai: {
        text: providerMocks.openai.text.success('Generated content')
      }
    });
    
    const genPage = new GenerationPage(page);
    await genPage.gotoGeneration('text');
    await genPage.selectTemplate(template.id);
    await genPage.selectProvider('openai');
    await genPage.generate();
    
    // Wait for generation to complete
    await genPage.waitForGenerationComplete();
    
    // Check generation_records table
    const records = await testDb.query(
      'SELECT * FROM generation_records WHERE providerId = ? AND promptTemplateId = ?',
      [providerId, template.id]
    );
    
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toMatchObject({
      providerId,
      promptTemplateId: template.id,
      type: 'text',
      status: 'completed'
    });
  });
  
  test('video generation async flow', async ({ page }) => {
    // Mock Runway job submission and status polling
    let statusCallCount = 0;
    
    await page.route('**/api/providers/runway/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/submit') || route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-video-job',
            status: 'queued'
          })
        });
      } else if (url.includes('/status')) {
        statusCallCount++;
        const statuses = ['queued', 'processing', 'completed'];
        const status = statuses[Math.min(statusCallCount - 1, 2)];
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-video-job',
            status,
            progress: status === 'processing' ? 50 : status === 'completed' ? 100 : 0,
            output: status === 'completed' ? ['/fixtures/videos/test-video.mp4'] : undefined
          })
        });
      }
    });
    
    const genPage = new GenerationPage(page);
    await genPage.gotoGeneration('video');
    await genPage.selectProvider('runway');
    await genPage.typePrompt('A cat playing piano');
    await genPage.generate();
    
    // Verify progress updates
    await expect(page.locator('[data-testid="generation-progress"]')).toContainText('queued');
    
    // Wait for processing state
    await page.waitForTimeout(1500);
    
    // Verify completion
    await genPage.expectVideoGenerated();
  });
});
