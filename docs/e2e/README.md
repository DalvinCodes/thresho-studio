# Thresho Studio E2E Testing Design

**Date:** January 31, 2025  
**Status:** Design Complete - Ready for Implementation  
**Scope:** Comprehensive browser automation + provider API integration tests

---

## 1. Overview

This document describes the end-to-end testing architecture for Thresho Studio, covering:

- **Browser automation** with Playwright for complete user workflows
- **Provider API integration** tests for adapter validation
- **Mock/Real provider switching** via environment variables
- **Test database isolation** for parallel execution

---

## 2. Folder Structure

```
docs/e2e/
├── README.md                          # This document
├── IMPLEMENTATION_PLAN.md             # Step-by-step implementation guide
├── playwright/
│   ├── config/
│   │   ├── playwright.config.ts       # Main Playwright configuration
│   │   └── global-setup.ts            # Database seeding, global hooks
│   ├── fixtures/
│   │   ├── providers/                 # Mock provider responses
│   │   │   ├── openai.json
│   │   │   ├── anthropic.json
│   │   │   ├── flux.json
│   │   │   └── ...
│   │   ├── templates/                 # Sample prompt templates
│   │   ├── shots/                     # Sample shot list data
│   │   └── images/                    # Test image assets
│   ├── helpers/
│   │   ├── provider-mocks.ts          # Mock response generators
│   │   ├── database.ts                # Test database utilities
│   │   ├── test-data.ts               # Test data factories
│   │   └── auth.ts                    # Authentication helpers
│   ├── tests/
│   │   ├── smoke/
│   │   │   └── critical-path.spec.ts  # <2min health checks
│   │   ├── workflows/
│   │   │   ├── provider-setup.spec.ts
│   │   │   ├── templates.spec.ts
│   │   │   ├── generation.spec.ts
│   │   │   ├── shot-lists.spec.ts
│   │   │   ├── brands.spec.ts
│   │   │   └── assets.spec.ts
│   │   └── providers/
│   │       ├── openai-adapter.spec.ts
│   │       ├── anthropic-adapter.spec.ts
│   │       └── ...
│   └── page-objects/
│       ├── ProviderSettingsPage.ts
│       ├── TemplateEditorPage.ts
│       ├── GenerationPage.ts
│       ├── ShotListPage.ts
│       └── AssetGalleryPage.ts
└── api-tests/
    └── providers/
        └── integration.spec.ts        # Direct API adapter tests
```

---

## 3. Provider Mocking Strategy

### 3.1 Mock Response Format

Each provider adapter has standardized mock responses:

```typescript
// helpers/provider-mocks.ts
interface MockResponse {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

export const providerMocks = {
  openai: {
    text: {
      success: (content: string): MockResponse => ({
        status: 200,
        body: {
          id: 'mock-completion-id',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4',
          choices: [{
            index: 0,
            message: { role: 'assistant', content },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        }
      }),
      
      stream: (chunks: string[]): MockResponse => ({
        status: 200,
        body: createSSEStream(chunks),
        headers: { 'content-type': 'text/event-stream' }
      }),
      
      error: (code: string, message: string): MockResponse => ({
        status: 400,
        body: {
          error: {
            message,
            type: 'invalid_request_error',
            code
          }
        }
      })
    },
    
    image: {
      success: (url: string): MockResponse => ({
        status: 200,
        body: {
          created: Date.now(),
          data: [{
            url,
            revised_prompt: 'mock generated prompt'
          }]
        }
      })
    }
  },

  flux: {
    submit: {
      success: (taskId: string): MockResponse => ({
        status: 200,
        body: { id: taskId }
      })
    },
    
    status: {
      pending: (taskId: string): MockResponse => ({
        status: 200,
        body: { id: taskId, status: 'pending' }
      }),
      
      completed: (taskId: string, imageUrl: string): MockResponse => ({
        status: 200,
        body: {
          id: taskId,
          status: 'ready',
          result: { sample: imageUrl }
        }
      })
    }
  },
  
  // Similar structures for Anthropic, Gemini, Runway, etc.
};
```

