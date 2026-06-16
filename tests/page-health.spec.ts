import { test, expect } from '@playwright/test'
import { LOCATIONS } from './locations'

/**
 * TIER 1 — Page health & booking-widget presence.
 *
 * This is the check that would have caught the Nashville incident: if a page
 * is disabled, redirected, or its booking widget is missing, these fail and
 * alert — instead of Marketing discovering it weeks later via ad data.
 *
 * Fast, deterministic, and safe to run frequently against every page.
 */
for (const loc of LOCATIONS) {
  test.describe(`${loc.name} — page health`, () => {
    test(`page loads and returns 200 [${loc.slug}]`, async ({ page }) => {
      const resp = await page.goto(loc.path)
      expect(resp?.status(), 'page must return HTTP 200').toBe(200)
      // The page must actually be the location page, not a redirect/error.
      await expect(page).toHaveTitle(new RegExp(loc.name.split(',')[0], 'i'))
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })

    test(`booking widget is present and usable [${loc.slug}]`, async ({ page }) => {
      await page.goto(loc.path)
      // The three rental-type tabs.
      await expect(page.getByRole('button', { name: /cruise/i }).first()).toBeVisible()
      await expect(page.getByRole('button', { name: /hotel/i }).first()).toBeVisible()
      await expect(page.getByRole('button', { name: /event/i }).first()).toBeVisible()
      // Pickup field, dates field, and the call-to-action.
      await expect(page.getByPlaceholder(/Pickup/i).first()).toBeVisible()
      await expect(page.getByText('Rental Dates', { exact: false }).first()).toBeVisible()
      await expect(page.getByRole('button', { name: /get a quote/i }).first()).toBeVisible()
    })

    test(`rental rate tables are shown [${loc.slug}]`, async ({ page }) => {
      await page.goto(loc.path)
      await expect(page.getByRole('heading', { name: /Rental Rates for Hotel/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: /Rental Rates for Cruise/i })).toBeVisible()
    })

    test(`location autocomplete backend is alive [${loc.slug}]`, async ({ page }) => {
      await page.goto(loc.path)
      const pickup = page.getByPlaceholder(/Pickup/i).first()
      await pickup.click()
      await pickup.fill(loc.pickup)
      // If the autocomplete service is down, no suggestions appear and the
      // whole booking flow is dead — assert at least one suggestion shows.
      await expect(page.locator('[role="option"], li').filter({ hasText: /\w/ }).first())
        .toBeVisible({ timeout: 10_000 })
    })
  })
}
