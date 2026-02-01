import { defineConfig, devices } from '@playwright/test';

const useRealProviders = process.env.USE_REAL_PROVIDERS === 'true';

export default defineConfig({
  testDir: '../tests',
  outputDir: '../test-results',

  fullyParallel: !useRealProviders,
  workers: useRealProviders ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  timeout: useRealProviders ? 120000 : 30000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry'
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
