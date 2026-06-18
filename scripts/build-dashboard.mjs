// Turns Playwright's results.json into a non-technical status dashboard:
//   dashboard/index.html   — visual grid (green = operational, red = down)
//   dashboard/screens/*.png — failure screenshots, copied in
//   dashboard/summary.json  — machine-readable summary for the Teams alert
//
// Run locally with: npm run dashboard   (after `npm test`)
import fs from 'node:fs'
import path from 'node:path'

const RESULTS = 'results.json'
const OUT = 'dashboard'
const SCREENS = path.join(OUT, 'screens')

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(SCREENS, { recursive: true })

if (!fs.existsSync(RESULTS)) {
  console.error(`No ${RESULTS} found — run the tests first (the json reporter writes it).`)
  process.exit(1)
}
const data = JSON.parse(fs.readFileSync(RESULTS, 'utf8'))

// Real display names from locations.ts (fallback to a title-cased slug).
const nameMap = {}
try {
  const src = fs.readFileSync('tests/locations.ts', 'utf8')
  for (const m of src.matchAll(/slug:\s*'([^']+)',\s*name:\s*'([^']+)'/g)) nameMap[m[1]] = m[2]
} catch {}
const titleCase = (s) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').replace(/\bDc\b/, 'DC')

// Flatten the nested suite tree into specs.
const specs = []
const walk = (suite) => {
  for (const s of suite.suites || []) walk(s)
  for (const sp of suite.specs || []) specs.push(sp)
}
for (const s of data.suites || []) walk(s)

// Aggregate every check under its page slug.
const slugRe = /\[([a-z0-9-]+)\]/i
const pages = new Map()
for (const spec of specs) {
  const m = spec.title.match(slugRe)
  if (!m) continue
  const slug = m[1]
  if (!pages.has(slug)) pages.set(slug, { slug, name: nameMap[slug] || titleCase(slug), ok: true, checks: [], screenshot: null })
  const p = pages.get(slug)
  const label = spec.title.replace(slugRe, '').trim()
  p.checks.push({ label, ok: spec.ok })
  if (!spec.ok) {
    p.ok = false
    for (const t of spec.tests || [])
      for (const r of t.results || [])
        for (const a of r.attachments || [])
          if (a.name === 'screenshot' && a.path && !p.screenshot && fs.existsSync(a.path)) {
            fs.copyFileSync(a.path, path.join(SCREENS, `${slug}.png`))
            p.screenshot = `screens/${slug}.png`
          }
  }
}

const all = [...pages.values()].sort((a, b) => Number(a.ok) - Number(b.ok) || a.name.localeCompare(b.name))
const failed = all.filter((p) => !p.ok)
const passed = all.filter((p) => p.ok)
const generated = new Date().toISOString()

fs.writeFileSync(
  path.join(OUT, 'summary.json'),
  JSON.stringify({ total: all.length, passed: passed.length, failedCount: failed.length, failed: failed.map((p) => ({ slug: p.slug, name: p.name, screenshot: p.screenshot })), generated }, null, 2)
)

const allHealthy = failed.length === 0
const banner = allHealthy
  ? `<div class="banner ok">All ${all.length} pages operational</div>`
  : `<div class="banner down">${failed.length} of ${all.length} ${failed.length > 1 ? 'pages need' : 'page needs'} attention</div>`

const card = (p) => `
  <div class="card ${p.ok ? 'ok' : 'down'}">
    <div class="card-head">
      <span class="dot"></span>
      <span class="name">${p.name}</span>
      <span class="badge">${p.ok ? 'Operational' : 'Down'}</span>
    </div>
    ${p.ok
      ? `<div class="checks">${p.checks.length} checks passed</div>`
      : `<div class="checks fail">${p.checks.filter((c) => !c.ok).map((c) => '✗ ' + c.label).join('<br>')}</div>
         ${p.screenshot ? `<a href="${p.screenshot}" target="_blank"><img class="shot" src="${p.screenshot}" alt="screenshot of ${p.name}"></a>` : ''}`}
  </div>`

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="300">
<title>Scootaround Booking Flow Status</title>
<style>
  :root { --ok:#16a34a; --down:#dc2626; --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --bg:#f8fafc; }
  * { box-sizing:border-box; } body { margin:0; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; background:var(--bg); color:var(--ink); }
  header { background:#001c3c; color:#fff; padding:28px 24px; }
  header h1 { margin:0 0 4px; font-size:22px; } header p { margin:0; color:#9fb6d1; font-size:14px; }
  .wrap { max-width:1100px; margin:0 auto; padding:24px; }
  .banner { font-weight:700; font-size:18px; padding:14px 18px; border-radius:10px; margin:20px 0; }
  .banner.ok { background:#dcfce7; color:#166534; } .banner.down { background:#fee2e2; color:#991b1b; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
  .card { background:#fff; border:1px solid var(--line); border-left-width:5px; border-radius:10px; padding:14px 16px; }
  .card.ok { border-left-color:var(--ok); } .card.down { border-left-color:var(--down); }
  .card-head { display:flex; align-items:center; gap:8px; }
  .dot { width:10px; height:10px; border-radius:50%; } .card.ok .dot{background:var(--ok);} .card.down .dot{background:var(--down);}
  .name { font-weight:600; flex:1; } .badge { font-size:12px; font-weight:700; text-transform:uppercase; }
  .card.ok .badge{color:var(--ok);} .card.down .badge{color:var(--down);}
  .checks { margin-top:8px; font-size:13px; color:var(--muted); } .checks.fail { color:var(--down); font-weight:600; }
  .shot { width:100%; margin-top:10px; border-radius:6px; border:1px solid var(--line); }
  footer { color:var(--muted); font-size:13px; text-align:center; padding:24px; }
</style></head>
<body>
  <header><h1>Scootaround — Booking Flow Status</h1><p>Automated end-to-end monitoring of every location &amp; port rental page</p></header>
  <div class="wrap">
    ${banner}
    <div class="grid">${all.map(card).join('')}</div>
    <footer>Last checked: ${generated} · Auto-refreshes every 5 min · ${passed.length}/${all.length} healthy</footer>
  </div>
</body></html>`

fs.writeFileSync(path.join(OUT, 'index.html'), html)
console.log(`Dashboard built: ${passed.length}/${all.length} healthy, ${failed.length} down -> ${OUT}/index.html`)