### 3.2 Route Interception

```typescript
// helpers/provider-mocks.ts
export async function setupProviderMocks(page: Page, mocks: MockConfig) {
  if (process.env.USE_REAL_PROVIDERS === 'true') {
    return; // Don't mock - let requests go through
  }

  // OpenAI API
  await page.route('https://api.openai.com/v1/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('/chat/completions')) {
      if (mocks.openai?.text) {
        await route.fulfill(mocks.openai.text);
      } else {
        await route.continue(); // Fallback
      }
    }
    
    if (url.includes('/images/generations')) {
      if (mocks.openai?.image) {
        await route.fulfill(mocks.openai.image);
      }
    }
  });

  // Flux Pro (BFL)
  await page.route('https://api.bfl.ml/v1/**', async (route) => {
    if (mocks.flux) {
      await route.fulfill(mocks.flux);
    }
  });

  // Anthropic
  await page.route('https://api.anthropic.com/v1/**', async (route) => {
    if (mocks.anthropic) {
      await route.fulfill(mocks.anthropic);
    }
  });
  
  // ... other providers
}
```

---

## 4. Test Database Strategy

### 4.1 Isolation

Each test gets an isolated SQLite database instance:

```typescript
// helpers/database.ts
import { test as base } from '@playwright/test';

export const test = base.extend<{
  testDb: TestDatabase;
}>({
  testDb: async ({}, use) => {
    const testId = generateTestId();
    const db = await createTestDatabase(testId);
    
    // Seed required system data
    await seedSystemData(db);
    
    await use(db);
    
    // Cleanup
    await db.close();
    await deleteTestDatabase(testId);
  }
});

async function createTestDatabase(testId: string): Promise<TestDatabase> {
  // Use OPFS with unique filename per test
  const dbName = `thresho-test-${testId}.sqlite`;
  
  // Initialize wa-sqlite with test database
  const sqlite = await sqlite3Worker1Promiser();
  await sqlite('open', {
    filename: `file:${dbName}?vfs=opfs`
  });
  
  // Run migrations
  await runMigrations(sqlite);
  
  return { sqlite, dbName };
}

async function seedSystemData(db: TestDatabase) {
  // Equipment presets (cameras, lenses)
  await db.sqlite('exec', {
    sql: `INSERT INTO equipment_presets (id, name, category, prompt_fragment, is_system) VALUES 
      ('cam-1', 'ARRI Alexa', 'camera', 'cinematic film quality, ARRI color science', 1),
      ('cam-2', 'RED Komodo', 'camera', 'sharp digital cinema, high dynamic range', 1),
      ('lens-1', '85mm Portrait', 'lens', 'portrait compression, shallow depth of field', 1)`
  });
  
  // Default Thresho brand profile
  await db.sqlite('exec', {
    sql: `INSERT INTO brand_profiles (id, name, tokens, is_default) VALUES 
      ('brand-default', 'Thresho Default', '${JSON.stringify(defaultBrandTokens)}', 1)`
  });
}
```

### 4.2 Test Data Factories

```typescript
// helpers/test-data.ts
export async function createTemplate(
  db: TestDatabase,
  overrides: Partial<PromptTemplate> = {}
): Promise<PromptTemplate> {
  const template = {
    id: generateUUID(),
    name: 'Test Template',
    outputType: 'image' as const,
    ...overrides
  };
  
  await db.sqlite('exec', {
    sql: `INSERT INTO prompt_templates (id, name, output_type) VALUES (?, ?, ?)`,
    bind: [template.id, template.name, template.outputType]
  });
  
  return template;
}

export async function createShotList(
  db: TestDatabase,
  projectId: string,
  overrides: Partial<ShotList> = {}
): Promise<ShotList> {
  // Implementation...
}

export async function createShots(
  db: TestDatabase,
  shotListId: string,
  count: number
): Promise<Shot[]> {
  // Implementation...
}

export async function seedAssets(
  db: TestDatabase,
  count: number,
  overrides: Partial<Asset>[] = []
): Promise<Asset[]> {
  // Implementation...
}
```

