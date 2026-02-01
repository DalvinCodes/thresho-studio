# Thresho Studio E2E Implementation Plan

**Date:** January 31, 2025  
**Status:** Ready for Implementation  
**Estimated Effort:** 4-5 days with parallel agents

---

## Implementation Strategy

This plan uses **parallel agent dispatch** to complete the e2e testing system efficiently. Each agent works on an independent task without conflicts.

### Agent Assignment Map

```
Agent 1: Core Infrastructure (Playwright setup, config, base helpers)
Agent 2: Provider Mocks (All provider mock implementations)
Agent 3: Test Database Layer (Isolation, seeding, factories)
Agent 4: Page Objects (All POM classes for workflows)
Agent 5: Workflow Tests - Provider & Templates
Agent 6: Workflow Tests - Generation & Brands
Agent 7: Workflow Tests - Shot Lists & Assets
Agent 8: Smoke Tests & CI Integration
```

---

## Task Specifications

### Task 1: Core Infrastructure
**Agent:** Agent 1  
**Estimated:** 4 hours  
**Dependencies:** None

**Deliverables:**
1. Install Playwright and dependencies
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

2. Create folder structure:
   ```
   e2e/
   ├── playwright/
   │   ├── config/
   │   ├── fixtures/
   │   ├── helpers/
   │   ├── tests/
   │   │   ├── smoke/
   │   │   ├── workflows/
   │   │   └── providers/
   │   └── page-objects/
   └── api-tests/
   ```

3. Create `playwright.config.ts`:
   - Mocked mode: parallel execution, fast timeouts
   - Real mode: sequential, longer timeouts
   - Web server config for Vite dev server
   - Reporter: HTML + list
   - Projects: Chromium, Firefox, WebKit

4. Create base test fixture with provider mock injection

5. Add npm scripts to package.json:
   - `e2e`, `e2e:smoke`, `e2e:workflows`, `e2e:real`, `e2e:ui`, `e2e:debug`, `e2e:report`

**Verification:**
```bash
npm run e2e:smoke
# Should run (and likely fail with no tests) but Playwright should initialize
```

---

### Task 2: Provider Mock System
**Agent:** Agent 2  
**Estimated:** 6 hours  
**Dependencies:** Task 1 (config structure)

**Deliverables:**

1. Create `helpers/provider-mocks.ts`:
   - Mock response types and generators
   - Route interception logic
   - SSE streaming simulation
   - Environment-based switching

2. Create mock fixtures in `fixtures/providers/`:
   - `openai.json` - Text completions, images, streaming
   - `anthropic.json` - Messages API, tool use
   - `kimi.json` - OpenAI-compatible responses
   - `gemini.json` - GenerateContent responses
   - `flux.json` - Task submission + polling
   - `imagen.json` - Image generation
   - `runway.json` - Async job workflow
   - `veo.json` - Video generation

3. Implement mock helper functions:
   - `setupProviderMocks(page, mocks)`
   - `mockTextGeneration(page, provider, response)`
   - `mockImageGeneration(page, provider, imageUrl)`
   - `mockStreamingResponse(page, provider, chunks)`
   - `mockAsyncJob(page, provider, jobId, statusSequence)`

4. Create `fixtures/images/` with test images:
   - `test-generated.jpg` (1024x1024)
   - `test-shot-1.jpg`
   - `test-shot-2.jpg`

**Verification:**
```typescript
// Create simple test to verify mocks work
test('mocks intercept provider calls', async ({ page }) => {
  await setupProviderMocks(page, {
    openai: { text: providerMocks.openai.text.success('Hello') }
  });
  
  // Navigate to generate page and trigger API call
  // Verify response is mocked
});
```

---

### Task 3: Test Database Layer
**Agent:** Agent 3  
**Estimated:** 5 hours  
**Dependencies:** Task 1 (config structure)

**Deliverables:**

1. Create `helpers/database.ts`:
   - Test database interface
   - OPFS-based SQLite initialization
   - Migration runner
   - Cleanup utilities

2. Create test fixture extension:
   ```typescript
   export const test = base.extend<{
     testDb: TestDatabase;
     testId: string;
   }>({
     testDb: async ({}, use) => {
       // Create isolated DB per test
     }
   });
   ```

