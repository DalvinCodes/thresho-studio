import { test, expect } from '@playwright/test';

test.describe('OpenAI Provider Integration', () => {
  test('real text generation works', async ({ page }) => {
    // Only runs with USE_REAL_PROVIDERS=true
    test.skip(process.env.USE_REAL_PROVIDERS !== 'true', 'Requires real provider API key');

    // Navigate to settings and add OpenAI provider
    await page.goto('/settings/providers');
    await page.click('[data-testid="add-provider"]');
    await page.click('[data-testid="provider-option-openai"]');
    
    // Enter API key
    await page.fill('[data-testid="api-key-input"]', process.env.OPENAI_API_KEY || '');
    await page.click('[data-testid="save-api-key"]');
    
    // Wait for validation
    await expect(page.locator('[data-testid="provider-status"]')).toContainText('active');
    
    // Test generation
    await page.goto('/generate/text');
    await page.fill('[data-testid="prompt-input"]', 'Say hello');
    await page.click('[data-testid="generate-btn"]');
    
    // Verify output
    await expect(page.locator('[data-testid="stream-output"]')).toBeVisible();
    await expect(page.locator('[data-testid="stream-output"]')).not.toBeEmpty();
  });
});
