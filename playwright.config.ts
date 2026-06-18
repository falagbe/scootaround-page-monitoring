import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for Scootaround page monitoring.
 * Tuned for synthetic monitoring (not local dev): retries on, traces &
 * screenshots & video captured on failure so a red run tells you exactly
 * what the "customer" saw.
 */
export default defineConfig({
  testDir: './tests',
  // A monitoring run should fail fast and clearly.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // Retry so a single network blip / transient slowness doesn't page someone
  // at 2am. A real outage fails all attempts; flakes pass on retry.
  retries: 2,
  // Run location tests in parallel.
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    // Feeds scripts/build-dashboard.mjs (the non-technical status dashboard).
    ['json', { outputFile: 'results.json' }],
  ],
  use: {
    // Base URL of the (pre-prod) site under test. Override per-environment
    // with the BASE_URL env var / GitHub secret.
    baseURL: process.env.BASE_URL || 'https://d3kr993ddp3hq3.cloudfront.net',
    // Capture a screenshot for every check — passing screenshots become the
    // page thumbnails on the dashboard; failing ones become the evidence.
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to also monitor the mobile booking experience:
    // { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
})
