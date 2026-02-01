import { test, expect } from '@playwright/test';

test.describe('Veo 3 Provider Integration', () => {
  test('real video generation works', async ({ page }) => {
    test.skip(process.env.USE_REAL_PROVIDERS !== 'true', 'Requires real provider API key');
    test.skip(!process.env.VEO_API_KEY, 'VEO_API_KEY not set');

    await page.goto('/settings/providers');
    await page.click('[data-testid="add-provider"]');
    await page.click('[data-testid="provider-option-veo"]');
    
    await page.fill('[data-testid="api-key-input"]', process.env.VEO_API_KEY || '');
    await page.click('[data-testid="save-api-key"]');
    
    await expect(page.locator('[data-testid="provider-status"]')).toContainText('active');
    
    await page.goto('/generate/video');
    await page.fill('[data-testid="prompt-input"]', 'A sunset over mountains');
    await page.click('[data-testid="generate-btn"]');
    
    // Wait for async job to complete (Veo is async)
    await expect(page.locator('[data-testid="generation-status"]')).toContainText('completed', { timeout: 120000 });
    await expect(page.locator('[data-testid="generated-video"]')).toBeVisible();
  });
});
