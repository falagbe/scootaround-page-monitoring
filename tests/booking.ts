import { Page, expect } from '@playwright/test'
import { MonitoredPage } from './locations'

/**
 * Drives the booking widget the way a real customer would, exactly as
 * verified against the live Orlando page:
 *   1. enter a pickup location and select the autocomplete suggestion
 *   2. open "Rental Dates" and choose a start + end day
 *   3. click "Get a Quote"
 * Returns once navigation to the equipment-selection step completes.
 */
export async function startQuote(page: Page, loc: MonitoredPage) {
  const quoteBtn = page.getByRole('button', { name: /get a quote/i }).first()

  // 1) Pickup — type, then commit the first autocomplete suggestion.
  const pickup = page.getByPlaceholder(/Pickup/i).first()
  await pickup.click()
  await pickup.fill(loc.pickup)
  // Wait for the location autocomplete service to return suggestions.
  await page.waitForTimeout(1500)
  await pickup.press('ArrowDown')
  await pickup.press('Enter')

  // 2) Rental Dates — open the calendar and pick a start + end day.
  await page.getByText('Rental Dates', { exact: false }).first().click()
  const days = page
    .locator('[role="gridcell"]:not([aria-disabled="true"]), button:not([disabled])')
    .filter({ hasText: /^\d{1,2}$/ })
  await expect(days.first()).toBeVisible()
  await days.nth(3).click() // start date (a few days out)
  await days.nth(6).click() // end date

  // 3) The button must now be enabled — a customer can proceed.
  await expect(quoteBtn).toBeEnabled()
  await Promise.all([page.waitForURL(/\/rental\/booking/, { timeout: 30_000 }), quoteBtn.click()])
}
