// Turns Playwright's results.json into a polished, non-technical status site
// built on Bootstrap 5 (CDN — no build step):
//   dashboard/index.html        — overview grid (status, thumbnail, checks)
//   dashboard/pages/<slug>.html — per-page detail/proof page: video replay of
//                                 the booking flow, step-by-step journey, and
//                                 every check — shown whether it passed or not
//   dashboard/screens/*.png     — thumbnails + journey step screenshots
//   dashboard/videos/*.webm     — flow recording for each page
//   dashboard/summary.json      — machine-readable summary for the Teams alert
//
// Run locally with: npm test && npm run dashboard
import fs from 'node:fs'
import path from 'node:path'

const OUT = 'dashboard'
const SCREENS = path.join(OUT, 'screens')
const VIDEOS = path.join(OUT, 'videos')
const PAGES = path.join(OUT, 'pages')
const RESULTS = 'results.json'
const BASE_URL = (process.env.BASE_URL || 'https://d3kr993ddp3hq3.cloudfront.net').replace(/\/$/, '')

fs.rmSync(OUT, { recursive: true, force: true })
for (const d of [SCREENS, VIDEOS, PAGES]) fs.mkdirSync(d, { recursive: true })

if (!fs.existsSync(RESULTS)) {
  console.error(`No ${RESULTS} found — run the tests first (the json reporter writes it).`)
  process.exit(1)
}
const data = JSON.parse(fs.readFileSync(RESULTS, 'utf8'))

const meta = {}
try {
  const src = fs.readFileSync('tests/locations.ts', 'utf8')
  for (const m of src.matchAll(/slug:\s*'([^']+)',\s*name:\s*'([^']+)',\s*path:\s*'([^']+)'/g))
    meta[m[1]] = { name: m[2], path: m[3] }
} catch {}
const titleCase = (s) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').replace(/\bDc\b/, 'DC')

const specs = []
const walk = (suite) => {
  for (const s of suite.suites || []) walk(s)
  for (const sp of suite.specs || []) specs.push(sp)
}
for (const s of data.suites || []) walk(s)

const attachmentsOf = (spec) => {
  const out = []
  for (const t of spec.tests || []) for (const r of t.results || []) for (const a of r.attachments || []) out.push(a)
  return out
}
// Attachments carry a file `path` OR an inline base64 `body` — support both.
const exists = (a) => a && ((a.path && fs.existsSync(a.path)) || a.body)
const write = (a, rel) => {
  const dest = path.join(OUT, rel)
  if (a.path && fs.existsSync(a.path)) fs.copyFileSync(a.path, dest)
  else if (a.body) fs.writeFileSync(dest, Buffer.from(a.body, 'base64'))
  else return false
  return true
}

const slugRe = /\[([a-z0-9-]+)\]/i
const pages = new Map()
for (const spec of specs) {
  const m = spec.title.match(slugRe)
  if (!m) continue
  const slug = m[1]
  if (!pages.has(slug))
    pages.set(slug, { slug, name: meta[slug]?.name || titleCase(slug), url: BASE_URL + (meta[slug]?.path || '/'), ok: true, checks: [], thumbAtt: null, failAtt: null, videoAtt: null, journey: new Map() })
  const p = pages.get(slug)
  const label = spec.title.replace(slugRe, '').trim()
  p.checks.push({ label, ok: spec.ok })
  if (!spec.ok) p.ok = false

  for (const a of attachmentsOf(spec)) {
    if (!exists(a)) continue
    if (a.name === 'screenshot') {
      if (/healthy/i.test(label) || !p.thumbAtt) p.thumbAtt = a
      if (!spec.ok && !p.failAtt) p.failAtt = a
    } else if (a.name === 'video') {
      if (/funnel/i.test(label) || !p.videoAtt) p.videoAtt = a // prefer the full booking-flow recording
    } else {
      const j = a.name && a.name.match(/^journey::(\d+)::(.+)$/)
      if (j) p.journey.set(Number(j[1]), { n: Number(j[1]), caption: j[2], att: a })
    }
  }
}

