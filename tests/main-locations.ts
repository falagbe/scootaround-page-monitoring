/**
 * Production (main site) pages to monitor. These run LOCALLY (from a trusted
 * WiFi IP), not in GitHub Actions, because scootaround.com is behind Cloudflare
 * bot protection that blocks datacenter IPs.
 *
 * Same parseable shape as locations.ts (slug/name/path) so the dashboard
 * generator can reuse it — here `path` is the full URL.
 *
 *  fill        — placeholder text of the form field to type into
 *  continueBtn — true if the page has a "Continue" booking button to click
 */
export type MainPage = { slug: string; name: string; path: string; fill: string; continueBtn: boolean }

export const MAIN_PAGES: MainPage[] = [
  { slug: 'rental-locations', name: 'Rental Locations', path: 'https://scootaround.com/en/rental-locations', fill: 'Where are you going', continueBtn: true },
  // Cruise Ports is an index page (region tabs + search), no Continue button.
  { slug: 'cruise-ports', name: 'Cruise Ports', path: 'https://scootaround.com/en/cruise-ports', fill: 'Search', continueBtn: false },
]
