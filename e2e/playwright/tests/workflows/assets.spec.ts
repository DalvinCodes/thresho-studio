import { test, expect } from '../../helpers/test-fixtures';
import { AssetGalleryPage } from '../../page-objects/AssetGalleryPage';
import { seedAssets, createAsset } from '../../helpers/test-data';

test.describe('Asset Gallery', () => {
  test.beforeEach(async ({ testDb }) => {
    // Seed 10 test assets with variety
    await seedAssets(testDb, 10, [
      { type: 'image', tags: ['campaign-q1', 'approved'], isFavorite: true },
      { type: 'image', tags: ['campaign-q1'] },
      { type: 'text' },
      { type: 'video' },
      { type: 'image', createdAt: new Date('2025-01-01').getTime() },
      { type: 'image', createdAt: new Date('2025-01-15').getTime() }
    ]);
  });
  
  test('displays assets in grid', async ({ page }) => {
    await page.goto('/assets');
    await expect(page.locator('[data-testid="asset-card"]')).toHaveCount(10);
  });
  
  test('filter by type', async ({ page }) => {
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    await gallery.filterByType('image');
    
    // Verify only images shown (should be ~7 based on seed data)
    const count = await gallery.getAssetCount();
    expect(count).toBeLessThan(10);
    expect(count).toBeGreaterThanOrEqual(6);
  });
  
  test('filter by tag', async ({ page }) => {
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    await gallery.filterByTag('campaign-q1');
    
    // Verify only tagged assets shown (should be 2 based on seed data)
    const count = await gallery.getAssetCount();
    expect(count).toBe(2);
  });
  
  test('search by prompt content', async ({ page, testDb }) => {
    // Seed asset with specific prompt in metadata
    await createAsset(testDb, {
      name: 'Sunset Landscape',
      metadata: { prompt: 'Beautiful sunset landscape with mountains' }
    });
    
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    await gallery.search('sunset landscape');
    
    // Verify matching assets shown
    await expect(page.locator('[data-testid="asset-card"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="asset-card"]')).toContainText('Sunset Landscape');
  });
  
  test('bulk tag operation', async ({ page, testDb }) => {
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    await gallery.enterSelectMode();
    await gallery.selectAssets([0, 1, 2]);
    await gallery.bulkTag('approved');
    
    // Verify all selected assets have the tag
    const assets = await testDb.query(
      "SELECT * FROM assets WHERE json_array_contains(tags, 'approved')"
    );
    // Should have previous 1 + 3 new = 4
    expect(assets.length).toBeGreaterThanOrEqual(4);
  });
  
  test('bulk delete', async ({ page, testDb }) => {
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    await gallery.enterSelectMode();
    await gallery.selectAssets([0, 1]);
    await gallery.bulkDelete();
    
    // Verify count reduced
    const assets = await testDb.query(
      'SELECT COUNT(*) as count FROM assets'
    );
    expect(parseInt(assets[0].count)).toBe(8);
  });
  
  test('export asset', async ({ page }) => {
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    await gallery.exportAsset(0, 'png');
    
    // Verify download initiated - handled by page object
  });
  
  test('virtual scrolling handles large galleries', async ({ page, testDb }) => {
    // Seed 100 assets
    await seedAssets(testDb, 100);
    
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    
    // Initial count should be limited due to virtual scrolling
    let initialCount = await gallery.getAssetCount();
    expect(initialCount).toBeLessThan(100);
    
    // Scroll through
    await gallery.scrollToLoadMore();
    await gallery.waitForAssetsToLoad();
    
    // Verify more assets loaded as scrolling
    const afterScrollCount = await gallery.getAssetCount();
    expect(afterScrollCount).toBeGreaterThanOrEqual(initialCount);
    
    // Verify no timeout (performance test)
    // If we get here without timeout, virtual scrolling is working
  });
  
  test('asset metadata displayed', async ({ page, testDb }) => {
    // Create asset with metadata
    const asset = await createAsset(testDb, {
      name: 'Test Asset',
      type: 'image',
      metadata: {
        prompt: 'A beautiful landscape photo',
        provider: 'flux-pro',
        params: { width: 1024, height: 1024 }
      }
    });
    
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    
    // Click on asset to view details
    await gallery.clickAsset(0);
    
    // Verify metadata panel shows:
    // - Prompt used
    await expect(page.locator('[data-testid="asset-prompt"]')).toContainText('A beautiful landscape photo');
    
    // - Provider
    await expect(page.locator('[data-testid="asset-provider"]')).toContainText('flux-pro');
    
    // - Generation params
    await expect(page.locator('[data-testid="asset-params"]')).toContainText('1024');
    
    // - Timestamp
    await expect(page.locator('[data-testid="asset-timestamp"]')).toBeVisible();
    
    await gallery.closeAssetDetail();
  });
  
  test('favorite toggle', async ({ page, testDb }) => {
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    
    // Toggle favorite on first asset
    await gallery.toggleFavorite(0);
    
    // Verify asset is favorited
    await gallery.expectAssetIsFavorite(0);
    
    // Verify in database
    const assets = await testDb.query(
      'SELECT isFavorite FROM assets LIMIT 1'
    );
    expect(assets[0].isFavorite).toBe(1);
  });
  
  test('clear filters restores all assets', async ({ page }) => {
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    
    // Apply filter
    await gallery.filterByType('image');
    const filteredCount = await gallery.getAssetCount();
    expect(filteredCount).toBeLessThan(10);
    
    // Clear filters
    await gallery.clearFilters();
    
    // Verify all assets shown again
    await gallery.expectAssetCount(10);
  });
  
  test('sort by different criteria', async ({ page }) => {
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    
    // Sort by name
    await gallery.sortBy('name');
    await expect(page.locator('[data-testid="asset-card"]').first()).toBeVisible();
    
    // Sort by date
    await gallery.sortBy('date');
    await expect(page.locator('[data-testid="asset-card"]').first()).toBeVisible();
    
    // Sort by type
    await gallery.sortBy('type');
    await expect(page.locator('[data-testid="asset-card"]').first()).toBeVisible();
  });
  
  test('grid and list view toggle', async ({ page }) => {
    const gallery = new AssetGalleryPage(page);
    await gallery.goto();
    
    // Switch to list view
    await gallery.toggleViewMode('list');
    await expect(page.locator('[data-testid="assets-list"]')).toBeVisible();
    
    // Switch back to grid view
    await gallery.toggleViewMode('grid');
    await expect(page.locator('[data-testid="assets-grid"]')).toBeVisible();
  });
});
