import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Template Editor page
 * Handles template creation, variable management, versioning, and preview
 */
export class TemplateEditorPage extends BasePage {
  async goto(path?: string): Promise<void> {
    const targetPath = path || '/templates/new';
    await super.goto(targetPath);
  }

  async waitForReady(): Promise<void> {
    await expect(this.page.locator('[data-testid="template-editor"], [data-testid="template-form"]')).toBeVisible();
  }

  /**
   * Create a new template with name and content
   */
  async createTemplate(name: string, content: string): Promise<void> {
    await this.fillByTestId('template-name', name);
    await this.fillByTestId('template-content', content);
  }

  /**
   * Add a variable to the template
   */
  async addVariable(name: string, type: string, defaultValue?: string): Promise<void> {
    await this.clickByTestId('add-variable');
    await this.fillByTestId('variable-name', name);
    await this.selectOptionByTestId('variable-type', type);
    if (defaultValue) {
      await this.fillByTestId('variable-default', defaultValue);
    }
    await this.clickByTestId('save-variable');
  }

  /**
   * Save the current template
   */
  async saveTemplate(): Promise<void> {
    await this.clickByTestId('save-template');
    await this.waitForNetworkIdle();
  }

  /**
   * Preview the prompt with sample data
   */
  async previewPrompt(sampleData: Record<string, string>): Promise<void> {
    await this.clickByTestId('preview-btn');
    
    // Fill in sample data for each variable
    for (const [key, value] of Object.entries(sampleData)) {
      const input = this.page.locator(`[data-testid="preview-${key}"], [data-testid="sample-${key}"]`);
      if (await input.count() > 0) {
        await input.fill(value);
      }
    }
    
    await this.clickByTestId('run-preview');
  }

  /**
   * Create a new version of the template
   */
  async createVersion(): Promise<void> {
    await this.clickByTestId('version-history');
    await this.clickByTestId('create-version');
    
    // Fill version details if modal appears
    if (await this.elementExists('version-changelog')) {
      await this.fillByTestId('version-changelog', 'New version created');
      await this.clickByTestId('confirm-version');
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(version: string): Promise<void> {
    await this.clickByTestId('version-history');
    const versionRow = this.page.locator(`[data-testid="version-${version}"]`);
    await versionRow.locator('[data-testid="rollback-btn"]').click();
    
    // Confirm rollback if modal appears
    if (await this.elementExists('confirm-rollback')) {
      await this.clickByTestId('confirm-rollback');
    }
  }

  /**
   * Expect template to be saved successfully
   */
  async expectTemplateSaved(): Promise<void> {
    await this.expectToast('saved');
  }

  /**
   * Get the rendered preview content
   */
  async getPreviewContent(): Promise<string> {
    const preview = this.page.locator('[data-testid="preview-output"], [data-testid="rendered-prompt"]');
    return await preview.textContent() || '';
  }

  /**
   * Expect preview to contain specific text
   */
  async expectPreviewContains(expected: string): Promise<void> {
    const preview = this.page.locator('[data-testid="preview-output"], [data-testid="rendered-prompt"]');
    await expect(preview).toContainText(expected);
  }

  /**
   * Fork the current template
   */
  async forkTemplate(newName?: string): Promise<void> {
    await this.clickByTestId('fork-template');
    
    if (newName && await this.elementExists('fork-name')) {
      await this.fillByTestId('fork-name', newName);
    }
    
    await this.clickByTestId('confirm-fork');
  }

  /**
   * Set template category
   */
  async setCategory(category: string): Promise<void> {
    await this.selectOptionByTestId('template-category', category);
  }

  /**
   * Add tag to template
   */
  async addTag(tag: string): Promise<void> {
    const tagInput = this.page.locator('[data-testid="tag-input"], [data-testid="template-tags"]');
    await tagInput.fill(tag);
    await tagInput.press('Enter');
  }
}
