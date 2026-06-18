// Turns Playwright's results.json into a polished, non-technical status
// dashboard built on Bootstrap 5 (CDN — no build step):
//   dashboard/index.html    — navbar, summary stats, per-page cards with a
//                             screenshot thumbnail, expandable check details,
//                             a live-page link, and a click-to-zoom lightbox
//   dashboard/screens/*.png — one screenshot per page
//   dashboard/summary.json  — machine-readable summary for the Teams alert
//
// Run locally with: npm test && npm run dashboard
import fs from 'node:fs'
import path from 'node:path'

const RESULTS = 'results.json'
const OUT = 'dashboard'
const SCREENS = path.join(OUT, 'screens')
const BASE_URL = (process.env.BASE_URL || 'https://d3kr993ddp3hq3.cloudfront.net').replace(/\/$/, '')

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(SCREENS, { recursive: true })

if (!fs.existsSync(RESULTS)) {
  console.error(`No ${RESULTS} found — run the tests first (the json reporter writes it).`)
  process.exit(1)
}
const data = JSON.parse(fs.readFileSync(RESULTS, 'utf8'))

// slug -> { name, path } from locations.ts (fallback to a title-cased slug).
const meta = {}
try {
  const src = fs.readFileSync('tests/locations.ts', 'utf8')
  for (const m of src.matchAll(/slug:\s*'([^']+)',\s*name:\s*'([^']+)',\s*path:\s*'([^']+)'/g))
    meta[m[1]] = { name: m[2], path: m[3] }
} catch {}
const titleCase = (s) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').replace(/\bDc\b/, 'DC')

// Flatten the nested suite tree into specs.
const specs = []
const walk = (suite) => {
  for (const s of suite.suites || []) walk(s)
  for (const sp of suite.specs || []) specs.push(sp)
}
for (const s of data.suites || []) walk(s)

const firstShot = (spec) => {
  for (const t of spec.tests || [])
    for (const r of t.results || [])
      for (const a of r.attachments || [])
        if (a.name === 'screenshot' && a.path && fs.existsSync(a.path)) return a.path
  return null
}

// Aggregate every check under its page slug.
const slugRe = /\[([a-z0-9-]+)\]/i
const pages = new Map()
for (const spec of specs) {
  const m = spec.title.match(slugRe)
  if (!m) continue
  const slug = m[1]
  if (!pages.has(slug))
    pages.set(slug, { slug, name: meta[slug]?.name || titleCase(slug), url: BASE_URL + (meta[slug]?.path || '/'), ok: true, checks: [], thumbSrc: null, failSrc: null })
  const p = pages.get(slug)
  const label = spec.title.replace(slugRe, '').trim()
  p.checks.push({ label, ok: spec.ok })
  const shot = firstShot(spec)
  if (shot) {
    if (/healthy/i.test(label) || !p.thumbSrc) p.thumbSrc = shot // prefer the clean page view
    if (!spec.ok && !p.failSrc) p.failSrc = shot
  }
  if (!spec.ok) p.ok = false
}

// Copy the chosen screenshot for each page (failure shot wins when down).
for (const p of pages.values()) {
  const src = p.failSrc || p.thumbSrc
  if (src) {
    fs.copyFileSync(src, path.join(SCREENS, `${p.slug}.png`))
    p.img = `screens/${p.slug}.png`
  }
}

const all = [...pages.values()].sort((a, b) => Number(a.ok) - Number(b.ok) || a.name.localeCompare(b.name))
const failed = all.filter((p) => !p.ok)
const passed = all.filter((p) => p.ok)
const generated = new Date().toISOString()

fs.writeFileSync(
  path.join(OUT, 'summary.json'),
  JSON.stringify({ total: all.length, passed: passed.length, failedCount: failed.length, failed: failed.map((p) => ({ slug: p.slug, name: p.name, screenshot: p.img || null })), generated }, null, 2)
)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const checkRow = (c) =>
  `<li class="list-group-item d-flex align-items-center gap-2 px-0 py-1 border-0 small">
     <i class="bi ${c.ok ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}"></i>
     <span>${esc(c.label)}</span>
   </li>`

