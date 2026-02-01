/**
 * Database Isolation Verification Test
 * Verifies that each test gets an isolated database instance
 */

import { test, expect } from '../../helpers/database';
import { createTemplate, createTemplateVersion, createBrand, createAsset, seedAssets, createProviderConfig, createShotList, createShot } from '../../helpers/test-data';

test.describe('Database Isolation', () => {
  test('database isolation works - test 1', async ({ testDb }) => {
    // Create a template in this test's database
    const template = await createTemplate(testDb, { name: 'Test Template 1' });
    
    // Verify it was created
    const templates = await testDb.query('SELECT * FROM prompt_templates');
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Test Template 1');
    
    // Create a brand
    const brand = await createBrand(testDb, { name: 'Test Brand 1' });
    const brands = await testDb.query('SELECT * FROM brand_profiles');
    expect(brands).toHaveLength(1);
    expect(brands[0].name).toBe('Test Brand 1');
  });

  test('database isolation works - test 2', async ({ testDb }) => {
    // This test should have a fresh database (no data from test 1)
    const templates = await testDb.query('SELECT * FROM prompt_templates');
    expect(templates).toHaveLength(0);
    
    const brands = await testDb.query('SELECT * FROM brand_profiles');
    expect(brands).toHaveLength(0);
    
    // Create different data
    const template = await createTemplate(testDb, { name: 'Test Template 2' });
    const templates2 = await testDb.query('SELECT * FROM prompt_templates');
    expect(templates2).toHaveLength(1);
    expect(templates2[0].name).toBe('Test Template 2');
  });

  test('database isolation works - test 3', async ({ testDb }) => {
    // Verify fresh database again
    const templates = await testDb.query('SELECT * FROM prompt_templates');
    expect(templates).toHaveLength(0);
    
    // Create multiple items
    await createTemplate(testDb, { name: 'Template A' });
    await createTemplate(testDb, { name: 'Template B' });
    await createBrand(testDb, { name: 'Brand A' });
    
    const allTemplates = await testDb.query('SELECT * FROM prompt_templates');
    expect(allTemplates).toHaveLength(2);
    
    const allBrands = await testDb.query('SELECT * FROM brand_profiles');
    expect(allBrands).toHaveLength(1);
  });
});

test.describe('Data Factories', () => {
  test('createTemplate factory works', async ({ testDb }) => {
    const template = await createTemplate(testDb, {
      name: 'My Template',
      description: 'Test description',
      outputType: 'image',
      category: 'marketing',
      tags: ['test', 'marketing'],
    });
    
    expect(template.id).toBeDefined();
    expect(template.name).toBe('My Template');
    
    const fromDb = await testDb.querySingle('SELECT * FROM prompt_templates WHERE id = ?', [template.id]);
    expect(fromDb).not.toBeNull();
    expect(fromDb?.name).toBe('My Template');
  });

  test('createTemplateVersion factory works', async ({ testDb }) => {
    const template = await createTemplate(testDb, { name: 'Version Test' });
    
    const version = await createTemplateVersion(
      testDb,
      template.id,
      {
        systemPrompt: 'You are a helpful assistant',
        userPrompt: 'Generate an image of {{subject}}',
        variables: [
          { name: 'subject', type: 'string', required: true },
        ],
      },
      '1.0.0'
    );
    
    expect(version.id).toBeDefined();
    expect(version.templateId).toBe(template.id);
    expect(version.version).toBe('1.0.0');
    
    const fromDb = await testDb.querySingle('SELECT * FROM prompt_versions WHERE id = ?', [version.id]);
    expect(fromDb).not.toBeNull();
    expect(fromDb?.userPrompt).toBe('Generate an image of {{subject}}');
  });

  test('createBrand factory works', async ({ testDb }) => {
    const brand = await createBrand(testDb, {
      name: 'Acme Corp',
      description: 'Test brand',
      isDefault: true,
    });
    
    expect(brand.id).toBeDefined();
    expect(brand.name).toBe('Acme Corp');
    expect(brand.tokens.colors.primary).toBe('#FF714E');
    
    const fromDb = await testDb.querySingle('SELECT * FROM brand_profiles WHERE id = ?', [brand.id]);
    expect(fromDb).not.toBeNull();
    expect(fromDb?.isDefault).toBe(1);
  });

  test('createAsset factory works', async ({ testDb }) => {
    const asset = await createAsset(testDb, {
      name: 'Test Image',
      type: 'image',
      format: 'png',
      url: 'blob:test-image',
      tags: ['test', 'campaign'],
      isFavorite: true,
    });
    
    expect(asset.id).toBeDefined();
    expect(asset.name).toBe('Test Image');
    
    const fromDb = await testDb.querySingle('SELECT * FROM assets WHERE id = ?', [asset.id]);
    expect(fromDb).not.toBeNull();
    expect(fromDb?.isFavorite).toBe(1);
  });

  test('seedAssets factory works', async ({ testDb }) => {
    const assets = await seedAssets(testDb, 5, [
      { type: 'image', tags: ['campaign-q1'] },
      { type: 'text' },
      { isFavorite: true },
    ]);
    
    expect(assets).toHaveLength(5);
    expect(assets[0].tags).toContain('campaign-q1');
    expect(assets[1].type).toBe('text');
    expect(assets[2].isFavorite).toBe(true);
    
    const fromDb = await testDb.query('SELECT * FROM assets');
    expect(fromDb).toHaveLength(5);
  });

  test('createProviderConfig factory works', async ({ testDb }) => {
    const { providerId, credentialId } = await createProviderConfig(
      testDb,
      'openai',
      'sk-test-key',
      { name: 'Test OpenAI', isActive: true }
    );
    
    expect(providerId).toBeDefined();
    expect(credentialId).toBeDefined();
    
    const provider = await testDb.querySingle('SELECT * FROM providers WHERE id = ?', [providerId]);
    expect(provider).not.toBeNull();
    expect(provider?.type).toBe('openai');
    
    const credential = await testDb.querySingle('SELECT * FROM provider_credentials WHERE id = ?', [credentialId]);
    expect(credential).not.toBeNull();
    expect(credential?.apiKey).toBe('sk-test-key');
  });

  test('createShot and createShotList factories work', async ({ testDb }) => {
    // Note: Shot lists and shots are stored in Zustand store, not SQLite
    // These factories create data structures for use with the store
    
    const shotList = await createShotList(testDb, undefined, {
      name: 'Campaign Shots',
      contentType: 'image',
      totalShots: 3,
    });
    
    expect(shotList.id).toBeDefined();
    expect(shotList.name).toBe('Campaign Shots');
    
    const shot = await createShot(testDb, shotList.id, {
      name: 'Hero Shot',
      shotType: 'wide',
      status: 'planned',
      priority: 1,
    });
    
    expect(shot.id).toBeDefined();
    expect(shot.shotListId).toBe(shotList.id);
    expect(shot.name).toBe('Hero Shot');
  });
});
