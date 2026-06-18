import { test, expect } from '@playwright/test'
import { LOCATIONS, STANDARD_LOCATIONS } from './locations'

/**
 * TIER 1 — Page health & booking-entry presence.
 *
 * This is the check that would have caught the Nashville incident: if a page
 * is disabled, redirected, or its booking entry is missing, these fail and
 * alert — instead of Marketing discovering it weeks later via ad data.
 *
 * Runs against EVERY monitored page (cities + cruise/port pages).
 */
for (const loc of LOCATIONS) {
  test(`page is healthy & bookable [${loc.slug}]`, async ({ page }) => {
    const resp = await page.goto(loc.path)
    expect(resp?.status(), 'page must return HTTP 200').toBe(200)

    // Identity: the H1 is consistent across pages (titles are not).
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
    await expect(h1).toContainText(new RegExp(loc.match, 'i'))

    // There must be a way to start a booking.
    await expect(page.getByRole('button', { name: /get a quote/i }).first()).toBeVisible()
  })
}

/**
 * TIER 2 — Booking widget + autocomplete (standard city pages only).
 * Confirms the customer can actually begin the funnel and that the location
 * autocomplete backend is alive.
 */
for (const loc of STANDARD_LOCATIONS) {
  test(`booking widget & autocomplete work [${loc.slug}]`, async ({ page }) => {
    await page.goto(loc.path)

    // Rental-type tabs + the key inputs.
    await expect(page.getByRole('button', { name: /cruise/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /hotel/i }).first()).toBeVisible()
    await expect(page.getByPlaceholder(/Pickup/i).first()).toBeVisible()
    await expect(page.getByText('Rental Dates', { exact: false }).first()).toBeVisible()

    // Autocomplete backend: typing a city must return suggestions.
    const pickup = page.getByPlaceholder(/Pickup/i).first()
    await pickup.click()
    await pickup.fill(loc.pickup!)
    await expect(page.locator('[role="option"], li').filter({ hasText: /\w/ }).first())
      .toBeVisible({ timeout: 10_000 })
  })
}
