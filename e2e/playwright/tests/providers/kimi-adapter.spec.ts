import { test, expect } from '@playwright/test';

test.describe('Kimi Provider Integration', () => {
  test('real text generation works', async ({ page }) => {
    test.skip(process.env.USE_REAL_PROVIDERS !== 'true', 'Requires real provider API key');
    test.skip(!process.env.KIMI_API_KEY, 'KIMI_API_KEY not set');

    await page.goto('/settings/providers');
    await page.click('[data-testid="add-provider"]');
    await page.click('[data-testid="provider-option-kimi"]');
    
    await page.fill('[data-testid="api-key-input"]', process.env.KIMI_API_KEY || '');
    await page.click('[data-testid="save-api-key"]');
    
    await expect(page.locator('[data-testid="provider-status"]')).toContainText('active');
    
    await page.goto('/generate/text');
    await page.fill('[data-testid="prompt-input"]', 'Say hello');
    await page.click('[data-testid="generate-btn"]');
    
    await expect(page.locator('[data-testid="stream-output"]')).toBeVisible();
    await expect(page.locator('[data-testid="stream-output"]')).not.toBeEmpty();
  });
});
