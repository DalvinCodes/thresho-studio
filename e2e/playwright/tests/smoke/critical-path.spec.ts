import { test, expect } from '@playwright/test';
import { setupProviderMocks, providerMocks } from '../../helpers/provider-mocks';

test.describe('Critical Path Smoke Tests', () => {
  test('app loads successfully', async ({ page }) => {
    await page.goto('/');
    // Wait for app to initialize (may show loading screen first)
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 30000 });
    
    // Check main navigation items are visible
    await expect(page.locator('[data-testid="nav-generate"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-templates"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-assets"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-shotlist"]')).toBeVisible();
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 30000 });
    
    // Test navigation by clicking and checking UI changes
    // Note: This is a SPA with state-based routing, not URL-based
    const navItems = [
      { id: 'nav-generate', text: 'Generate' },
      { id: 'nav-templates', text: 'Templates' },
      { id: 'nav-assets', text: 'Assets' },
      { id: 'nav-shotlist', text: 'Shot List' }
    ];
    
    for (const { id, text } of navItems) {
      await page.click(`[data-testid="${id}"]`);
      // Verify the nav item is now active (has active styling)
      const navButton = page.locator(`[data-testid="${id}"]`);
      await expect(navButton).toHaveClass(/bg-primary\/20|text-primary/);
    }
  });

  test('database initializes without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 30000 });
    
    // Check no error banners are shown
    await expect(page.locator('[data-testid="db-error"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).not.toBeVisible();
  });

  test('provider adapters registered', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 30000 });
    
    // Navigate to settings
    await page.click('[data-testid="nav-settings"]');
    
    // Click add provider button
    await page.click('[data-testid="add-provider"]');
    
    // Check provider options are available
    const providers = [
      'openai', 'anthropic', 'kimi', 'gemini',
      'flux', 'imagen', 'runway', 'veo'
    ];
    
    for (const provider of providers) {
      await expect(page.locator(`[data-testid="provider-option-${provider}"]`)).toBeVisible();
    }
  });

  test('template library loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 30000 });
    
    // Navigate to templates
    await page.click('[data-testid="nav-templates"]');
    
    // Check template list is visible (may be empty)
    await expect(page.locator('[data-testid="template-list"]')).toBeVisible();
  });

  test('generation page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 30000 });
    
    // Navigate to generate
    await page.click('[data-testid="nav-generate"]');
    
    // Check generate button is visible
    await expect(page.locator('[data-testid="generate-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="prompt-input"]')).toBeVisible();
  });
});
