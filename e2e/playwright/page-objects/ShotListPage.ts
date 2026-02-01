import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Partial Shot type for test data
 */
export interface Shot {
  name?: string;
  description?: string;
  shotType?: string;
  cameraMovement?: string;
  lighting?: string;
  aspectRatio?: string;
  duration?: number;
  location?: string;
  subjects?: string[];
  priority?: number;
  tags?: string[];
}

/**
 * Page object for Shot List page
 * Handles shot list creation, shot management, and storyboard operations
 */
export class ShotListPage extends BasePage {
  async goto(id?: string): Promise<void> {
    const path = id ? `/shot-lists/${id}` : '/shot-lists';
    await super.goto(path);
  }

  async waitForReady(): Promise<void> {
    await expect(this.page.locator('[data-testid="shot-list-container"], [data-testid="shot-list-view"]')).toBeVisible();
  }

  /**
   * Create a new shot list
   */
  async createShotList(name: string, projectType: string): Promise<void> {
    await this.clickByTestId('new-shot-list');
    await this.fillByTestId('shot-list-name', name);
    await this.selectOptionByTestId('project-type', projectType);
    await this.clickByTestId('create-btn');
    await this.waitForNetworkIdle();
  }

  /**
   * Use AI to suggest shots from a brief
   */
  async aiSuggestShots(brief: string): Promise<void> {
    await this.clickByTestId('ai-suggest');
    await this.fillByTestId('suggestion-brief', brief);
    await this.clickByTestId('generate-suggestions');
    // Wait for suggestions to appear
    await this.page.waitForTimeout(2000);
  }

  /**
   * Add a new shot to the list
   */
  async addShot(shotData: Partial<Shot>): Promise<void> {
    await this.clickByTestId('add-shot');
    
    if (shotData.name) {
      await this.fillByTestId('shot-name', shotData.name);
    }
    
    if (shotData.description) {
      await this.fillByTestId('shot-description', shotData.description);
    }
    
    if (shotData.shotType) {
      await this.selectOptionByTestId('shot-type', shotData.shotType);
    }
    
    if (shotData.cameraMovement) {
      await this.selectOptionByTestId('shot-movement', shotData.cameraMovement);
    }
    
    if (shotData.lighting) {
      await this.selectOptionByTestId('shot-lighting', shotData.lighting);
    }
    
    if (shotData.aspectRatio) {
      await this.selectOptionByTestId('shot-aspect', shotData.aspectRatio);
    }
    
    await this.clickByTestId('save-shot');
  }

  /**
   * Edit an existing shot by its number
   */
  async editShot(shotNumber: number, data: Partial<Shot>): Promise<void> {
    await this.page.click(`[data-testid="shot-${shotNumber}-edit"]`);
    
    if (data.name) {
      await this.fillByTestId('shot-name', data.name);
    }
    
    if (data.description) {
      await this.fillByTestId('shot-description', data.description);
    }
    
    await this.clickByTestId('save-shot');
  }

  /**
   * Generate an image for a specific shot
   */
  async generateShot(shotNumber: number): Promise<void> {
    await this.page.click(`[data-testid="shot-${shotNumber}-generate"]`);
    // Wait for generation to complete
    await this.page.waitForSelector(`[data-testid="shot-${shotNumber}-status"]:has-text("Generated")`, {
      timeout: 30000
    });
  }

  /**
   * Batch generate images for multiple shots
   */
  async batchGenerate(shotNumbers: number[]): Promise<void> {
    // Select shots
    for (const num of shotNumbers) {
      await this.page.click(`[data-testid="shot-${num}-select"]`);
    }
    
    await this.clickByTestId('batch-generate');
    
    // Wait for all to complete
    for (const num of shotNumbers) {
      await this.page.waitForSelector(`[data-testid="shot-${num}-status"]:has-text("Generated")`, {
        timeout: 60000
      });
    }
  }

  /**
   * Switch to table view
   */
  async switchToTableView(): Promise<void> {
    await this.clickByTestId('table-view-btn');
    await expect(this.page.locator('[data-testid="shot-table"]')).toBeVisible();
  }

  /**
   * Switch to storyboard view
   */
  async switchToStoryboardView(): Promise<void> {
    await this.clickByTestId('storyboard-view-btn');
    await expect(this.page.locator('[data-testid="storyboard-grid"]')).toBeVisible();
  }

  /**
   * Drag a shot from one position to another
   */
  async dragShot(fromIndex: number, toIndex: number): Promise<void> {
    const fromShot = this.page.locator(`[data-testid="shot-${fromIndex}"]`);
    const toShot = this.page.locator(`[data-testid="shot-${toIndex}"]`);
    
    await fromShot.dragTo(toShot);
  }

  /**
   * Export storyboard in specified format
   */
  async exportStoryboard(format: 'pdf' | 'images' | 'csv'): Promise<void> {
    await this.clickByTestId('export-btn');
    await this.selectOptionByTestId('export-format', format);
    await this.clickByTestId('confirm-export');
    
    // Wait for download to start
    await this.page.waitForTimeout(1000);
  }

  /**
   * Expect a specific number of shots in the list
   */
  async expectShotCount(count: number): Promise<void> {
    await expect(this.page.locator('[data-testid="shot-row"]')).toHaveCount(count);
  }

  /**
   * Expect a shot to have a specific status
   */
  async expectShotStatus(shotNumber: number, status: string): Promise<void> {
    const statusBadge = this.page.locator(`[data-testid="shot-${shotNumber}-status"]`);
    await expect(statusBadge).toContainText(status);
  }

  /**
   * Get the current shot count
   */
  async getShotCount(): Promise<number> {
    return await this.page.locator('[data-testid="shot-row"]').count();
  }

  /**
   * Delete a shot by number
   */
  async deleteShot(shotNumber: number): Promise<void> {
    await this.page.click(`[data-testid="shot-${shotNumber}-delete"]`);
    
    if (await this.elementExists('confirm-delete')) {
      await this.clickByTestId('confirm-delete');
    }
  }

  /**
   * Duplicate a shot
   */
  async duplicateShot(shotNumber: number): Promise<void> {
    await this.page.click(`[data-testid="shot-${shotNumber}-duplicate"]`);
  }
}