---

## 5. Page Object Model

### 5.1 Base Page

```typescript
// page-objects/BasePage.ts
export abstract class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string) {
    await this.page.goto(path);
    await this.waitForReady();
  }

  abstract waitForReady(): Promise<void>;

  async expectToast(message: string) {
    await expect(this.page.locator('[data-testid="toast"]'))
      .toContainText(message);
  }
}
```

### 5.2 Workflow Pages

```typescript
// page-objects/ShotListPage.ts
export class ShotListPage extends BasePage {
  async createShotList(name: string, projectType: string) {
    await this.page.click('[data-testid="new-shot-list"]');
    await this.page.fill('[data-testid="shot-list-name"]', name);
    await this.page.selectOption('[data-testid="project-type"]', projectType);
    await this.page.click('[data-testid="create-btn"]');
  }

  async addShot(shotData: Partial<Shot>) {
    await this.page.click('[data-testid="add-shot"]');
    await this.page.fill('[data-testid="shot-name"]', shotData.name || '');
    await this.page.selectOption('[data-testid="shot-frame"]', shotData.frameSize || 'medium');
    await this.page.click('[data-testid="save-shot"]');
  }

  async generateShot(shotNumber: number) {
    await this.page.click(`[data-testid="shot-${shotNumber}-generate"]`);
    await this.page.waitForSelector(`[data-testid="shot-${shotNumber}-status"]:has-text("Generated")`, 
      { timeout: 30000 });
  }

  async switchToStoryboardView() {
    await this.page.click('[data-testid="storyboard-view-btn"]');
    await expect(this.page.locator('[data-testid="storyboard-grid"]')).toBeVisible();
  }

  async expectShotCount(count: number) {
    await expect(this.page.locator('[data-testid="shot-row"]')).toHaveCount(count);
  }

  async waitForReady() {
    await expect(this.page.locator('[data-testid="shot-list-container"]')).toBeVisible();
  }
}
```

---

## 6. Test Specifications

### 6.1 Smoke Tests

| Test | Description | Expected Duration |
|------|-------------|-------------------|
| App loads | Verify app shell renders | 5s |
| Navigation | All nav links work | 10s |
| Database init | No errors, presets loaded | 5s |
| Provider registry | All adapters available | 5s |
| Template CRUD | Create, read, update, delete | 20s |

**Total: <2 minutes**

### 6.2 Workflow Tests

| Workflow | Tests | Expected Duration |
|----------|-------|-------------------|
| Provider Setup | Add, validate, error handling | 2m |
| Templates | CRUD, versions, variables | 3m |
| Generation | Text streaming, image, video | 4m |
| Shot Lists | Create, AI suggestions, views | 4m |
| Brands | Profiles, token injection | 2m |
| Assets | Gallery, filtering, bulk ops | 3m |

**Total: ~18 minutes (parallel execution)**

### 6.3 Provider Integration Tests

| Provider | Tests | Real API |
|----------|-------|----------|
| OpenAI | Text, image, streaming | Optional |
| Anthropic | Text, tool use | Optional |
| Kimi | Text (OpenAI-compatible) | Optional |
| Gemini | Text, image | Optional |
| Flux Pro | Image generation | Optional |
| Imagen 3 | Image generation | Optional |
| Runway Gen-4 | Video async jobs | Optional |
| Veo 3 | Video generation | Optional |

**Run with `USE_REAL_PROVIDERS=true` for validation**

---

## 7. CI/CD Integration

