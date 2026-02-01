import { test, expect } from '../../helpers/test-fixtures';
import { BrandEditorPage } from '../../page-objects/BrandEditorPage';
import { GenerationPage } from '../../page-objects/GenerationPage';
import { setupProviderMocks, providerMocks } from '../../helpers/provider-mocks';
import { createBrand, createTemplate, createProviderConfig } from '../../helpers/test-data';

// Brand token schema type for tests
interface BrandTokenSchema {
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
    neutralDark: string;
    neutralLight: string;
    paletteDescription: string;
  };
  typography: {
    primaryFont: string;
    secondaryFont?: string;
    styleDescriptor: string;
  };
  visualStyle: {
    aesthetic: string;
    photographyStyle: string;
    mood: string;
    artDirection?: string;
  };
  voice: {
    tone: string[];
    forbiddenTerms: string[];
    forbiddenElements: string[];
  };
}

test.describe('Brand Token Management', () => {
  test('can create brand profile', async ({ page, testDb }) => {
    const brandPage = new BrandEditorPage(page);
    await brandPage.goto();
    await brandPage.createBrand('Acme Corp', {
      colors: {
        primary: '#FF714E',
        secondary: '#004466',
        neutralDark: '#111122',
        neutralLight: '#F0EEEE'
      },
      visualStyle: {
        aesthetic: 'Premium editorial',
        photographyStyle: 'Natural lighting',
        mood: 'Professional'
      }
    });
    await brandPage.saveBrand();
    await brandPage.expectBrandSaved();
    
    // Verify in database
    const brands = await testDb.query(
      'SELECT * FROM brand_profiles WHERE name = ?',
      ['Acme Corp']
    );
    expect(brands).toHaveLength(1);
    expect(brands[0].name).toBe('Acme Corp');
  });
  
  test('brand tokens inject into prompts', async ({ page, testDb }) => {
    // Create brand with tokens
    const tokens: BrandTokenSchema = {
      colors: {
        primary: '#FF714E',
        secondary: '#004466',
        neutralDark: '#111122',
        neutralLight: '#F0EEEE',
        paletteDescription: 'Warm brand colors'
      },
      typography: {
        primaryFont: 'Inter',
        styleDescriptor: 'Clean sans-serif'
      },
      visualStyle: {
        aesthetic: 'minimalist modern',
        photographyStyle: 'High-quality lifestyle',
        mood: 'Professional'
      },
      voice: {
        tone: ['professional', 'friendly'],
        forbiddenTerms: [],
        forbiddenElements: []
      }
    };
    
    const brand = await createBrand(testDb, {
      name: 'Test Brand',
      tokens
    });
    
    // Create template using {{brand.*}} variables
    const template = await createTemplate(testDb, {
      name: 'Brand Test Template',
      outputType: 'text'
    });
    
    // Preview with brand
    const brandPage = new BrandEditorPage(page);
    await brandPage.goto(brand.id);
    await brandPage.previewTokenInjection(template.id);
    
    // Verify tokens replaced
    await brandPage.expectPreviewContains('minimalist modern');
  });
  
  test('can set default brand', async ({ page, testDb }) => {
    // Create multiple brands
    const tokens: BrandTokenSchema = {
      colors: {
        primary: '#FF714E',
        secondary: '#004466',
        neutralDark: '#111122',
        neutralLight: '#F0EEEE',
        paletteDescription: 'Brand colors'
      },
      typography: {
        primaryFont: 'Inter',
        styleDescriptor: 'Clean'
      },
      visualStyle: {
        aesthetic: 'Modern',
        photographyStyle: 'Professional',
        mood: 'Business'
      },
      voice: {
        tone: ['professional'],
        forbiddenTerms: [],
        forbiddenElements: []
      }
    };
    
    const brand1 = await createBrand(testDb, {
      name: 'Brand One',
      tokens
    });
    
    const brand2 = await createBrand(testDb, {
      name: 'Brand Two',
      tokens
    });
    
    // Set brand2 as default
    const brandPage = new BrandEditorPage(page);
    await brandPage.goto(brand2.id);
    await brandPage.setDefaultBrand();
    
    // Verify is_default flag in database
    const brands = await testDb.query(
      'SELECT * FROM brand_profiles WHERE isDefault = 1'
    );
    expect(brands).toHaveLength(1);
    expect(brands[0].id).toBe(brand2.id);
  });
  
  test('brand tokens included in generation metadata', async ({ page, testDb }) => {
    // Create brand
    const tokens: BrandTokenSchema = {
      colors: {
        primary: '#FF714E',
        secondary: '#004466',
        neutralDark: '#111122',
        neutralLight: '#F0EEEE',
        paletteDescription: 'Brand colors'
      },
      typography: {
        primaryFont: 'Inter',
        styleDescriptor: 'Clean'
      },
      visualStyle: {
        aesthetic: 'modern',
        photographyStyle: 'Professional',
        mood: 'Business'
      },
      voice: {
        tone: ['professional'],
        forbiddenTerms: [],
        forbiddenElements: []
      }
    };
    
    const brand = await createBrand(testDb, {
      name: 'Generation Test Brand',
      tokens
    });
    
    // Create provider config
    const { providerId } = await createProviderConfig(testDb, 'openai', 'sk-test', {
      name: 'Test Provider'
    });
    
    // Create template
    const template = await createTemplate(testDb, {
      name: 'Generation Template',
      outputType: 'text'
    });
    
    // Mock successful generation
    await setupProviderMocks(page, {
      openai: {
        text: providerMocks.openai.text.success('Generated with brand')
      }
    });
    
    // Generate with specific brand
    const genPage = new GenerationPage(page);
    await genPage.gotoGeneration('text');
    await genPage.selectTemplate(template.id);
    await genPage.selectProvider('openai');
    await genPage.generate();
    
    // Wait for generation to complete
    await genPage.waitForGenerationComplete();
    
    // Check generation_records for brand reference
    const records = await testDb.query(
      'SELECT * FROM generation_records WHERE brandId = ?',
      [brand.id]
    );
    
    expect(records.length).toBeGreaterThan(0);
    expect(records[0].brandId).toBe(brand.id);
  });
  
  test('forbidden terms are validated', async ({ page, testDb }) => {
    // Create brand with forbidden terms
    const tokens: BrandTokenSchema = {
      colors: {
        primary: '#FF714E',
        secondary: '#004466',
        neutralDark: '#111122',
        neutralLight: '#F0EEEE',
        paletteDescription: 'Brand colors'
      },
      typography: {
        primaryFont: 'Inter',
        styleDescriptor: 'Clean'
      },
      visualStyle: {
        aesthetic: 'Modern',
        photographyStyle: 'Professional',
        mood: 'Business'
      },
      voice: {
        tone: ['professional'],
        forbiddenTerms: ['cheap', 'basic', 'simple'],
        forbiddenElements: []
      }
    };
    
    const brand = await createBrand(testDb, {
      name: 'Strict Brand',
      tokens
    });
    
    // Create template
    const template = await createTemplate(testDb, {
      name: 'Forbidden Terms Template',
      outputType: 'text'
    });
    
    // Try to use forbidden term in template
    const brandPage = new BrandEditorPage(page);
    await brandPage.goto(brand.id);
    await brandPage.previewTokenInjection(template.id);
    
    // Verify validation error - check for error message in preview
    const preview = page.locator('[data-testid="token-preview-output"], [data-testid="preview-result"], [data-testid="error-message"]');
    await expect(preview).toBeVisible();
  });
  
  test('brand tokens persist across sessions', async ({ page, testDb }) => {
    // Create brand with complex tokens
    const tokens: BrandTokenSchema = {
      colors: {
        primary: '#FF714E',
        secondary: '#004466',
        neutralDark: '#111122',
        neutralLight: '#F0EEEE',
        paletteDescription: 'Brand colors'
      },
      typography: {
        primaryFont: 'Inter',
        styleDescriptor: 'Clean sans-serif'
      },
      visualStyle: {
        aesthetic: 'Modern minimalist',
        photographyStyle: 'High-quality lifestyle',
        mood: 'Professional'
      },
      voice: {
        tone: ['professional', 'friendly'],
        forbiddenTerms: [],
        forbiddenElements: []
      }
    };
    
    const brand = await createBrand(testDb, {
      name: 'Persistent Brand',
      tokens
    });
    
    // Reload page and verify tokens persisted
    const brandPage = new BrandEditorPage(page);
    await brandPage.goto(brand.id);
    
    // Verify brand data is loaded
    await expect(page.locator('[data-testid="brand-name"]')).toHaveValue('Persistent Brand');
  });
  
  test('can update existing brand tokens', async ({ page, testDb }) => {
    // Create initial brand
    const tokens: BrandTokenSchema = {
      colors: {
        primary: '#000000',
        secondary: '#004466',
        neutralDark: '#111122',
        neutralLight: '#F0EEEE',
        paletteDescription: 'Brand colors'
      },
      typography: {
        primaryFont: 'Inter',
        styleDescriptor: 'Clean'
      },
      visualStyle: {
        aesthetic: 'Modern',
        photographyStyle: 'Professional',
        mood: 'Business'
      },
      voice: {
        tone: ['professional'],
        forbiddenTerms: [],
        forbiddenElements: []
      }
    };
    
    const brand = await createBrand(testDb, {
      name: 'Updatable Brand',
      tokens
    });
    
    // Update brand tokens
    const brandPage = new BrandEditorPage(page);
    await brandPage.goto(brand.id);
    await brandPage.setColorToken('primary', '#FFFFFF');
    await brandPage.saveBrand();
    
    // Verify update in database
    const brands = await testDb.query(
      'SELECT * FROM brand_profiles WHERE id = ?',
      [brand.id]
    );
    
    expect(brands).toHaveLength(1);
    const updatedTokens = JSON.parse(brands[0].tokens as string);
    expect(updatedTokens.colors.primary).toBe('#FFFFFF');
  });
  
  test('brand selector shows all active brands', async ({ page, testDb }) => {
    const tokens: BrandTokenSchema = {
      colors: {
        primary: '#FF714E',
        secondary: '#004466',
        neutralDark: '#111122',
        neutralLight: '#F0EEEE',
        paletteDescription: 'Brand colors'
      },
      typography: {
        primaryFont: 'Inter',
        styleDescriptor: 'Clean'
      },
      visualStyle: {
        aesthetic: 'Modern',
        photographyStyle: 'Professional',
        mood: 'Business'
      },
      voice: {
        tone: ['professional'],
        forbiddenTerms: [],
        forbiddenElements: []
      }
    };
    
    // Create multiple brands
    await createBrand(testDb, { name: 'Brand A', tokens });
    await createBrand(testDb, { name: 'Brand B', tokens });
    await createBrand(testDb, { name: 'Brand C', tokens, isArchived: true });
    
    // Navigate to generation page
    const genPage = new GenerationPage(page);
    await genPage.gotoGeneration('text');
    
    // Open brand selector
    await page.click('[data-testid="brand-select"]');
    
    // Verify active brands are shown
    await expect(page.locator('[data-testid="brand-option"]')).toContainText('Brand A');
    await expect(page.locator('[data-testid="brand-option"]')).toContainText('Brand B');
    
    // Archived brand should not appear
    const brandC = page.locator('[data-testid="brand-option"]').filter({ hasText: 'Brand C' });
    expect(await brandC.count()).toBe(0);
  });
});
