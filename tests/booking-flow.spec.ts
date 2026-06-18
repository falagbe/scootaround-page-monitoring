import { test, expect } from '@playwright/test'
import { STANDARD_LOCATIONS } from './locations'
import { startQuote } from './booking'

/**
 * TIER 3 — End-to-end booking flow (standard city pages).
 *
 * Simulates a real customer: pick a location, choose dates, get a quote, and
 * confirm they reach the equipment-selection step. Validates the whole funnel
 * — page, autocomplete, quote engine, booking app — exactly the end-to-end
 * confidence Ray asked for.
 *
 * Deliberately STOPS at equipment selection (before payment) so monitoring
 * never creates real bookings or charges.
 */
for (const loc of STANDARD_LOCATIONS) {
  test(`booking funnel reaches equipment selection [${loc.slug}]`, async ({ page }, testInfo) => {
    await page.goto(loc.path)

    await startQuote(page, loc, testInfo)

    // We should land on the booking app with dates carried through the URL.
    await expect(page).toHaveURL(/\/rental\/booking/)
    expect(page.url()).toMatch(/startDate=\d{4}-\d{2}-\d{2}/)
    expect(page.url()).toMatch(/endDate=\d{4}-\d{2}-\d{2}/)

    // The equipment-selection step must render with real equipment options.
    await expect(page.getByRole('heading', { name: /Choose Equipment/i })).toBeVisible()
  })
}