3. Create `helpers/test-data.ts` with factories:
   - `createTemplate(db, overrides)`
   - `createTemplateVersion(db, templateId, content)`
   - `createBrand(db, overrides)`
   - `createShotList(db, projectId, overrides)`
   - `createShot(db, shotListId, overrides)`
   - `createAsset(db, overrides)`
   - `seedAssets(db, count, overrides)`
   - `createProviderConfig(db, provider, apiKey)`

4. Create `config/global-setup.ts`:
   - System data seeding
   - Equipment presets
   - Default brand profile

5. Create sample data in `fixtures/`:
   - `fixtures/templates/sample-templates.json`
   - `fixtures/shots/sample-shot-lists.json`

**Verification:**
```typescript
test('database isolation works', async ({ testDb }) => {
  await createTemplate(testDb, { name: 'Test' });
  const templates = await testDb.sqlite('exec', { 
    sql: 'SELECT * FROM prompt_templates' 
  });
  expect(templates).toHaveLength(1);
});
```

---

### Task 4: Page Object Model
**Agent:** Agent 4  
**Estimated:** 6 hours  
**Dependencies:** Task 1 (config structure)

**Deliverables:**

1. Create `page-objects/BasePage.ts`:
   - Abstract base class
   - Navigation helpers
   - Toast/notification helpers
   - Wait utilities

2. Create workflow page objects:

   **ProviderSettingsPage.ts:**
   - `addProvider(providerType)`
   - `setApiKey(provider, key)`
   - `validateProvider(provider)`
   - `expectProviderActive(provider)`

   **TemplateEditorPage.ts:**
   - `createTemplate(name, content)`
   - `addVariable(name, type, defaultValue)`
   - `saveTemplate()`
   - `previewPrompt(sampleData)`
   - `createVersion()`
   - `rollbackToVersion(version)`

   **GenerationPage.ts:**
   - `selectTemplate(templateId)`
   - `fillVariables(variables)`
   - `selectProvider(provider)`
   - `generate()`
   - `cancelGeneration()`
   - `expectStreamOutput(expected)`
   - `expectImageGenerated()`
   - `saveToGallery()`

   **ShotListPage.ts:**
   - `createShotList(name, projectType)`
   - `aiSuggestShots(brief)`
   - `addShot(shotData)`
   - `editShot(shotNumber, data)`
   - `generateShot(shotNumber)`
   - `batchGenerate(shotNumbers)`
   - `switchToTableView()`
   - `switchToStoryboardView()`
   - `dragShot(fromIndex, toIndex)`
   - `exportStoryboard(format)`

   **BrandEditorPage.ts:**
   - `createBrand(name, tokens)`
   - `setColorToken(key, value)`
   - `setVisualStyle(aesthetic, photography)`
   - `setVoice(tone, forbiddenTerms)`
   - `previewTokenInjection(template)`

   **AssetGalleryPage.ts:**
   - `filterByType(type)`
   - `filterByDate(from, to)`
   - `filterByTag(tag)`
   - `search(query)`
   - `enterSelectMode()`
   - `selectAssets(indices)`
   - `bulkTag(tag)`
   - `bulkDelete()`
   - `exportAsset(index, format)`

**Verification:**
Create a simple test using each page object to verify they work.

---

### Task 5: Workflow Tests - Provider & Templates
**Agent:** Agent 5  
**Estimated:** 6 hours  
**Dependencies:** Tasks 1-4

**Deliverables:**

1. Create `tests/workflows/provider-setup.spec.ts`:
   ```typescript
   test.describe('Provider Setup', () => {
     test('can add OpenAI provider', async ({ page }) => {
       const providerPage = new ProviderSettingsPage(page);
       await providerPage.goto();
       await providerPage.addProvider('openai');
       await providerPage.setApiKey('openai', 'sk-mock-key');
       await providerPage.validateProvider('openai');
       await providerPage.expectProviderActive('openai');
     });
     
     test('shows error for invalid credentials', async ({ page }) => {
       // Mock error response
       // Verify error message shown
     });
     
     test('can configure multiple providers', async () => {
       // Add OpenAI, Anthropic, Flux
       // Verify all shown in list
     });
   });
   ```

