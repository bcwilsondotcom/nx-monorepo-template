/**
 * Playwright Configuration for E2E Tests
 * T116 - Playwright configuration for end-to-end testing
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Test directory
  testDir: './tests',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.CI ? [['github']] : [['list']]),
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Record video on test failure
    video: 'retain-on-failure',

    // Screenshot on test failure
    screenshot: 'only-on-failure',

    // Global timeout for actions
    actionTimeout: 10000,

    // Global timeout for navigation
    navigationTimeout: 30000,

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Custom headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // Configure projects for major browsers
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },

    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },

    // Authenticated tests
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.authenticated\.spec\.ts/,
    },

    // API tests
    {
      name: 'api',
      use: {
        baseURL: process.env.API_URL || 'http://localhost:3001',
      },
      testMatch: /.*\.api\.spec\.ts/,
    },
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./helpers/global-setup.ts'),
  globalTeardown: require.resolve('./helpers/global-teardown.ts'),

  // Folder for test artifacts such as screenshots, videos, traces, etc.
  outputDir: 'test-results/',

  // Run your local dev server before starting the tests
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: 'pnpm nx serve web-app',
          port: 3000,
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
        {
          command: 'pnpm nx serve api-example',
          port: 3001,
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      ],

  // Test timeout
  timeout: 30000,

  // Global test timeout
  globalTimeout: process.env.CI ? 30 * 60 * 1000 : 0, // 30 minutes on CI

  // Maximum number of test failures for the whole test suite
  maxFailures: process.env.CI ? 10 : 0,

  // Whether to update snapshots
  updateSnapshots: 'missing',

  // Expect configuration
  expect: {
    // Maximum time expect() should wait for the condition to be met
    timeout: 5000,

    // Threshold for pixel comparison
    threshold: 0.2,

    // Animation handling
    toHaveScreenshot: {
      mode: 'css',
      animations: 'disabled',
    },

    toMatchSnapshot: {
      mode: 'css',
      animations: 'disabled',
    },
  },

  // Metadata
  metadata: {
    'test-type': 'e2e',
    'test-runner': 'playwright',
    'project': 'nx-monorepo-template',
  },
});