for (const p of pages.values()) {
  const thumb = p.failAtt || p.thumbAtt
  if (thumb && write(thumb, `screens/${p.slug}.png`)) p.img = `screens/${p.slug}.png`
  p.steps = [...p.journey.values()].sort((a, b) => a.n - b.n).map((s) => {
    const rel = `screens/${p.slug}-step${s.n}.png`
    write(s.att, rel)
    return { n: s.n, caption: s.caption, img: rel }
  })
  if (p.videoAtt && write(p.videoAtt, `videos/${p.slug}.webm`)) p.video = `videos/${p.slug}.webm`
}

const all = [...pages.values()].sort((a, b) => Number(a.ok) - Number(b.ok) || a.name.localeCompare(b.name))
const failed = all.filter((p) => !p.ok)
const passed = all.filter((p) => p.ok)
const generated = new Date().toISOString()

fs.writeFileSync(
  path.join(OUT, 'summary.json'),
  JSON.stringify({ total: all.length, passed: passed.length, failedCount: failed.length, failed: failed.map((p) => ({ slug: p.slug, name: p.name, screenshot: p.img || null, video: p.video || null, detail: `pages/${p.slug}.html` })), generated }, null, 2)
)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const head = (title, prefix) => `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<style>
  body { background:#f1f5f9; } .brand-bar { background:#001c3c; }
  .page-card { transition:transform .12s ease, box-shadow .12s ease; overflow:hidden; }
  .page-card:hover { transform:translateY(-3px); box-shadow:0 .75rem 1.5rem rgba(0,0,0,.12)!important; }
  .page-card.ok { border-top:4px solid #16a34a!important; } .page-card.down { border-top:4px solid #dc2626!important; }
  .thumb { overflow:hidden; background:#e2e8f0; } .thumb img { object-position:top; }
  .zoom-hint { position:absolute; right:.5rem; bottom:.5rem; background:rgba(0,0,0,.55); color:#fff; border-radius:.4rem; padding:.1rem .4rem; font-size:.8rem; opacity:0; transition:opacity .12s; }
  .thumb:hover .zoom-hint { opacity:1; } .list-group-item { background:transparent; }
  .step-img { width:100%; height:150px; object-fit:cover; object-position:top; }
</style></head><body>`

// ---- Per-page detail / proof pages ----
const stepCard = (s) => `
  <div class="col"><div class="card h-100 shadow-sm border-0">
    <span class="badge text-bg-primary position-absolute m-2">Step ${s.n}</span>
    <img src="../${s.img}" class="step-img card-img-top" alt="step ${s.n}">
    <div class="card-body py-2"><div class="small fw-semibold">${esc(s.caption)}</div></div>
  </div></div>`