2. Create `tests/workflows/templates.spec.ts`:
   ```typescript
   test.describe('Prompt Templates', () => {
     test('can create template with variables', async () => {
       // Create template with {{product}}, {{setting}}
       // Verify saved correctly
     });
     
     test('creates new version on edit', async () => {
       // Create template
       // Edit and save
       // Verify two versions exist
     });
     
     test('can rollback to previous version', async () => {
       // Create template, edit twice
       // Rollback to version 1
       // Verify content restored
     });
     
     test('preview renders variables correctly', async () => {
       // Create template with variables
       // Set sample data
       // Verify preview shows interpolated values
     });
     
     test('can fork template', async () => {
       // Create template
       // Fork it
       // Verify new template with same content
     });
   });
   ```

**Verification:**
```bash
npm run e2e:workflows -- tests/workflows/provider-setup.spec.ts
npm run e2e:workflows -- tests/workflows/templates.spec.ts
```

---

### Task 6: Workflow Tests - Generation & Brands
**Agent:** Agent 6  
**Estimated:** 6 hours  
**Dependencies:** Tasks 1-4

**Deliverables:**

1. Create `tests/workflows/generation.spec.ts`:
   ```typescript
   test.describe('Generation Workflows', () => {
     test('text generation streams correctly', async ({ page }) => {
       // Mock streaming response with chunks
       // Type prompt
       // Click generate
       // Verify text appears progressively
     });
     
     test('can cancel text generation', async () => {
       // Start generation with slow mock
       // Click cancel
       // Verify cancelled state
     });
     
     test('image generation and save', async () => {
       // Mock Flux image response
       // Generate image
       // Verify displayed
       // Save to gallery
       // Verify in assets
     });
     
     test('uses selected provider', async () => {
       // Configure multiple providers
       // Select specific provider
       // Generate
       // Verify correct provider called
     });
     
     test('shows error on provider failure', async () => {
       // Mock 500 error
       // Attempt generation
       // Verify error message
     });
     
     test('tracks generation in history', async () => {
       // Generate asset
       // Navigate to history
       // Verify entry exists with correct metadata
     });
   });
   ```

2. Create `tests/workflows/brands.spec.ts`:
   ```typescript
   test.describe('Brand Token Management', () => {
     test('can create brand profile', async () => {
       // Fill brand form
       // Set colors, typography, visual style
       // Save
       // Verify in brand list
     });
     
     test('brand tokens inject into prompts', async () => {
       // Create brand with tokens
       // Create template using {{brand.*}} variables
       // Set brand as default
       // Preview template
       // Verify tokens replaced
     });
     
     test('can set default brand', async () => {
       // Create multiple brands
       // Set one as default
       // Verify badge shown
     });
     
     test('brand tokens include in generation metadata', async () => {
       // Generate with specific brand
       // Check generation record
       // Verify brand_id stored
     });
   });
   ```

**Verification:**
```bash
npm run e2e:workflows -- tests/workflows/generation.spec.ts
npm run e2e:workflows -- tests/workflows/brands.spec.ts
```

---

### Task 7: Workflow Tests - Shot Lists & Assets
**Agent:** Agent 7  
**Estimated:** 8 hours  
**Dependencies:** Tasks 1-4

**Deliverables:**

