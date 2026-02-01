import { test, expect } from '../../helpers/test-fixtures';
import { TemplateEditorPage } from '../../page-objects/TemplateEditorPage';
import { setupProviderMocks, providerMocks } from '../../helpers/provider-mocks';
import { createTemplate } from '../../helpers/test-data';

test.describe('Prompt Templates', () => {
  test.beforeEach(async ({ page }) => {
    // Setup default mocks for any provider calls
    await setupProviderMocks(page, {
      openai: { text: providerMocks.openai.text.success('Mock response') }
    });
  });

  test('can create template with variables', async ({ page, testDb }) => {
    const templatePage = new TemplateEditorPage(page);
    await templatePage.goto('/templates/new');
    await templatePage.createTemplate('Product Hero Shot', 'A {{frame_size}} shot of {{product}}');
    await templatePage.addVariable('frame_size', 'enum', 'medium');
    await templatePage.addVariable('product', 'string');
    await templatePage.saveTemplate();
    await templatePage.expectTemplateSaved();

    // Verify in database
    const templates = await testDb.sqlite('exec', { 
      sql: 'SELECT * FROM prompt_templates WHERE name = ?',
      bind: ['Product Hero Shot']
    });
    expect(templates).toHaveLength(1);
  });

  test('creates new version on edit', async ({ page, testDb }) => {
    // Create template via factory
    const template = await createTemplate(testDb, { name: 'Version Test' });

    // Edit and save
    const templatePage = new TemplateEditorPage(page);
    await templatePage.goto(`/templates/${template.id}/edit`);
    await templatePage.createTemplate('Version Test', 'Updated content');
    await templatePage.saveTemplate();

    // Verify two versions exist
    const versions = await testDb.sqlite('exec', {
      sql: 'SELECT * FROM prompt_versions WHERE template_id = ?',
      bind: [template.id]
    });
    expect(versions).toHaveLength(2);
  });

  test('can rollback to previous version', async ({ page, testDb }) => {
    // Create template with multiple versions via factory
    const template = await createTemplate(testDb, { 
      name: 'Rollback Test',
      content: 'Original content v1.0.0'
    });

    // Create version 2
    await testDb.sqlite('exec', {
      sql: `INSERT INTO prompt_versions (id, template_id, version, content, created_at) 
            VALUES (?, ?, '1.1.0', 'Updated content v1.1.0', ?)`,
      bind: ['version-2', template.id, Date.now()]
    });

    // Create version 3
    await testDb.sqlite('exec', {
      sql: `INSERT INTO prompt_versions (id, template_id, version, content, created_at) 
            VALUES (?, ?, '1.2.0', 'Latest content v1.2.0', ?)`,
      bind: ['version-3', template.id, Date.now()]
    });

    // Navigate to template and rollback to version 1.0.0
    const templatePage = new TemplateEditorPage(page);
    await templatePage.goto(`/templates/${template.id}/edit`);
    await templatePage.openVersionHistory();
    await templatePage.rollbackToVersion('1.0.0');

    // Verify content restored
    await templatePage.expectContent('Original content v1.0.0');

    // Verify new version created for rollback
    const versions = await testDb.sqlite('exec', {
      sql: 'SELECT * FROM prompt_versions WHERE template_id = ? ORDER BY created_at',
      bind: [template.id]
    });
    expect(versions).toHaveLength(4); // Original + 2 updates + rollback
  });

  test('preview renders variables correctly', async ({ page }) => {
    const templatePage = new TemplateEditorPage(page);
    await templatePage.goto('/templates/new');
    await templatePage.createTemplate('Preview Test', 'A {{frame_size}} shot of {{product}} on {{surface}}');
    await templatePage.addVariable('frame_size', 'enum', 'medium');
    await templatePage.addVariable('product', 'string');
    await templatePage.addVariable('surface', 'string', 'white background');

    // Set sample data
    await templatePage.setVariableValue('frame_size', 'wide');
    await templatePage.setVariableValue('product', 'coffee mug');
    await templatePage.setVariableValue('surface', 'marble table');

    // Preview
    await templatePage.previewTemplate();

    // Verify interpolated values shown
    await templatePage.expectPreview('A wide shot of coffee mug on marble table');
  });

  test('can fork template', async ({ page, testDb }) => {
    // Create original template via factory
    const originalTemplate = await createTemplate(testDb, { 
      name: 'Original Template',
      content: 'Original content with {{variable}}'
    });

    // Fork it
    const templatePage = new TemplateEditorPage(page);
    await templatePage.goto(`/templates/${originalTemplate.id}`);
    await templatePage.forkTemplate();

    // Verify new template exists with same content
    const forkedTemplates = await testDb.sqlite('exec', {
      sql: 'SELECT * FROM prompt_templates WHERE name LIKE ?',
      bind: ['%Original Template%']
    });
    expect(forkedTemplates).toHaveLength(2); // Original + fork

    // Verify fork has "(Copy)" or similar suffix
    const forked = forkedTemplates.find((t: { name: string }) => t.name !== 'Original Template');
    expect(forked?.name).toContain('Copy');
  });

  test('template validation prevents empty name', async ({ page }) => {
    const templatePage = new TemplateEditorPage(page);
    await templatePage.goto('/templates/new');
    
    // Try to save with empty name
    await templatePage.createTemplate('', 'Some content');
    await templatePage.saveTemplate();

    // Verify validation error
    await templatePage.expectValidationError('name', 'Template name is required');
  });

  test('template validation prevents empty content', async ({ page }) => {
    const templatePage = new TemplateEditorPage(page);
    await templatePage.goto('/templates/new');
    
    // Try to save with empty content
    await templatePage.createTemplate('My Template', '');
    await templatePage.saveTemplate();

    // Verify validation error
    await templatePage.expectValidationError('content', 'Template content is required');
  });

  test('can edit existing template', async ({ page, testDb }) => {
    // Create template via factory
    const template = await createTemplate(testDb, { 
      name: 'Edit Test',
      content: 'Original content'
    });

    // Edit template
    const templatePage = new TemplateEditorPage(page);
    await templatePage.goto(`/templates/${template.id}/edit`);
    await templatePage.updateTemplateName('Edit Test Updated');
    await templatePage.updateTemplateContent('Updated content');
    await templatePage.saveTemplate();

    // Verify changes in database
    const updated = await testDb.sqlite('exec', {
      sql: 'SELECT * FROM prompt_templates WHERE id = ?',
      bind: [template.id]
    });
    expect(updated[0]?.name).toBe('Edit Test Updated');
  });

  test('variable types are validated', async ({ page }) => {
    const templatePage = new TemplateEditorPage(page);
    await templatePage.goto('/templates/new');
    await templatePage.createTemplate('Variable Test', 'Test with {{number_var}}');
    
    // Add number variable
    await templatePage.addVariable('number_var', 'number', 42);
    
    // Try to set invalid value
    await templatePage.setVariableValue('number_var', 'not-a-number');
    
    // Verify validation error
    await templatePage.expectVariableValidationError('number_var', 'Invalid number');
  });

  test('can delete template', async ({ page, testDb }) => {
    // Create template via factory
    const template = await createTemplate(testDb, { name: 'Delete Test' });

    // Delete it
    const templatePage = new TemplateEditorPage(page);
    await templatePage.goto(`/templates/${template.id}`);
    await templatePage.deleteTemplate();

    // Verify deleted from database
    const remaining = await testDb.sqlite('exec', {
      sql: 'SELECT * FROM prompt_templates WHERE id = ?',
      bind: [template.id]
    });
    expect(remaining).toHaveLength(0);
  });
});
