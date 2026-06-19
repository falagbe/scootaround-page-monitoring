import { defineConfig, devices } from '@playwright/test'

/**
 * Config for the MAIN SITE (scootaround.com) monitor. Runs LOCALLY from a
 * trusted WiFi IP (not GitHub Actions) because the site is behind Cloudflare
 * bot protection that blocks datacenter IPs.
 *
 * Uses a real browser User-Agent (the default headless UA gets flagged), and
 * sends an X-Monitor-Key header so the site's Cloudflare can optionally
 * allow-list this monitor later.
 *
 * Run with:  npm run monitor:main
 */
export default defineConfig({
  testDir: './tests',
  testMatch: 'main-site.spec.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 2,
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-main' }],
    ['json', { outputFile: 'results-main.json' }],
  ],
  outputDir: 'test-results-main',
  use: {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    extraHTTPHeaders: process.env.MONITOR_KEY ? { 'X-Monitor-Key': process.env.MONITOR_KEY } : {},
    screenshot: 'on',
    video: 'on',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'main-chromium', use: { ...devices['Desktop Chrome'] } }],
})
