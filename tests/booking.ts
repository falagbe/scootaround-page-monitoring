import { Page, TestInfo, expect } from '@playwright/test'
import { MonitoredPage } from './locations'

// Attach a captioned screenshot of the current step so the dashboard can show
// the full customer journey as a filmstrip. Name format: journey::<n>::<caption>.
async function snap(testInfo: TestInfo | undefined, page: Page, n: number, caption: string) {
  if (!testInfo) return
  try {
    await testInfo.attach(`journey::${n}::${caption}`, { body: await page.screenshot(), contentType: 'image/png' })
  } catch {
    /* never let evidence capture fail the actual check */
  }
}

/**
 * Drives the booking widget the way a real customer would, capturing a
 * screenshot at each step:
 *   1. opened the page
 *   2. entered the pickup location
 *   3. selected rental dates
 *   4. reached equipment selection
 */
export async function startQuote(page: Page, loc: MonitoredPage, testInfo?: TestInfo) {
  const quoteBtn = page.getByRole('button', { name: /get a quote/i }).first()
  await snap(testInfo, page, 1, 'Opened the page')

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
  await snap(testInfo, page, 2, 'Entered pickup location')

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
  await snap(testInfo, page, 3, 'Selected rental dates')

  // 3) The button must now be enabled — a customer can proceed.
  await expect(quoteBtn).toBeEnabled({ timeout: 15_000 })
  await Promise.all([page.waitForURL(/\/rental\/booking/, { timeout: 30_000 }), quoteBtn.click()])
  await snap(testInfo, page, 4, 'Reached equipment selection')
}
