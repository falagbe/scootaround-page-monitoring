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

  // 1) Pickup — type, wait for the autocomplete service to return a
  // suggestion (don't rely on a fixed delay — it's slower under load), then
  // commit the first suggestion via the keyboard.
  const pickup = page.getByPlaceholder(/Pickup/i).first()
  await pickup.click()
  await pickup.fill(loc.pickup!)
  await expect(page.locator('[role="option"], li').filter({ hasText: /\w/ }).first())
    .toBeVisible({ timeout: 15_000 })
  await pickup.press('ArrowDown')
  await pickup.press('Enter')

  // 2) Rental Dates — open the calendar and pick a start + end day.
  // Past days carry aria-disabled="true"; select only from future (enabled)
  // cells so we never click an invalid day the widget silently rejects.
  await page.getByText('Rental Dates', { exact: false }).first().click()
  const days = page
    .locator('[role="gridcell"]:not([aria-disabled="true"])')
    .filter({ hasText: /^\d{1,2}$/ })
  await expect(days.first()).toBeVisible()
  await days.nth(1).click() // start date (a couple days out)
  await days.nth(5).click() // end date

  // Some pages auto-commit when the end date is picked (the calendar closes);
  // others have a "Done" button. Click Done only as a best-effort commit —
  // the real success gate is the Get-a-Quote button becoming enabled below.
  await page.getByRole('button', { name: /^done$/i }).click({ timeout: 3_000 }).catch(() => {})

  // 3) The button must now be enabled — a customer can proceed.
  await expect(quoteBtn).toBeEnabled({ timeout: 15_000 })
  await Promise.all([page.waitForURL(/\/rental\/booking/, { timeout: 30_000 }), quoteBtn.click()])
}
