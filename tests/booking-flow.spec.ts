import { test, expect } from '@playwright/test'
import { STANDARD_LOCATIONS } from './locations'
import { startQuote } from './booking'

/**
 * TIER 3 — End-to-end booking flow (standard city pages).
 *
 * Simulates a real customer through the full funnel: location, dates, quote,
 * add equipment to cart (real pricing), and on to the checkout / Rider
 * Information page. Validates the entire journey — page, autocomplete, quote
 * engine, cart, and checkout.
 *
 * It STOPS at checkout — never clicks "Confirm" — so monitoring never places
 * real bookings. If a location has no inventory for the test dates, the funnel
 * still works: startQuote returns 'no-inventory' and the test passes (the
 * dashboard shows it as amber, and no alert fires).
 */
for (const loc of STANDARD_LOCATIONS) {
  test(`booking funnel reaches checkout [${loc.slug}]`, async ({ page }, testInfo) => {
    await page.goto(loc.path)

    const outcome = await startQuote(page, loc, testInfo)

    // startQuote asserts the end state internally; this guards the contract.
    expect(['checkout', 'no-inventory']).toContain(outcome)
  })
}
