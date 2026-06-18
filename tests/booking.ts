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
export async function startQuote(page: Page, loc: MonitoredPage, testInfo?: TestInfo): Promise<'checkout' | 'no-inventory'> {
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

  // 2) Rental Dates — open the calendar and pick a start + end day. Past days
  // carry aria-disabled="true"; select only from future (enabled) cells so we
  // never click an invalid day the widget silently rejects. (Near-term dates
  // are the most reliable to select; any sold-out window is handled as
  // "no inventory" below rather than treated as a failure.)
  await page.getByText('Rental Dates', { exact: false }).first().click()
  const days = page.locator('[role="gridcell"]:not([aria-disabled="true"])').filter({ hasText: /^\d{1,2}$/ })
  await expect(days.first()).toBeVisible()
  await days.nth(1).click() // start date
  await days.nth(5).click() // end date (a few-day rental)

  // Some pages auto-commit on the second click; others have a "Done" button.
  // Click Done as a best-effort commit — the real gate is the button enabling.
  await page.getByRole('button', { name: /^done$/i }).click({ timeout: 3_000 }).catch(() => {})
  await snap(testInfo, page, 3, 'Selected rental dates')

  // 3) The button must now be enabled — a customer can proceed.
  await expect(quoteBtn).toBeEnabled({ timeout: 15_000 })
  await Promise.all([page.waitForURL(/\/rental\/booking/, { timeout: 30_000 }), quoteBtn.click()])
  await expect(page.getByRole('heading', { name: /Choose Equipment/i })).toBeVisible()
  await snap(testInfo, page, 4, 'Reached equipment selection')

  // 4) Either equipment is available (Add to cart) or the page legitimately
  // reports no inventory for these dates. Wait for whichever appears.
  const addToCart = page.getByRole('button', { name: /add to cart/i }).first()
  const noStock = page.getByText(/No equipment is available/i).first()
  await expect(addToCart.or(noStock)).toBeVisible({ timeout: 20_000 })

  // No inventory is NOT a site failure — the funnel works, there's just nothing
  // bookable on these dates. Flag it for the dashboard (amber) and stop.
  if (await noStock.isVisible().catch(() => false)) {
    if (testInfo) await testInfo.attach('inventory-status', { body: Buffer.from('none'), contentType: 'text/plain' })
    await snap(testInfo, page, 5, 'No equipment available for these dates')
    return 'no-inventory'
  }

  // Add equipment to the cart — a real "Book Now - $price" button must appear.
  await addToCart.click()
  const bookNow = page.getByRole('button', { name: /book now/i }).first()
  await expect(bookNow).toBeVisible({ timeout: 15_000 })
  await expect(bookNow).toContainText(/\$\s*\d/) // a real price is shown
  await snap(testInfo, page, 5, 'Added equipment, price shown')

  // 5) Proceed to checkout — reach the Rider Information / Confirm page.
  // We STOP here on purpose: clicking "Confirm" would place a real booking,
  // so monitoring validates everything up to (not including) order submission.
  await Promise.all([page.waitForURL(/\/rental\/checkout/, { timeout: 30_000 }), bookNow.click()])
  await expect(page.getByRole('heading', { name: /Rider Information/i })).toBeVisible()
  await snap(testInfo, page, 6, 'Reached checkout (Rider Information)')
  return 'checkout'
}