### 7.1 GitHub Actions

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e-mocked:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests (mocked)
        run: npx playwright test
        env:
          CI: true
      
      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  e2e-real-providers:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: e2e-mocked
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - name: Run E2E tests (real providers)
        run: npx playwright test e2e/playwright/tests/providers
        env:
          USE_REAL_PROVIDERS: true
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          FLUX_API_KEY: ${{ secrets.FLUX_API_KEY }}
          RUNWAY_API_KEY: ${{ secrets.RUNWAY_API_KEY }}
```

### 7.2 Package Scripts

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:smoke": "playwright test e2e/playwright/tests/smoke",
    "e2e:workflows": "playwright test e2e/playwright/tests/workflows",
    "e2e:providers": "playwright test e2e/playwright/tests/providers",
    "e2e:real": "USE_REAL_PROVIDERS=true playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:debug": "playwright test --debug",
    "e2e:report": "playwright show-report"
  }
}
```

---

## 8. Environment Configuration

### 8.1 Environment Variables

```bash
# .env.e2e
# Test configuration
CI=true
PLAYWRIGHT_TIMEOUT=30000

# Provider mode
USE_REAL_PROVIDERS=false

# Real provider keys (only used when USE_REAL_PROVIDERS=true)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
KIMI_API_KEY=
GEMINI_API_KEY=
FLUX_API_KEY=
RUNWAY_API_KEY=
VEO_API_KEY=
```

### 8.2 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const useRealProviders = process.env.USE_REAL_PROVIDERS === 'true';

export default defineConfig({
  testDir: './e2e/playwright/tests',
  outputDir: './e2e/playwright/test-results',
  
  fullyParallel: !useRealProviders, // Can't parallel real API calls
  workers: useRealProviders ? 1 : undefined,
  
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    
    // Pass env to browser
    env: {
      USE_REAL_PROVIDERS: process.env.USE_REAL_PROVIDERS || 'false'
    }
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});
```

---

## 9. Test Data Attributes

Add these `data-testid` attributes to components:

### 9.1 Navigation
- `nav-generate`
- `nav-templates`
- `nav-assets`
- `nav-shot-lists`
- `nav-brands`
- `nav-settings`

### 9.2 Provider Settings
- `add-provider`
- `provider-select`
- `api-key-input`
- `validate-btn`
- `status-badge`
- `provider-option`

### 9.3 Templates
- `template-name`
- `template-content`
- `add-variable`
- `save-template`
- `version-history`
- `template-list`

### 9.4 Shot Lists
- `new-shot-list`
- `shot-list-name`
- `project-type`
- `create-btn`
- `add-shot`
- `shot-name`
- `shot-frame`
- `save-shot`
- `shot-{n}-generate`
- `shot-{n}-status`
- `shot-{n}-thumbnail`
- `storyboard-view-btn`
- `storyboard-grid`
- `shot-row`
- `shot-list-container`

### 9.5 Generation
- `prompt-input`
- `provider-select`
- `generate-btn`
- `stream-output`
- `generated-image`
- `save-asset`

### 9.6 Assets
- `asset-grid`
- `asset-card`
- `type-filter`
- `date-from`
- `select-mode-btn`
- `asset-{n}-checkbox`
- `bulk-tag-btn`
- `tag-input`
- `apply-tags`

---

## 10. Success Criteria

The e2e testing system is complete when:

1. ✅ All smoke tests pass in <2 minutes
2. ✅ All workflow tests pass with mocked providers
3. ✅ Provider integration tests pass with real APIs
4. ✅ Tests run in CI on every PR
5. ✅ Tests can run locally with single command
6. ✅ Mock/real provider switching works via env var
7. ✅ Parallel test execution works (mocked mode)
8. ✅ Test database isolation works correctly
9. ✅ Screenshots/videos captured on failure
10. ✅ HTML report generated with traces

---

## 11. Next Steps

See `IMPLEMENTATION_PLAN.md` for the step-by-step implementation guide with parallel agent assignments.
