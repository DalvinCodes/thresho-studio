import { test, expect } from '@playwright/test';
import { 
  ProviderSettingsPage,
  TemplateEditorPage,
  GenerationPage,
  ShotListPage,
  BrandEditorPage,
  AssetGalleryPage
} from '../../page-objects';

/**
 * Verification tests for all page objects
 * These ensure the POM classes are properly structured and can be instantiated
 */

test.describe('Page Object Verification', () => {
  
  test('ProviderSettingsPage can be instantiated', async ({ page }) => {
    const providerPage = new ProviderSettingsPage(page);
    expect(providerPage).toBeDefined();
    expect(typeof providerPage.goto).toBe('function');
    expect(typeof providerPage.addProvider).toBe('function');
    expect(typeof providerPage.setApiKey).toBe('function');
    expect(typeof providerPage.validateProvider).toBe('function');
    expect(typeof providerPage.expectProviderActive).toBe('function');
  });

  test('TemplateEditorPage can be instantiated', async ({ page }) => {
    const templatePage = new TemplateEditorPage(page);
    expect(templatePage).toBeDefined();
    expect(typeof templatePage.goto).toBe('function');
    expect(typeof templatePage.createTemplate).toBe('function');
    expect(typeof templatePage.addVariable).toBe('function');
    expect(typeof templatePage.saveTemplate).toBe('function');
    expect(typeof templatePage.previewPrompt).toBe('function');
    expect(typeof templatePage.createVersion).toBe('function');
    expect(typeof templatePage.rollbackToVersion).toBe('function');
  });

  test('GenerationPage can be instantiated', async ({ page }) => {
    const generationPage = new GenerationPage(page);
    expect(generationPage).toBeDefined();
    expect(typeof generationPage.gotoGeneration).toBe('function');
    expect(typeof generationPage.selectTemplate).toBe('function');
    expect(typeof generationPage.fillVariables).toBe('function');
    expect(typeof generationPage.selectProvider).toBe('function');
    expect(typeof generationPage.generate).toBe('function');
    expect(typeof generationPage.cancelGeneration).toBe('function');
    expect(typeof generationPage.expectStreamOutput).toBe('function');
    expect(typeof generationPage.saveToGallery).toBe('function');
  });

  test('ShotListPage can be instantiated', async ({ page }) => {
    const shotListPage = new ShotListPage(page);
    expect(shotListPage).toBeDefined();
    expect(typeof shotListPage.goto).toBe('function');
    expect(typeof shotListPage.createShotList).toBe('function');
    expect(typeof shotListPage.aiSuggestShots).toBe('function');
    expect(typeof shotListPage.addShot).toBe('function');
    expect(typeof shotListPage.editShot).toBe('function');
    expect(typeof shotListPage.generateShot).toBe('function');
    expect(typeof shotListPage.batchGenerate).toBe('function');
    expect(typeof shotListPage.switchToTableView).toBe('function');
    expect(typeof shotListPage.switchToStoryboardView).toBe('function');
    expect(typeof shotListPage.dragShot).toBe('function');
    expect(typeof shotListPage.exportStoryboard).toBe('function');
  });

  test('BrandEditorPage can be instantiated', async ({ page }) => {
    const brandPage = new BrandEditorPage(page);
    expect(brandPage).toBeDefined();
    expect(typeof brandPage.goto).toBe('function');
    expect(typeof brandPage.createBrand).toBe('function');
    expect(typeof brandPage.setColorToken).toBe('function');
    expect(typeof brandPage.setVisualStyle).toBe('function');
    expect(typeof brandPage.setVoice).toBe('function');
    expect(typeof brandPage.setDefaultBrand).toBe('function');
    expect(typeof brandPage.previewTokenInjection).toBe('function');
    expect(typeof brandPage.saveBrand).toBe('function');
  });

  test('AssetGalleryPage can be instantiated', async ({ page }) => {
    const galleryPage = new AssetGalleryPage(page);
    expect(galleryPage).toBeDefined();
    expect(typeof galleryPage.goto).toBe('function');
    expect(typeof galleryPage.filterByType).toBe('function');
    expect(typeof galleryPage.filterByDate).toBe('function');
    expect(typeof galleryPage.filterByTag).toBe('function');
    expect(typeof galleryPage.search).toBe('function');
    expect(typeof galleryPage.enterSelectMode).toBe('function');
    expect(typeof galleryPage.selectAssets).toBe('function');
    expect(typeof galleryPage.bulkTag).toBe('function');
    expect(typeof galleryPage.bulkDelete).toBe('function');
    expect(typeof galleryPage.exportAsset).toBe('function');
  });

  test('All page objects have required base methods', async ({ page }) => {
    const pages = [
      new ProviderSettingsPage(page),
      new TemplateEditorPage(page),
      new GenerationPage(page),
      new ShotListPage(page),
      new BrandEditorPage(page),
      new AssetGalleryPage(page)
    ];

    for (const pageObj of pages) {
      expect(typeof pageObj.waitForReady).toBe('function');
      expect(typeof pageObj.expectToast).toBe('function');
      expect(typeof pageObj.waitForNetworkIdle).toBe('function');
    }
  });
});
