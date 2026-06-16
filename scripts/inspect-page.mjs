// Quick one-off inspector: opens the target page in headless Chromium and
// dumps the real headings, buttons, links and form fields so we can write
// accurate Playwright selectors. Run with: npm run inspect
import { chromium } from '@playwright/test'

const URL = process.argv[2] || 'https://d3kr993ddp3hq3.cloudfront.net/us/orlando'

const browser = await chromium.launch()
const page = await browser.newPage()

const resp = await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
console.log('STATUS:', resp?.status())
console.log('FINAL URL:', page.url())
console.log('TITLE:', await page.title())

const grab = (sel) =>
  page.$$eval(sel, (els) =>
    els
      .map((e) => (e.innerText || e.value || e.placeholder || e.getAttribute('aria-label') || '').trim())
      .filter(Boolean)
      .slice(0, 40)
  )

console.log('\n=== HEADINGS (h1,h2,h3) ===')
console.log((await grab('h1,h2,h3')).join('\n'))

console.log('\n=== BUTTONS ===')
console.log((await grab('button,[role="button"]')).join('\n'))

console.log('\n=== LINKS ===')
console.log((await grab('a')).slice(0, 30).join('\n'))

console.log('\n=== INPUTS / SELECTS ===')
console.log(
  (
    await page.$$eval('input,select,textarea', (els) =>
      els
        .map((e) => `${e.tagName.toLowerCase()}[name=${e.name || ''}][type=${e.type || ''}] ph="${e.placeholder || ''}"`)
        .slice(0, 40)
    )
  ).join('\n')
)

await page.screenshot({ path: 'inspect-orlando.png', fullPage: true })
console.log('\nSaved screenshot -> inspect-orlando.png')
await browser.close()
