/**
 * The location & port pages we monitor. Add an entry here for every page
 * Marketing is driving ad spend to — the tests below run automatically
 * against each one.
 *
 *  slug  — the URL path segment (also used as the test title)
 *  name  — human label shown in reports / alerts
 *  path  — page path relative to BASE_URL
 *  pickup — a real place to type into the pickup box (drives the booking funnel)
 */
export type MonitoredPage = {
  slug: string
  name: string
  path: string
  pickup: string
}

export const LOCATIONS: MonitoredPage[] = [
  { slug: 'orlando', name: 'Orlando, FL', path: '/us/orlando', pickup: 'Orlando' },
  // Add more as the ad campaign expands, e.g.:
  // { slug: 'nashville', name: 'Nashville, TN', path: '/us/nashville', pickup: 'Nashville' },
  // { slug: 'port-miami', name: 'Port of Miami', path: '/us/port-miami', pickup: 'Miami' },
]
