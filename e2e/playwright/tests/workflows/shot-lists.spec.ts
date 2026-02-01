import { test, expect } from '../../helpers/test-fixtures';
import { ShotListPage } from '../../page-objects/ShotListPage';
import { setupProviderMocks, providerMocks } from '../../helpers/provider-mocks';
import { createShotList, createShot, createProject } from '../../helpers/test-data';

test.describe('Shot List Management', () => {
  test('can create shot list', async ({ page, testDb }) => {
    const shotListPage = new ShotListPage(page);
    await shotListPage.goto();
    await shotListPage.createShotList('Product Launch', 'Product Showcase');
    
    // Verify created - URL should contain shot-list ID
    await expect(page).toHaveURL(/\/shot-lists\/\w+/);
    
    // Verify in database (if using SQLite storage)
    // Note: Shot lists may be stored in Zustand store rather than SQLite
    // This verification depends on the actual implementation
  });
  
  test('AI suggests shots from brief', async ({ page }) => {
    // Mock LLM to return shot suggestions
    await setupProviderMocks(page, {
      openai: {
        text: providerMocks.openai.text.success(JSON.stringify({
          shots: [
            { name: 'Hero Shot', frame: 'medium', subject: 'Product' },
            { name: 'Detail Shot', frame: 'close-up', subject: 'Features' }
          ]
        }))
      }
    });
    
    const shotListPage = new ShotListPage(page);
    await shotListPage.goto();
    await shotListPage.createShotList('AI Test', 'Commercial (30s)');
    await shotListPage.aiSuggestShots('Launch video for new product');
    
    // Verify shots created
    await shotListPage.expectShotCount(2);
    await expect(page.locator('[data-testid="shot-1-name"]')).toHaveValue('Hero Shot');
  });
  
  test('table view shows all shot fields', async ({ page, testDb }) => {
    // Create a project and shot list with a shot
    const project = await createProject(testDb, { name: 'Table View Test' });
    const shotList = await createShotList(testDb, project.id, { name: 'Table Test' });
    await createShot(testDb, shotList.id, {
      name: 'Test Shot',
      subject: 'Product',
      frame: 'wide',
      camera: 'Sony A7IV',
      lens: '24-70mm',
      lighting: 'Natural',
      sequenceOrder: 1
    });
    
    const shotListPage = new ShotListPage(page);
    await shotListPage.goto(shotList.id);
    await shotListPage.switchToTableView();
    
    // Verify table displays shot fields
    await expect(page.locator('[data-testid="shots-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="shot-row-1"]')).toContainText('Test Shot');
    await expect(page.locator('[data-testid="shot-row-1"]')).toContainText('Product');
    await expect(page.locator('[data-testid="shot-row-1"]')).toContainText('wide');
  });
  
  test('can drag to reorder shots', async ({ page, testDb }) => {
    // Create a project and shot list with 3 shots
    const project = await createProject(testDb, { name: 'Reorder Test' });
    const shotList = await createShotList(testDb, project.id, { name: 'Reorder Test' });
    
    await createShot(testDb, shotList.id, { name: 'Shot 1', sequenceOrder: 1 });
    await createShot(testDb, shotList.id, { name: 'Shot 2', sequenceOrder: 2 });
    await createShot(testDb, shotList.id, { name: 'Shot 3', sequenceOrder: 3 });
    
    const shotListPage = new ShotListPage(page);
    await shotListPage.goto(shotList.id);
    await shotListPage.switchToTableView();
    
    // Drag shot 3 to position 1
    await shotListPage.dragShot(3, 1);
    
    // Verify order updated - Shot 3 should now be first
    await expect(page.locator('[data-testid="shot-row-1"]')).toContainText('Shot 3');
  });
  
  test('storyboard view displays cards', async ({ page, testDb }) => {
    // Create shot list with shots
    const project = await createProject(testDb, { name: 'Storyboard Test' });
    const shotList = await createShotList(testDb, project.id, { name: 'Storyboard Test' });
    
    await createShot(testDb, shotList.id, { name: 'Opening Shot', sequenceOrder: 1 });
    await createShot(testDb, shotList.id, { name: 'Middle Shot', sequenceOrder: 2 });
    
    const shotListPage = new ShotListPage(page);
    await shotListPage.goto(shotList.id);
    await shotListPage.switchToStoryboardView();
    
    // Verify cards shown
    await expect(page.locator('[data-testid="storyboard-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="storyboard-card-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="storyboard-card-2"]')).toBeVisible();
    
    // Verify shot numbers visible
    await expect(page.locator('[data-testid="storyboard-card-1"]')).toContainText('1');
    await expect(page.locator('[data-testid="storyboard-card-2"]')).toContainText('2');
  });
  
  test('generate image for single shot', async ({ page, testDb }) => {
    // Mock Flux image generation
    await setupProviderMocks(page, {
      flux: {
        submit: providerMocks.flux.submit.success('task-1'),
        status: providerMocks.flux.status.completed('task-1', '/fixtures/images/test-shot-1.svg')
      }
    });
    
    // Create shot list with planned shot
    const project = await createProject(testDb, { name: 'Generate Test' });
    const shotList = await createShotList(testDb, project.id, { name: 'Generate Test' });
    await createShot(testDb, shotList.id, { 
      name: 'Test Shot',
      status: 'planned',
      sequenceOrder: 1 
    });
    
    const shotListPage = new ShotListPage(page);
    await shotListPage.goto(shotList.id);
    await shotListPage.generateShot(1);
    
    // Verify status changed
    await shotListPage.expectShotStatus(1, 'Generated');
    
    // Verify asset linked in database
    const shots = await testDb.query(
      'SELECT assetId FROM shots WHERE sequenceOrder = 1 AND shotListId = ?',
      [shotList.id]
    );
    expect(shots[0].assetId).toBeTruthy();
  });
  
  test('batch generate multiple shots', async ({ page, testDb }) => {
    // Mock multiple image generations
    await setupProviderMocks(page, {
      flux: {
        submit: providerMocks.flux.submit.success('batch-task'),
        status: providerMocks.flux.status.completed('batch-task', '/fixtures/images/test-shot.svg')
      }
    });
    
    // Create shot list with 3 shots
    const project = await createProject(testDb, { name: 'Batch Test' });
    const shotList = await createShotList(testDb, project.id, { name: 'Batch Test' });
    
    await createShot(testDb, shotList.id, { name: 'Shot 1', status: 'planned', sequenceOrder: 1 });
    await createShot(testDb, shotList.id, { name: 'Shot 2', status: 'planned', sequenceOrder: 2 });
    await createShot(testDb, shotList.id, { name: 'Shot 3', status: 'planned', sequenceOrder: 3 });
    
    const shotListPage = new ShotListPage(page);
    await shotListPage.goto(shotList.id);
    
    // Select all 3 shots and batch generate
    await shotListPage.batchGenerate([1, 2, 3]);
    
    // Verify all show Generated status
    await shotListPage.expectShotStatus(1, 'Generated');
    await shotListPage.expectShotStatus(2, 'Generated');
    await shotListPage.expectShotStatus(3, 'Generated');
    
    // Verify batch progress was shown
    await shotListPage.expectBatchProgressVisible();
  });
  
  test('prompt composition includes all fields', async ({ page, testDb }) => {
    // Create shot with all fields
    const project = await createProject(testDb, { name: 'Prompt Test' });
    const shotList = await createShotList(testDb, project.id, { name: 'Prompt Test' });
    await createShot(testDb, shotList.id, {
      name: 'Product Hero',
      subject: 'Smartphone',
      setting: 'Modern office',
      frame: 'medium',
      camera: 'Sony A7IV',
      lens: '85mm f/1.4',
      lighting: 'Softbox key light',
      sequenceOrder: 1
    });
    
    const shotListPage = new ShotListPage(page);
    await shotListPage.goto(shotList.id);
    
    // View generated prompt
    const prompt = await shotListPage.viewPrompt(1);
    
    // Verify all fields included
    expect(prompt).toContain('Smartphone');
    expect(prompt).toContain('Modern office');
    expect(prompt).toContain('Sony A7IV');
    expect(prompt).toContain('85mm');
  });
  
  test('can override auto-generated prompt', async ({ page, testDb }) => {
    // Create shot
    const project = await createProject(testDb, { name: 'Override Test' });
    const shotList = await createShotList(testDb, project.id, { name: 'Override Test' });
    await createShot(testDb, shotList.id, {
      name: 'Test Shot',
      prompt: 'Original auto-generated prompt',
      sequenceOrder: 1
    });
    
    const shotListPage = new ShotListPage(page);
    await shotListPage.goto(shotList.id);
    
    // Override with custom prompt
    const customPrompt = 'Custom prompt with specific lighting and composition details';
    await shotListPage.overridePrompt(1, customPrompt);
    
    // Verify custom prompt saved
    const shots = await testDb.query(
      'SELECT customPrompt FROM shots WHERE sequenceOrder = 1 AND shotListId = ?',
      [shotList.id]
    );
    expect(shots[0].customPrompt).toBe(customPrompt);
  });
  
  test('export storyboard as PDF', async ({ page, testDb }) => {
    // Create shot list with generated shots
    const project = await createProject(testDb, { name: 'Export Test' });
    const shotList = await createShotList(testDb, project.id, { name: 'Export Test' });
    
    await createShot(testDb, shotList.id, { 
      name: 'Shot 1', 
      status: 'generated',
      sequenceOrder: 1 
    });
    await createShot(testDb, shotList.id, { 
      name: 'Shot 2', 
      status: 'generated',
      sequenceOrder: 2 
    });
    
    const shotListPage = new ShotListPage(page);
    await shotListPage.goto(shotList.id);
    
    // Export as PDF
    await shotListPage.exportStoryboard('pdf');
    
    // Verify download initiated - Playwright handles this via waitForEvent
    // The exportStoryboard method already waits for download
  });
  
  test('CSV import for shots', async ({ page, testDb }) => {
    const project = await createProject(testDb, { name: 'Import Test' });
    const shotList = await createShotList(testDb, project.id, { name: 'Import Test' });
    
    const shotListPage = new ShotListPage(page);
    await shotListPage.goto(shotList.id);
    
    // Create a test CSV file path
    const csvPath = '/fixtures/shots/sample-import.csv';
    
    // Import CSV
    await shotListPage.importCsv(csvPath);
    
    // Verify shots imported
    const shots = await testDb.query(
      'SELECT COUNT(*) as count FROM shots WHERE shotListId = ?',
      [shotList.id]
    );
    expect(parseInt(shots[0].count)).toBeGreaterThan(0);
  });
});
