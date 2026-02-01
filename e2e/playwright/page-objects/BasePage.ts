import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Abstract base class for all page objects
 * Provides common navigation and utility methods
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to a specific path and wait for page to be ready
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForReady();
  }

  /**
   * Abstract method that must be implemented by subclasses
   * Waits for the page to be fully loaded and ready for interaction
   */
  abstract waitForReady(): Promise<void>;

  /**
   * Expect a toast notification with specific message
   */
  async expectToast(message: string): Promise<void> {
    const toast = this.page.locator('[data-testid="toast"], [data-testid="success-toast"], [data-testid="error-toast"]');
    await expect(toast).toContainText(message);
  }

  /**
   * Wait for network to be idle (no network connections for at least 500ms)
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for all loading indicators to disappear
   */
  async waitForLoadingComplete(): Promise<void> {
    const loadingIndicators = this.page.locator('[data-testid="loading"], [data-testid="spinner"], .loading, .spinner');
    await expect(loadingIndicators).toHaveCount(0, { timeout: 10000 });
  }

  /**
   * Get the current URL path
   */
  getCurrentPath(): string {
    return new URL(this.page.url()).pathname;
  }

  /**
   * Check if an element exists on the page
   */
  async elementExists(testId: string): Promise<boolean> {
    const element = this.page.locator(`[data-testid="${testId}"]`);
    return await element.count() > 0;
  }

  /**
   * Wait for an element to be visible
   */
  async waitForElement(testId: string, timeout = 5000): Promise<Locator> {
    const element = this.page.locator(`[data-testid="${testId}"]`);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  /**
   * Click an element by its data-testid
   */
  async clickByTestId(testId: string): Promise<void> {
    await this.page.click(`[data-testid="${testId}"]`);
  }

  /**
   * Fill an input by its data-testid
   */
  async fillByTestId(testId: string, value: string): Promise<void> {
    await this.page.fill(`[data-testid="${testId}"]`, value);
  }

  /**
   * Select an option from a dropdown by data-testid
   */
  async selectOptionByTestId(testId: string, value: string): Promise<void> {
    await this.page.selectOption(`[data-testid="${testId}"]`, value);
  }
}
