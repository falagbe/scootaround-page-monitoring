// Posts a failure alert to Teams with the dashboard link + the actual
// screenshot of each broken page. Reads dashboard/summary.json (produced by
// build-dashboard.mjs) and uses these env vars:
//   TEAMS_WEBHOOK_URL  — the Power Automate webhook (GitHub secret)
//   DASHBOARD_URL      — the published GitHub Pages URL (ends with '/')
//   RUN_URL            — link to the GitHub Actions run
import fs from 'node:fs'

const webhook = process.env.TEAMS_WEBHOOK_URL
if (!webhook) { console.log('TEAMS_WEBHOOK_URL not set — skipping Teams alert.'); process.exit(0) }

const dash = (process.env.DASHBOARD_URL || '').replace(/\/?$/, '/')
const runUrl = process.env.RUN_URL || ''
const summary = JSON.parse(fs.readFileSync('dashboard/summary.json', 'utf8'))

// Show the screenshot of each broken page (cap at 5 to keep the card sane),
// plus a link to the recorded video replay of the flow when available.
const shots = []
for (const f of summary.failed.slice(0, 5)) {
  shots.push({ type: 'TextBlock', weight: 'Bolder', text: `✗ ${f.name}`, spacing: 'Medium', wrap: true })
  if (f.screenshot && dash) shots.push({ type: 'Image', url: dash + f.screenshot, size: 'Large', altText: `Screenshot of ${f.name}` })
  if (f.video && dash) shots.push({ type: 'TextBlock', wrap: true, text: `[▶ Watch replay of ${f.name}](${dash + f.video})` })
}

const card = {
  $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
  type: 'AdaptiveCard',
  version: '1.4',
  body: [
    { type: 'TextBlock', size: 'Large', weight: 'Bolder', color: 'Attention', text: '🔴 Booking flow monitor FAILED' },
    { type: 'TextBlock', wrap: true, text: `${summary.failedCount} of ${summary.total} pages need attention. A customer may be unable to complete a booking — investigate before ad spend is wasted.` },
    ...shots,
  ],
  actions: [
    ...(dash ? [{ type: 'Action.OpenUrl', title: 'Open status dashboard', url: dash }] : []),
    ...(runUrl ? [{ type: 'Action.OpenUrl', title: 'View run & evidence', url: runUrl }] : []),
  ],
}

const res = await fetch(webhook, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }] }),
})
console.log(`Teams alert: HTTP ${res.status}`)
if (!res.ok) process.exit(1)