1. Create `tests/workflows/shot-lists.spec.ts`:
   ```typescript
   test.describe('Shot List Management', () => {
     test('can create shot list', async () => {
       const shotListPage = new ShotListPage(page);
       await shotListPage.goto();
       await shotListPage.createShotList('Product Launch', 'Product Showcase');
       await expect(page).toHaveURL(/\/shot-lists\/\w+/);
     });
     
     test('AI suggests shots from brief', async () => {
       // Mock LLM to return shot suggestions
       // Enter brief
       // Click suggest
       // Verify shots created with correct data
     });
     
     test('table view shows all shot fields', async () => {
       // Add shot with all fields filled
       // Verify table shows subject, frame, camera, etc.
     });
     
     test('can drag to reorder shots', async () => {
       // Create 3 shots
       // Drag shot 3 to position 1
       // Verify new order
     });
     
     test('storyboard view displays cards', async () => {
       // Create shot list with shots
       // Switch to storyboard
       // Verify cards shown with thumbnails
     });
     
     test('generate image for single shot', async () => {
       // Mock image generation
       // Click generate on shot row
       // Verify status changes to Generated
       // Verify thumbnail appears
     });
     
     test('batch generate multiple shots', async () => {
       // Create 3 shots
       // Select all
       // Click batch generate
       // Verify all show Generated status
     });
     
     test('prompt composition includes all fields', async () => {
       // Fill all shot fields
       // View generated prompt
       // Verify subject, setting, camera, lens all included
     });
     
     test('can override auto-generated prompt', async () => {
       // Generate auto prompt
       // Edit manually
       // Save override
       // Verify custom prompt used
     });
     
     test('export storyboard as PDF', async () => {
       // Create shot list with generated shots
       // Click export
       // Select PDF format
       // Verify download started
     });
   });
   ```

2. Create `tests/workflows/assets.spec.ts`:
   ```typescript
   test.describe('Asset Gallery', () => {
     test.beforeEach(async ({ testDb }) => {
       // Seed 10 test assets
       await seedAssets(testDb, 10, [
         { type: 'image', tags: ['campaign-q1'] },
         { type: 'text' },
         { type: 'image', isFavorite: true }
       ]);
     });
     
     test('displays assets in grid', async () => {
       await page.goto('/assets');
       await expect(page.locator('[data-testid="asset-card"]')).toHaveCount(10);
     });
     
     test('filter by type', async () => {
       // Filter to images only
       // Verify only images shown
     });
     
     test('filter by tag', async () => {
       // Filter by campaign-q1
       // Verify only tagged assets shown
     });
     
     test('search by prompt content', async () => {
       // Search for "sunset"
       // Verify matching assets shown
     });
     
     test('bulk tag operation', async () => {
       // Enter select mode
       // Select 3 assets
       // Apply tag "approved"
       // Verify all have tag
     });
     
     test('bulk delete', async () => {
       // Select 2 assets
       // Delete
       // Verify removed from gallery
     });
     
     test('export asset', async () => {
       // Click asset
       // Click export
       // Select PNG format
       // Verify download
     });
     
     test('virtual scrolling handles large galleries', async () => {
       // Seed 1000 assets
       // Scroll through gallery
       // Verify smooth performance
     });
   });
   ```

**Verification:**
```bash
npm run e2e:workflows -- tests/workflows/shot-lists.spec.ts
npm run e2e:workflows -- tests/workflows/assets.spec.ts
```

---

### Task 8: Smoke Tests & CI Integration
**Agent:** Agent 8  
**Estimated:** 4 hours  
**Dependencies:** Tasks 1-4

**Deliverables:**

1. Create `tests/smoke/critical-path.spec.ts`:
   ```typescript
   test.describe('Critical Path Smoke Tests', () => {
     test('app loads successfully', async ({ page }) => {
       await page.goto('/');
       await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
       await expect(page.locator('[data-testid="nav-generate"]')).toBeVisible();
     });
     
     test('navigation works', async ({ page }) => {
       await page.goto('/');
       
       const pages = [
         { nav: 'nav-generate', url: /\/generate/ },
         { nav: 'nav-templates', url: /\/templates/ },
         { nav: 'nav-assets', url: /\/assets/ },
         { nav: 'nav-shot-lists', url: /\/shot-lists/ }
       ];
       
       for (const { nav, url } of pages) {
         await page.click(`[data-testid="${nav}"]`);
         await expect(page).toHaveURL(url);
       }
     });
     
     test('database initializes', async ({ page }) => {
       await page.goto('/');
       // Check no error banners
       await expect(page.locator('[data-testid="db-error"]')).not.toBeVisible();
       
       // Verify presets loaded
       await page.goto('/shot-lists/new');
       await expect(page.locator('[data-testid="camera-preset"]')).toHaveCount(7);
     });
     
     test('provider adapters registered', async ({ page }) => {
       await page.goto('/settings/providers');
       await page.click('[data-testid="add-provider"]');
       
       const providers = ['OpenAI', 'Anthropic', 'Kimi', 'Gemini', 
                         'Flux Pro', 'Imagen 3', 'Runway Gen-4', 'Veo 3'];
       
       for (const provider of providers) {
         await expect(page.locator('[data-testid="provider-option"]'))
           .toContainText(provider);
       }
     });
     
     test('template CRUD works', async ({ page }) => {
       await page.goto('/templates/new');
       await page.fill('[data-testid="template-name"]', 'Smoke Test');
       await page.fill('[data-testid="template-content"]', 'Test content');
       await page.click('[data-testid="save-template"]');
       
       await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
       
       await page.goto('/templates');
       await expect(page.locator('[data-testid="template-list"]'))
         .toContainText('Smoke Test');
     });
     
     test('generation flow works', async ({ page }) => {
       // Mock provider
       await setupProviderMocks(page, {
         openai: { text: providerMocks.openai.text.success('Generated!') }
       });
       
       await page.goto('/generate/text');
       await page.fill('[data-testid="prompt-input"]', 'Hello');
       await page.click('[data-testid="generate-btn"]');
       
       await expect(page.locator('[data-testid="stream-output"]'))
         .toContainText('Generated!');
     });
   });
   ```