const detailHtml = (p) => `${head(esc(p.name) + ' · Test proof', '../')}
<nav class="navbar brand-bar navbar-dark py-3"><div class="container">
  <a class="navbar-brand fw-bold mb-0 text-white text-decoration-none" href="../index.html"><i class="bi bi-arrow-left"></i> Booking Flow Status</a>
  <span class="badge fs-6 ${p.ok ? 'text-bg-success' : 'text-bg-danger'}">${p.ok ? 'Operational' : 'Down'}</span>
</div></nav>
<div class="container py-4">
  <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
    <h3 class="fw-bold mb-0">${esc(p.name)}</h3>
    <a href="${p.url}" target="_blank" rel="noopener" class="btn btn-primary"><i class="bi bi-box-arrow-up-right"></i> Open live page</a>
  </div>
  <p class="text-muted">Automated end-to-end booking test · last run ${esc(generated)} · ${p.checks.filter((c) => c.ok).length}/${p.checks.length} checks passing</p>

  ${p.video ? `<div class="card border-0 shadow-sm mb-4"><div class="card-body">
    <h5 class="mb-3"><i class="bi bi-camera-reels"></i> Recording of the test</h5>
    <video class="w-100 rounded border" controls preload="metadata" src="../${p.video}"></video>
    <div class="text-muted small mt-2">A real browser drives the booking flow exactly as a customer would. This is the recording of that run.</div>
  </div></div>` : ''}

  ${p.steps.length ? `<h5 class="mb-3"><i class="bi bi-images"></i> Step-by-step journey</h5>
  <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 mb-4">${p.steps.map(stepCard).join('')}</div>` : ''}

  <h5 class="mb-3"><i class="bi bi-list-check"></i> Checks</h5>
  <ul class="list-group shadow-sm mb-4">${p.checks.map((c) => `<li class="list-group-item d-flex align-items-center gap-2"><i class="bi ${c.ok ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}"></i> ${esc(c.label)}</li>`).join('')}</ul>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script></body></html>`

for (const p of all) fs.writeFileSync(path.join(PAGES, `${p.slug}.html`), detailHtml(p))

// ---- Overview grid ----
const checkRow = (c) =>
  `<li class="list-group-item d-flex align-items-center gap-2 px-0 py-1 border-0 small"><i class="bi ${c.ok ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}"></i><span>${esc(c.label)}</span></li>`

const cardFor = (p) => {
  const passN = p.checks.filter((c) => c.ok).length
  const thumb = p.img
    ? `<a href="pages/${p.slug}.html" class="thumb ratio ratio-16x9 d-block text-decoration-none">
         <img src="${p.img}" class="object-fit-cover w-100 h-100" alt="${esc(p.name)}" loading="lazy"><span class="zoom-hint"><i class="bi bi-play-circle"></i> proof</span></a>`
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
        <div class="text-muted small mb-2">${passN}/${p.checks.length} checks passing${p.video ? ' · <i class="bi bi-camera-reels"></i> recorded' : ''}</div>
        <button class="btn btn-sm btn-outline-secondary py-0" data-bs-toggle="collapse" data-bs-target="#d-${p.slug}"><i class="bi bi-list-check"></i> Checks</button>
        <div class="collapse mt-2" id="d-${p.slug}"><ul class="list-group list-group-flush mb-0">${p.checks.map(checkRow).join('')}</ul></div>
      </div>
      <div class="card-footer bg-transparent border-0 pt-0 pb-3 d-grid gap-2">
        <a href="pages/${p.slug}.html" class="btn btn-sm btn-primary"><i class="bi bi-play-circle"></i> View test proof &amp; journey</a>
        <a href="${p.url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-secondary"><i class="bi bi-box-arrow-up-right"></i> Open live page</a>
      </div>
    </div>
  </div>`
}

const stat = (label, value, cls) =>
  `<div class="col"><div class="card border-0 shadow-sm text-center py-3"><div class="display-6 fw-bold ${cls}">${value}</div><div class="text-muted small text-uppercase">${label}</div></div></div>`

const allHealthy = failed.length === 0
const index = `${head('Scootaround Booking Flow Status', '')}
  <meta http-equiv="refresh" content="300">
  <nav class="navbar brand-bar navbar-dark py-3"><div class="container">
    <span class="navbar-brand fw-bold mb-0"><i class="bi bi-activity"></i> Scootaround · Booking Flow Status</span>
    <span class="badge fs-6 ${allHealthy ? 'text-bg-success' : 'text-bg-danger'}">${allHealthy ? '<i class="bi bi-check-circle"></i> All systems operational' : '<i class="bi bi-exclamation-triangle"></i> ' + failed.length + ' down'}</span>
  </div></nav>
  <div class="container py-4">
    <p class="text-muted">Automated end-to-end monitoring of every location &amp; port rental booking flow. Updated ${esc(generated)} · auto-refreshes every 5&nbsp;min. Click any card for the <strong>video replay &amp; step-by-step proof</strong>.</p>
    <div class="row row-cols-2 row-cols-md-4 g-3 mb-4">
      ${stat('Pages monitored', all.length, 'text-dark')}
      ${stat('Operational', passed.length, 'text-success')}
      ${stat('Down', failed.length, failed.length ? 'text-danger' : 'text-muted')}
      ${stat('Checks run', all.reduce((n, p) => n + p.checks.length, 0), 'text-dark')}
    </div>
    <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">${all.map(cardFor).join('')}</div>
    <p class="text-center text-muted small mt-4 mb-0">Generated by the Scootaround page-monitoring suite · ${passed.length}/${all.length} healthy</p>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body></html>`

fs.writeFileSync(path.join(OUT, 'index.html'), index)
console.log(`Dashboard built: ${passed.length}/${all.length} healthy, ${failed.length} down · ${all.length} detail pages -> ${OUT}/index.html`)
