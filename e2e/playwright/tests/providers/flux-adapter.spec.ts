import { test, expect } from '@playwright/test';

test.describe('Flux Pro Provider Integration', () => {
  test('real image generation works', async ({ page }) => {
    test.skip(process.env.USE_REAL_PROVIDERS !== 'true', 'Requires real provider API key');
    test.skip(!process.env.FLUX_API_KEY, 'FLUX_API_KEY not set');

    await page.goto('/settings/providers');
    await page.click('[data-testid="add-provider"]');
    await page.click('[data-testid="provider-option-flux"]');
    
    await page.fill('[data-testid="api-key-input"]', process.env.FLUX_API_KEY || '');
    await page.click('[data-testid="save-api-key"]');
    
    await expect(page.locator('[data-testid="provider-status"]')).toContainText('active');
    
    await page.goto('/generate/image');
    await page.fill('[data-testid="prompt-input"]', 'A red apple');
    await page.click('[data-testid="generate-btn"]');
    
    // Wait for async job to complete (Flux is async)
    await expect(page.locator('[data-testid="generation-status"]')).toContainText('completed', { timeout: 60000 });
    await expect(page.locator('[data-testid="generated-image"]')).toBeVisible();
  });
});