2. Create `.github/workflows/e2e.yml`:
   - Trigger on push to main and PRs
   - Mocked tests job (parallel, fast)
   - Real provider tests job (sequential, conditional)
   - Artifact upload for reports
   - Status checks

3. Create environment configuration:
   - `.env.e2e.example` with all required vars
   - Documentation on setting up real provider keys

4. Add data-testid attributes to existing components:
   - Update components to include required test attributes
   - Create tracking issue for missing attributes

**Verification:**
```bash
npm run e2e:smoke
# All smoke tests should pass
```

---

## Parallel Execution Plan

### Phase 1: Foundation (Day 1)
- **Agent 1**: Task 1 (Core Infrastructure)
- **Agent 2**: Task 2 (Provider Mocks) - starts after Task 1 structure ready
- **Agent 3**: Task 3 (Test Database) - starts after Task 1 structure ready
- **Agent 4**: Task 4 (Page Objects) - starts after Task 1 structure ready

### Phase 2: Tests (Days 2-3)
- **Agent 5**: Task 5 (Provider & Template Tests)
- **Agent 6**: Task 6 (Generation & Brand Tests)
- **Agent 7**: Task 7 (Shot Lists & Asset Tests)
- **Agent 8**: Task 8 (Smoke Tests & CI) - can start early

### Phase 3: Integration (Day 4)
- All agents verify their tests pass
- Fix any integration issues
- Run full suite
- Validate CI pipeline

### Phase 4: Final Validation (Day 5)
- Run complete test suite
- Fix any remaining issues
- Update documentation
- Merge to main

---

## Success Criteria Checklist

- [ ] Playwright installed and configured
- [ ] Mock provider system working
- [ ] Test database isolation working
- [ ] All page objects created
- [ ] Smoke tests passing (<2 min)
- [ ] Provider setup tests passing
- [ ] Template workflow tests passing
- [ ] Generation tests passing
- [ ] Brand tests passing
- [ ] Shot list tests passing
- [ ] Asset gallery tests passing
- [ ] CI pipeline working
- [ ] Documentation complete
- [ ] Can run with `npm run e2e`
- [ ] Real provider mode works

---

## Command Reference

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install

# Run all tests (mocked)
npm run e2e

# Run smoke tests only
npm run e2e:smoke

# Run specific workflow
npm run e2e:workflows -- tests/workflows/shot-lists.spec.ts

# Run with real providers
USE_REAL_PROVIDERS=true npm run e2e:real

# Debug mode
npm run e2e:debug

# UI mode
npm run e2e:ui

# View report
npm run e2e:report
```

---

## Next Steps

1. **Dispatch agents** with their assigned tasks
2. **Agent 1 starts first** to create folder structure
3. **Agents 2-4 start** once structure is ready
4. **Agents 5-8 start** once helpers/page-objects ready
5. **Daily sync** to resolve any blockers
6. **Final integration** on day 4-5

Ready to dispatch the parallel agents?
