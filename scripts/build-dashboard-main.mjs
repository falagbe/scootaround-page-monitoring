// Builds the MAIN SITE dashboard (scootaround.com) into dashboard-main/ by
// reusing build-dashboard.mjs with the right inputs. Run: npm run dashboard:main
process.env.DASH_OUT = 'dashboard-main'
process.env.DASH_RESULTS = 'results-main.json'
process.env.DASH_LOCATIONS = 'tests/main-locations.ts'
process.env.DASH_TITLE = 'Scootaround · Main Site Monitor'
process.env.DASH_SUBTITLE = 'Production scootaround.com booking-form checks — page loads, form fills, Continue works. Runs locally from a trusted network.'
process.env.BASE_URL = '' // main-locations.ts already holds full URLs in `path`
await import('./build-dashboard.mjs')
