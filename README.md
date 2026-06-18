# Scootaround Page Monitoring

Synthetic monitoring for location & port **booking flows**, built with [Playwright](https://playwright.dev) and run automatically via GitHub Actions. It simulates a real customer progressing through the website booking process and alerts the team the moment a page or flow breaks — so issues are caught proactively instead of by chance (e.g. the Nashville rental page being inadvertently disabled).

## Why this exists

Marketing is significantly increasing ad spend across location and port pages through 2026–2027. A broken rental page or booking flow means wasted ad dollars. This project gives us continuous, end-to-end confidence that those pages work.

## What it checks (per page)

| Tier | Check | Catches |
|------|-------|---------|
| 1 | Page returns 200, correct title & H1 | Disabled / redirected / dead page (the Nashville case) |
| 1 | Booking widget present (tabs, pickup, dates, **Get a Quote**) | Broken or missing booking entry point |
| 1 | Rental rate tables render | Partial / broken page render |
| 2 | Location autocomplete returns suggestions | Dead booking/location backend service |
| 3 | **Full funnel**: pickup → dates → quote → equipment selection | End-to-end booking failure (page, quote engine, booking app) |

The end-to-end test deliberately stops at equipment selection — **before payment** — so monitoring never creates real bookings or charges.

## Run locally

```bash
npm install
npx playwright install chromium
npm test              # run the suite
npm run report        # open the HTML report
```

Target a different environment (e.g. production vs. pre-prod) by overriding the base URL:

```bash
BASE_URL=https://www.scootaround.com npm test
```

## Add more pages

Edit [`tests/locations.ts`](tests/locations.ts) and add an entry per location/port page. The full suite runs against each one automatically.

## Status dashboard (for non-technical stakeholders)

Every run publishes a visual **status dashboard** to GitHub Pages — a grid of all pages, green = operational / red = down, with the failure screenshot shown inline. No zip files or traces to open. Build it locally any time with:

```bash
npm test           # writes results.json
npm run dashboard  # builds ./dashboard/index.html
```

**To enable the hosted dashboard:** in the repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow then deploys to `https://<owner>.github.io/<repo>/` on each run.

> ⚠️ GitHub Pages on a **private** repo requires GitHub Enterprise. If you're not on Enterprise, either make this repo public or host the dashboard from a separate public repo.

## Automated daily runs (GitHub Actions)

The workflow in [`.github/workflows/monitor.yml`](.github/workflows/monitor.yml) runs the suite daily (and on demand), publishes the dashboard, and alerts on failure. To enable alerting:

1. In Microsoft Teams, create an **Incoming Webhook** (via the Workflows app: *"Post to a channel when a webhook request is received"*) for the channel that should receive alerts.
2. In the GitHub repo, add the webhook URL as a secret named **`TEAMS_WEBHOOK_URL`** (Settings → Secrets and variables → Actions).
3. (Optional) Add a repo **variable** `BASE_URL` to point monitoring at a specific environment.

On failure, the workflow posts a Teams card containing the **dashboard link**, the **screenshot of each broken page**, and a link to the GitHub run (which also keeps the full HTML report + videos/traces as artifacts for 30 days).

To run more frequently as ad spend ramps up, add cron lines in the workflow, e.g. `*/30 * * * *` for every 30 minutes.

## Project layout

```
tests/
  locations.ts          # the pages we monitor (add entries here)
  booking.ts            # shared helper that drives the booking widget
  page-health.spec.ts   # Tier 1/2 — page & widget health
  booking-flow.spec.ts  # Tier 3 — end-to-end booking funnel
playwright.config.ts    # retries, screenshots/video/trace on failure
.github/workflows/      # daily scheduled run + Teams alert
```
