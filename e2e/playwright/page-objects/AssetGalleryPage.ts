import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Asset Gallery page
 * Handles asset browsing, filtering, selection, and bulk operations
 */
export class AssetGalleryPage extends BasePage {
  async goto(): Promise<void> {
    await super.goto('/assets');
  }

  async waitForReady(): Promise<void> {
    await expect(this.page.locator('[data-testid="asset-gallery"], [data-testid="asset-grid"]')).toBeVisible();
  }

  /**
   * Filter assets by type (text, image, video)
   */
  async filterByType(type: 'text' | 'image' | 'video'): Promise<void> {
    await this.selectOptionByTestId('type-filter', type);
    await this.waitForNetworkIdle();
  }

  /**
   * Filter assets by date range
   */
  async filterByDate(from: string, to: string): Promise<void> {
    await this.fillByTestId('date-from', from);
    await this.fillByTestId('date-to', to);
    await this.clickByTestId('apply-date-filter');
  }

  /**
   * Filter assets by tag
   */
  async filterByTag(tag: string): Promise<void> {
    await this.clickByTestId('tag-filter');
    await this.selectOptionByTestId('tag-select', tag);
    await this.clickByTestId('apply-tag-filter');
  }

  /**
   * Search assets by query
   */
  async search(query: string): Promise<void> {
    await this.fillByTestId('search-input', query);
    await this.page.keyboard.press('Enter');
    await this.waitForNetworkIdle();
  }

  /**
   * Enter selection mode for bulk operations
   */
  async enterSelectMode(): Promise<void> {
    await this.clickByTestId('select-mode-btn');
    await expect(this.page.locator('[data-testid="selection-toolbar"]')).toBeVisible();
  }

  /**
   * Select specific assets by their indices
   */
  async selectAssets(indices: number[]): Promise<void> {
    for (const index of indices) {
      const checkbox = this.page.locator(`[data-testid="asset-${index}-checkbox"]`);
      await checkbox.check();
    }
  }

  /**
   * Select all assets
   */
  async selectAll(): Promise<void> {
    await this.clickByTestId('select-all-btn');
  }

  /**
   * Apply a tag to selected assets
   */
  async bulkTag(tag: string): Promise<void> {
    await this.clickByTestId('bulk-tag-btn');
    await this.fillByTestId('tag-input', tag);
    await this.clickByTestId('apply-tags');
    await this.waitForNetworkIdle();
  }

  /**
   * Delete selected assets
   */
  async bulkDelete(): Promise<void> {
    await this.clickByTestId('bulk-delete-btn');
    
    if (await this.elementExists('confirm-delete')) {
      await this.clickByTestId('confirm-delete');
    }
    
    await this.waitForNetworkIdle();
  }

  /**
   * Export an asset in specified format
   */
  async exportAsset(index: number, format: string): Promise<void> {
    // Open asset details
    await this.page.click(`[data-testid="asset-${index}"]`);
    
    await this.clickByTestId('export-btn');
    await this.selectOptionByTestId('export-format', format);
    await this.clickByTestId('confirm-export');
    
    // Wait for download
    await this.page.waitForTimeout(1000);
  }

  /**
   * Expect a specific count of assets to be visible
   */
  async expectAssetCount(count: number): Promise<void> {
    await expect(this.page.locator('[data-testid="asset-card"]')).toHaveCount(count);
  }

  /**
   * Expect an asset with specific name to be visible
   */
  async expectAssetVisible(name: string): Promise<void> {
    const asset = this.page.locator(`[data-testid="asset-card"]:has-text("${name}")`);
    await expect(asset).toBeVisible();
  }

  /**
   * Get the current asset count
   */
  async getAssetCount(): Promise<number> {
    return await this.page.locator('[data-testid="asset-card"]').count();
  }

  /**
   * Click on an asset to view details
   */
  async viewAsset(index: number): Promise<void> {
    await this.page.click(`[data-testid="asset-${index}"]`);
    await expect(this.page.locator('[data-testid="asset-detail"]')).toBeVisible();
  }

  /**
   * Toggle favorite status for an asset
   */
  async toggleFavorite(index: number): Promise<void> {
    await this.page.click(`[data-testid="asset-${index}-favorite"]`);
  }

  /**
   * Archive an asset
   */
  async archiveAsset(index: number): Promise<void> {
    await this.page.click(`[data-testid="asset-${index}-archive"]`);
  }

  /**
   * Clear all filters
   */
  async clearFilters(): Promise<void> {
    await this.clickByTestId('clear-filters');
  }

  /**
   * Sort assets by field
   */
  async sortBy(field: 'name' | 'date' | 'type' | 'size'): Promise<void> {
    await this.selectOptionByTestId('sort-field', field);
  }

  /**
   * Toggle sort direction
   */
  async toggleSortDirection(): Promise<void> {
    await this.clickByTestId('sort-direction');
  }

  /**
   * Scroll to load more assets (for virtual scrolling)
   */
  async scrollToLoadMore(): Promise<void> {
    const gallery = this.page.locator('[data-testid="asset-grid"], [data-testid="asset-gallery"]');
    await gallery.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await this.page.waitForTimeout(500);
  }
}
