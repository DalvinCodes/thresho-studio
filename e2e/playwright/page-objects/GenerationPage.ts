import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Generation page
 * Handles text, image, and video generation workflows
 */
export class GenerationPage extends BasePage {
  async gotoGeneration(type: 'text' | 'image' | 'video' = 'text'): Promise<void> {
    await super.goto(`/generate/${type}`);
  }

  async waitForReady(): Promise<void> {
    await expect(this.page.locator('[data-testid="generation-panel"], [data-testid="generate-page"]')).toBeVisible();
  }

  /**
   * Select a template for generation
   */
  async selectTemplate(templateId: string): Promise<void> {
    await this.clickByTestId('template-select');
    await this.selectOptionByTestId('template-dropdown', templateId);
  }

  /**
   * Fill template variables
   */
  async fillVariables(variables: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(variables)) {
      const input = this.page.locator(`[data-testid="var-${key}"], [data-testid="variable-${key}"]`);
      if (await input.count() > 0) {
        await input.fill(value);
      }
    }
  }

  /**
   * Select a provider for generation
   */
  async selectProvider(provider: string): Promise<void> {
    await this.selectOptionByTestId('provider-select', provider);
  }

  /**
   * Click the generate button
   */
  async generate(): Promise<void> {
    await this.clickByTestId('generate-btn');
  }

  /**
   * Cancel an ongoing generation
   */
  async cancelGeneration(): Promise<void> {
    await this.clickByTestId('cancel-generation');
  }

  /**
   * Type a direct prompt (for non-template generation)
   */
  async typePrompt(prompt: string): Promise<void> {
    await this.fillByTestId('prompt-input', prompt);
  }

  /**
   * Expect stream output to contain expected text
   */
  async expectStreamOutput(expected: string): Promise<void> {
    const output = this.page.locator('[data-testid="stream-output"], [data-testid="generation-output"]');
    await expect(output).toContainText(expected, { timeout: 30000 });
  }

  /**
   * Expect an image to be generated and displayed
   */
  async expectImageGenerated(): Promise<void> {
    const image = this.page.locator('[data-testid="generated-image"], [data-testid="output-image"]');
    await expect(image).toBeVisible({ timeout: 30000 });
    
    // Verify image has loaded
    await expect(image).toHaveAttribute('src', /.+/);
  }

  /**
   * Expect a video to be generated
   */
  async expectVideoGenerated(): Promise<void> {
    const video = this.page.locator('[data-testid="generated-video"], [data-testid="output-video"]');
    await expect(video).toBeVisible({ timeout: 60000 });
  }

  /**
   * Save the generated asset to gallery
   */
  async saveToGallery(): Promise<void> {
    await this.clickByTestId('save-asset');
    await this.waitForNetworkIdle();
  }

  /**
   * Expect an error message to be displayed
   */
  async expectError(message: string): Promise<void> {
    const error = this.page.locator('[data-testid="error-message"], [data-testid="generation-error"]');
    await expect(error).toContainText(message);
  }

  /**
   * Wait for generation to complete
   */
  async waitForGenerationComplete(timeout = 60000): Promise<void> {
    const completeIndicator = this.page.locator('[data-testid="generation-complete"], [data-testid="done"]');
    await expect(completeIndicator).toBeVisible({ timeout });
  }

  /**
   * Check if generation is in progress
   */
  async isGenerating(): Promise<boolean> {
    const generating = this.page.locator('[data-testid="generating"], [data-testid="in-progress"]');
    return await generating.count() > 0 && await generating.isVisible();
  }

  /**
   * Get the generated output text
   */
  async getOutputText(): Promise<string> {
    const output = this.page.locator('[data-testid="stream-output"], [data-testid="generation-output"]');
    return await output.textContent() || '';
  }

  /**
   * Set generation parameters (temperature, max tokens, etc.)
   */
  async setParameter(param: string, value: string | number): Promise<void> {
    const input = this.page.locator(`[data-testid="param-${param}"]`);
    if (await input.count() > 0) {
      await input.fill(String(value));
    }
  }
}
