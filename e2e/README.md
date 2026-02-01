# Thresho Studio E2E Tests

End-to-end testing suite for Thresho Studio using Playwright.

## Quick Start

```bash
# Install dependencies
npm ci

# Install Playwright browsers
npx playwright install

# Run all tests
npm run e2e

# Run smoke tests only (fast)
npm run e2e:smoke

# Run workflow tests
npm run e2e:workflows

# Run with real providers (requires API keys)
USE_REAL_PROVIDERS=true npm run e2e:real

# Debug mode
npm run e2e:debug

# UI mode
npm run e2e:ui

# View report
npm run e2e:report
```

## Project Structure

```
e2e/playwright/
├── config/
│   └── playwright.config.ts    # Playwright configuration
├── helpers/
│   ├── provider-mocks.ts       # Provider mock utilities
│   ├── database.ts             # Test database helpers
│   └── test-fixtures.ts        # Test fixtures
├── page-objects/
│   ├── BasePage.ts             # Base page object
│   ├── ProviderSettingsPage.ts
│   └── TemplateEditorPage.ts
├── tests/
│   ├── smoke/                  # Quick smoke tests
│   ├── workflows/              # Full workflow tests
│   └── providers/              # Provider integration tests
└── test-results/               # Test artifacts
```

## Adding New Tests

1. **Smoke tests**: Add to `tests/smoke/` for quick checks
2. **Workflow tests**: Add to `tests/workflows/` for feature tests
3. **Provider tests**: Add to `tests/providers/` for API tests

Example:
```typescript
import { test, expect } from '@playwright/test';

test('my feature works', async ({ page }) => {
  await page.goto('/my-page');
  await expect(page.locator('[data-testid="my-element"]')).toBeVisible();
});
```

## Debugging Failures

1. **View trace**: Open `playwright-report/index.html` after test run
2. **Screenshots**: Automatically captured on failure in `test-results/`
3. **Video**: Recorded on first retry
4. **Debug mode**: Run with `npm run e2e:debug`

## CI/CD

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main`

Two jobs run in CI:
1. **e2e-mocked**: Fast tests with mocks (always runs)
2. **e2e-real-providers**: Tests with real APIs (main branch only)

## Environment Variables

Copy `.env.e2e.example` to `.env.e2e` and configure:

| Variable | Description |
|----------|-------------|
| `USE_REAL_PROVIDERS` | Set to `true` to use real APIs |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `FLUX_API_KEY` | Flux Pro API key |
| `RUNWAY_API_KEY` | Runway API key |

## Data-testid Checklist

Components that need `data-testid` attributes added:

### Navigation
- [ ] `app-shell` - Main app container
- [ ] `nav-generate` - Generate nav item
- [ ] `nav-templates` - Templates nav item
- [ ] `nav-assets` - Assets nav item
- [ ] `nav-shot-lists` - Shot lists nav item

### Provider Settings
- [ ] `add-provider` - Add provider button
- [ ] `provider-option` - Provider option in modal
- [ ] `provider-option-{type}` - Specific provider option
- [ ] `api-key-input` - API key input
- [ ] `save-api-key` - Save API key button
- [ ] `provider-status` - Provider status indicator

### Template Editor
- [ ] `template-name` - Template name input
- [ ] `template-content` - Template content input
- [ ] `save-template` - Save template button
- [ ] `template-list` - Template list container

### Generation
- [ ] `prompt-input` - Prompt input field
- [ ] `generate-btn` - Generate button
- [ ] `stream-output` - Stream output container
- [ ] `generation-status` - Generation status
- [ ] `generated-image` - Generated image display
- [ ] `generated-video` - Generated video display

### Shot Lists
- [ ] `camera-preset` - Camera preset option

### Common
- [ ] `success-toast` - Success toast notification
- [ ] `error-toast` - Error toast notification
- [ ] `db-error` - Database error banner
