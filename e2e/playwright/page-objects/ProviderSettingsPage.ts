import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Provider Settings page
 * Handles provider configuration, API key management, and validation
 */
export class ProviderSettingsPage extends BasePage {
  async goto(): Promise<void> {
    await super.goto('/settings/providers');
  }

  async waitForReady(): Promise<void> {
    await expect(this.page.locator('[data-testid="provider-settings-page"], [data-testid="provider-list"]')).toBeVisible();
  }

  /**
   * Add a new provider by type
   */
  async addProvider(providerType: string): Promise<void> {
    await this.clickByTestId('add-provider');
    await this.waitForElement('provider-select');
    await this.selectOptionByTestId('provider-select', providerType);
  }

  /**
   * Set API key for a specific provider
   */
  async setApiKey(provider: string, key: string): Promise<void> {
    const apiKeyInput = this.page.locator(`[data-testid="${provider}-api-key"], [data-testid="api-key-input"]`);
    await apiKeyInput.fill(key);
  }

  /**
   * Click validate button to validate provider credentials
   */
  async validateProvider(provider: string): Promise<void> {
    await this.clickByTestId('validate-btn');
    // Wait for validation to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Expect provider to show as active/validated
   */
  async expectProviderActive(provider: string): Promise<void> {
    const statusBadge = this.page.locator(`[data-testid="${provider}-status"], [data-testid="status-badge"]`);
    await expect(statusBadge).toContainText(/active|validated|connected/i);
  }

  /**
   * Expect provider to show error state with specific message
   */
  async expectProviderError(provider: string, message: string): Promise<void> {
    const errorElement = this.page.locator(`[data-testid="${provider}-error"], [data-testid="error-message"], [data-testid="provider-error"]`);
    await expect(errorElement).toContainText(message);
  }

  /**
   * Toggle provider active/inactive state
   */
  async toggleProvider(provider: string): Promise<void> {
    const toggle = this.page.locator(`[data-testid="${provider}-toggle"]`);
    await toggle.click();
  }

  /**
   * Remove a provider configuration
   */
  async removeProvider(provider: string): Promise<void> {
    const removeBtn = this.page.locator(`[data-testid="${provider}-remove"]`);
    await removeBtn.click();
    // Confirm deletion if modal appears
    if (await this.elementExists('confirm-delete')) {
      await this.clickByTestId('confirm-delete');
    }
  }

  /**
   * Check if provider is configured
   */
  async isProviderConfigured(provider: string): Promise<boolean> {
    return await this.elementExists(`${provider}-configured`) || 
           await this.elementExists(`${provider}-status`);
  }

  /**
   * Get list of configured providers
   */
  async getConfiguredProviders(): Promise<string[]> {
    const providerElements = this.page.locator('[data-testid^="provider-"][data-testid$="-status"]');
    const count = await providerElements.count();
    const providers: string[] = [];
    for (let i = 0; i < count; i++) {
      const testId = await providerElements.nth(i).getAttribute('data-testid');
      if (testId) {
        const provider = testId.replace('-status', '').replace('provider-', '');
        providers.push(provider);
      }
    }
    return providers;
  }
}