const cardFor = (p) => {
  const passN = p.checks.filter((c) => c.ok).length
  const thumb = p.img
    ? `<div class="thumb ratio ratio-16x9" role="button" data-img="${p.img}" data-name="${esc(p.name)}">
         <img src="${p.img}" class="object-fit-cover w-100 h-100" alt="${esc(p.name)}" loading="lazy">
         <span class="zoom-hint"><i class="bi bi-zoom-in"></i></span>
       </div>`
    : `<div class="thumb ratio ratio-16x9 bg-light d-flex align-items-center justify-content-center text-muted small">no screenshot</div>`
  return `
  <div class="col">
    <div class="card h-100 shadow-sm border-0 page-card ${p.ok ? 'ok' : 'down'}">
      ${thumb}
      <div class="card-body pb-2">
        <div class="d-flex justify-content-between align-items-start mb-1">
          <h6 class="card-title fw-bold mb-0">${esc(p.name)}</h6>
          <span class="badge rounded-pill ${p.ok ? 'text-bg-success' : 'text-bg-danger'}">${p.ok ? 'Operational' : 'Down'}</span>
        </div>
        <div class="text-muted small mb-2">${passN}/${p.checks.length} checks passing</div>
        <button class="btn btn-sm btn-outline-secondary py-0" data-bs-toggle="collapse" data-bs-target="#d-${p.slug}">
          <i class="bi bi-list-check"></i> Details
        </button>
        <div class="collapse mt-2" id="d-${p.slug}"><ul class="list-group list-group-flush mb-0">${p.checks.map(checkRow).join('')}</ul></div>
      </div>
      <div class="card-footer bg-transparent border-0 pt-0 pb-3">
        <a href="${p.url}" target="_blank" rel="noopener" class="btn btn-sm btn-primary w-100">
          <i class="bi bi-box-arrow-up-right"></i> Open live page
        </a>
      </div>
    </div>
  </div>`
}

const stat = (label, value, cls) =>
  `<div class="col"><div class="card border-0 shadow-sm text-center py-3"><div class="display-6 fw-bold ${cls}">${value}</div><div class="text-muted small text-uppercase">${label}</div></div></div>`

const allHealthy = failed.length === 0
const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="300">
<title>Scootaround Booking Flow Status</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<style>
  body { background:#f1f5f9; }
  .brand-bar { background:#001c3c; }
  .page-card { transition:transform .12s ease, box-shadow .12s ease; overflow:hidden; }
  .page-card:hover { transform:translateY(-3px); box-shadow:0 .75rem 1.5rem rgba(0,0,0,.12)!important; }
  .page-card.ok { border-top:4px solid #16a34a!important; }
  .page-card.down { border-top:4px solid #dc2626!important; }
  .thumb { overflow:hidden; background:#e2e8f0; }
  .thumb img { object-position:top; }
  .zoom-hint { position:absolute; right:.5rem; bottom:.5rem; background:rgba(0,0,0,.55); color:#fff; border-radius:.4rem; padding:.1rem .4rem; font-size:.8rem; opacity:0; transition:opacity .12s; }
  .thumb:hover .zoom-hint { opacity:1; }
  .list-group-item { background:transparent; }
</style></head>
<body>
  <nav class="navbar brand-bar navbar-dark py-3">
    <div class="container">
      <span class="navbar-brand fw-bold mb-0"><i class="bi bi-activity"></i> Scootaround · Booking Flow Status</span>
      <span class="badge fs-6 ${allHealthy ? 'text-bg-success' : 'text-bg-danger'}">
        ${allHealthy ? '<i class="bi bi-check-circle"></i> All systems operational' : '<i class="bi bi-exclamation-triangle"></i> ' + failed.length + ' down'}
      </span>
    </div>
  </nav>

  <div class="container py-4">
    <p class="text-muted">Automated end-to-end monitoring of every location &amp; port rental booking flow. Updated ${esc(generated)} · auto-refreshes every 5&nbsp;min.</p>

    <div class="row row-cols-2 row-cols-md-4 g-3 mb-4">
      ${stat('Pages monitored', all.length, 'text-dark')}
      ${stat('Operational', passed.length, 'text-success')}
      ${stat('Down', failed.length, failed.length ? 'text-danger' : 'text-muted')}
      ${stat('Checks run', all.reduce((n, p) => n + p.checks.length, 0), 'text-dark')}
    </div>

    <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
      ${all.map(cardFor).join('')}
    </div>

    <p class="text-center text-muted small mt-4 mb-0">Generated by the Scootaround page-monitoring suite · ${passed.length}/${all.length} healthy</p>
  </div>

  <div class="modal fade" id="lightbox" tabindex="-1"><div class="modal-dialog modal-xl modal-dialog-centered">
    <div class="modal-content"><div class="modal-header py-2"><h6 class="modal-title" id="shotCap"></h6>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body p-0"><img id="shot" class="w-100" alt=""></div></div>
  </div></div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-img]'); if (!t) return;
      document.getElementById('shot').src = t.dataset.img;
      document.getElementById('shotCap').textContent = t.dataset.name;
      bootstrap.Modal.getOrCreateInstance(document.getElementById('lightbox')).show();
    });
  </script>
</body></html>`

fs.writeFileSync(path.join(OUT, 'index.html'), html)
console.log(`Dashboard built: ${passed.length}/${all.length} healthy, ${failed.length} down -> ${OUT}/index.html`)
