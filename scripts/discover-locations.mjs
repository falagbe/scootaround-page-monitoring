// Visit every candidate location/port page and report: title, H1, whether the
// booking widget + rate tables are present. Drives accurate locations.ts config.
import { chromium } from '@playwright/test'

const BASE = 'https://d3kr993ddp3hq3.cloudfront.net'
const PATHS = [
  '/us/anaheim', '/us/atlanta', '/us/boston', '/us/charlotte', '/us/chicago',
  '/us/dallas', '/us/disney-world', '/us/disneyland-state', '/us/fort-lauderdale',
  '/us/honolulu', '/us/jacksonville', '/us/las-vegas', '/us/los-angeles', '/us/miami',
  '/us/nashville', '/us/new-orleans', '/us/new-york', '/us/orlando', '/us/philadelphia',
  '/us/phoenix', '/us/port-canaveral-scooter-rentals', '/us/royal-caribbean-scooter-rentals',
  '/us/tampa', '/us/washington-dc',
]

const browser = await chromium.launch()
const ctx = await browser.newContext()
const results = []
for (const path of PATHS) {
  const page = await ctx.newPage()
  try {
    const resp = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1200)
    const title = await page.title()
    const h1 = (await page.locator('h1').first().innerText().catch(() => '')).trim()
    const hasQuote = await page.getByRole('button', { name: /get a quote/i }).first().isVisible().catch(() => false)
    const hasPickup = await page.getByPlaceholder(/Pickup/i).first().isVisible().catch(() => false)
    const hasRates = await page.getByRole('heading', { name: /Rental Rates/i }).first().isVisible().catch(() => false)
    results.push({ path, status: resp?.status(), title, h1, hasQuote, hasPickup, hasRates })
  } catch (e) {
    results.push({ path, error: e.message.split('\n')[0] })
  }
  await page.close()
}
await browser.close()
for (const r of results) console.log(JSON.stringify(r))
