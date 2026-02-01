import { test, expect } from '../../helpers/test-fixtures';
import { ProviderSettingsPage } from '../../page-objects/ProviderSettingsPage';
import { setupProviderMocks, providerMocks } from '../../helpers/provider-mocks';

test.describe('Provider Setup', () => {
  test('can add OpenAI provider', async ({ page }) => {
    const providerPage = new ProviderSettingsPage(page);
    await providerPage.goto();
    await providerPage.addProvider('openai');
    await providerPage.setApiKey('openai', 'sk-mock-key');
    await providerPage.validateProvider('openai');
    await providerPage.expectProviderActive('openai');
  });

  test('shows error for invalid OpenAI credentials', async ({ page }) => {
    // Mock 401 error
    await setupProviderMocks(page, {
      openai: { text: providerMocks.openai.text.error('invalid_api_key', 'Invalid API key') }
    });

    const providerPage = new ProviderSettingsPage(page);
    await providerPage.goto();
    await providerPage.addProvider('openai');
    await providerPage.setApiKey('openai', 'invalid-key');
    await providerPage.validateProvider('openai');
    await providerPage.expectProviderError('openai', 'Invalid API key');
  });

  test('can configure multiple providers', async ({ page }) => {
    // Setup mocks for all providers
    await setupProviderMocks(page, {
      openai: { text: providerMocks.openai.text.success('Valid') },
      anthropic: { text: providerMocks.anthropic.text.success('Valid') },
      flux: { 
        submit: providerMocks.flux.submit.success('task-123'),
        status: providerMocks.flux.status.completed('task-123', 'https://example.com/image.jpg')
      }
    });

    const providerPage = new ProviderSettingsPage(page);
    await providerPage.goto();

    // Add OpenAI
    await providerPage.addProvider('openai');
    await providerPage.setApiKey('openai', 'sk-openai-mock-key');
    await providerPage.validateProvider('openai');

    // Add Anthropic
    await providerPage.addProvider('anthropic');
    await providerPage.setApiKey('anthropic', 'sk-ant-mock-key');
    await providerPage.validateProvider('anthropic');

    // Add Flux
    await providerPage.addProvider('flux');
    await providerPage.setApiKey('flux', 'bfl-mock-key');
    await providerPage.validateProvider('flux');

    // Verify all providers are shown in active list
    await providerPage.expectProviderActive('openai');
    await providerPage.expectProviderActive('anthropic');
    await providerPage.expectProviderActive('flux');
  });

  test('can delete provider', async ({ page }) => {
    // Setup mock
    await setupProviderMocks(page, {
      openai: { text: providerMocks.openai.text.success('Valid') }
    });

    const providerPage = new ProviderSettingsPage(page);
    await providerPage.goto();

    // Add provider
    await providerPage.addProvider('openai');
    await providerPage.setApiKey('openai', 'sk-mock-key');
    await providerPage.validateProvider('openai');
    await providerPage.expectProviderActive('openai');

    // Delete it
    await providerPage.deleteProvider('openai');

    // Verify removed from list
    await providerPage.expectProviderNotActive('openai');
  });

  test('can edit provider API key', async ({ page }) => {
    // Setup mocks - first validation fails, second succeeds
    await setupProviderMocks(page, {
      openai: { 
        text: providerMocks.openai.text.error('invalid_api_key', 'Invalid API key')
      }
    });

    const providerPage = new ProviderSettingsPage(page);
    await providerPage.goto();

    // Add provider with invalid key
    await providerPage.addProvider('openai');
    await providerPage.setApiKey('openai', 'old-invalid-key');
    await providerPage.validateProvider('openai');
    await providerPage.expectProviderError('openai', 'Invalid API key');

    // Update mock to return success
    await setupProviderMocks(page, {
      openai: { text: providerMocks.openai.text.success('Valid') }
    });

    // Edit with new key
    await providerPage.editProvider('openai');
    await providerPage.setApiKey('openai', 'sk-new-valid-key');
    await providerPage.validateProvider('openai');
    await providerPage.expectProviderActive('openai');
  });

  test('shows all available provider options', async ({ page }) => {
    const providerPage = new ProviderSettingsPage(page);
    await providerPage.goto();

    // Click add provider to see options
    await providerPage.openAddProviderDialog();

    // Verify all providers are available
    const expectedProviders = [
      'OpenAI',
      'Anthropic',
      'Kimi',
      'Gemini',
      'Flux Pro',
      'Imagen 3',
      'Runway Gen-4',
      'Veo 3'
    ];

    for (const provider of expectedProviders) {
      await providerPage.expectProviderOptionAvailable(provider);
    }
  });
});
