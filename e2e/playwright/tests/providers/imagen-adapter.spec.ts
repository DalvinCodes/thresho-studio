import { test, expect } from '@playwright/test';

test.describe('Imagen 3 Provider Integration', () => {
  test('real image generation works', async ({ page }) => {
    test.skip(process.env.USE_REAL_PROVIDERS !== 'true', 'Requires real provider API key');
    test.skip(!process.env.GEMINI_API_KEY, 'GEMINI_API_KEY not set (Imagen uses Gemini API)');

    await page.goto('/settings/providers');
    await page.click('[data-testid="add-provider"]');
    await page.click('[data-testid="provider-option-imagen"]');
    
    await page.fill('[data-testid="api-key-input"]', process.env.GEMINI_API_KEY || '');
    await page.click('[data-testid="save-api-key"]');
    
    await expect(page.locator('[data-testid="provider-status"]')).toContainText('active');
    
    await page.goto('/generate/image');
    await page.fill('[data-testid="prompt-input"]', 'A blue sky');
    await page.click('[data-testid="generate-btn"]');
    
    await expect(page.locator('[data-testid="generated-image"]')).toBeVisible();
  });
});
