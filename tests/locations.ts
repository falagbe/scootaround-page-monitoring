/**
 * The location & port pages we monitor. Add an entry here for every page
 * Marketing drives ad spend to — the suite runs against each automatically.
 *
 *  slug     — URL path segment (used in test titles)
 *  name     — human label for reports / alerts
 *  path     — page path relative to BASE_URL
 *  match    — text that must appear in the page H1 (identity check; titles
 *             are inconsistent across pages, the H1 is reliable)
 *  standard — true = has the city pickup + dates + Get-a-Quote funnel.
 *             false = cruise/port page with a different widget (health-only).
 *  pickup   — city to type into the pickup autocomplete (standard pages only)
 *
 * Verified live on 2026-06-16 via scripts/discover-locations.mjs.
 */
export type MonitoredPage = {
  slug: string
  name: string
  path: string
  match: string
  standard: boolean
  pickup?: string
}

export const LOCATIONS: MonitoredPage[] = [
  // --- Standard city pages (full booking funnel) ---
  { slug: 'orlando', name: 'Orlando, FL', path: '/us/orlando', match: 'Orlando', standard: true, pickup: 'Orlando' },
  { slug: 'tampa', name: 'Tampa, FL', path: '/us/tampa', match: 'Tampa', standard: true, pickup: 'Tampa' },
  { slug: 'fort-lauderdale', name: 'Fort Lauderdale, FL', path: '/us/fort-lauderdale', match: 'Fort Lauderdale', standard: true, pickup: 'Fort Lauderdale' },
  { slug: 'miami', name: 'Miami, FL', path: '/us/miami', match: 'Miami', standard: true, pickup: 'Miami' },
  { slug: 'jacksonville', name: 'Jacksonville, FL', path: '/us/jacksonville', match: 'Jacksonville', standard: true, pickup: 'Jacksonville' },
  { slug: 'new-orleans', name: 'New Orleans, LA', path: '/us/new-orleans', match: 'New Orleans', standard: true, pickup: 'New Orleans' },
  { slug: 'nashville', name: 'Nashville, TN', path: '/us/nashville', match: 'Nashville', standard: true, pickup: 'Nashville' },
  { slug: 'atlanta', name: 'Atlanta, GA', path: '/us/atlanta', match: 'Atlanta', standard: true, pickup: 'Atlanta' },
  { slug: 'charlotte', name: 'Charlotte, NC', path: '/us/charlotte', match: 'Charlotte', standard: true, pickup: 'Charlotte' },
  { slug: 'washington-dc', name: 'Washington, DC', path: '/us/washington-dc', match: 'Washington', standard: true, pickup: 'Washington' },
  { slug: 'philadelphia', name: 'Philadelphia, PA', path: '/us/philadelphia', match: 'Philadelphia', standard: true, pickup: 'Philadelphia' },
  { slug: 'new-york', name: 'New York, NY', path: '/us/new-york', match: 'New York', standard: true, pickup: 'New York' },
  { slug: 'boston', name: 'Boston, MA', path: '/us/boston', match: 'Boston', standard: true, pickup: 'Boston' },
  { slug: 'chicago', name: 'Chicago, IL', path: '/us/chicago', match: 'Chicago', standard: true, pickup: 'Chicago' },
  { slug: 'dallas', name: 'Dallas, TX', path: '/us/dallas', match: 'Dallas', standard: true, pickup: 'Dallas' },
  { slug: 'phoenix', name: 'Phoenix, AZ', path: '/us/phoenix', match: 'Phoenix', standard: true, pickup: 'Phoenix' },
  { slug: 'las-vegas', name: 'Las Vegas, NV', path: '/us/las-vegas', match: 'Las Vegas', standard: true, pickup: 'Las Vegas' },
  { slug: 'los-angeles', name: 'Los Angeles, CA', path: '/us/los-angeles', match: 'Los Angeles', standard: true, pickup: 'Los Angeles' },
  { slug: 'anaheim', name: 'Anaheim, CA', path: '/us/anaheim', match: 'Anaheim', standard: true, pickup: 'Anaheim' },
  { slug: 'honolulu', name: 'Honolulu, HI', path: '/us/honolulu', match: 'Honolulu', standard: true, pickup: 'Honolulu' },
  { slug: 'disney-world', name: 'Disney World, FL', path: '/us/disney-world', match: 'Disney World', standard: true, pickup: 'Orlando' },
  { slug: 'disneyland', name: 'Disneyland, CA', path: '/us/disneyland-state', match: 'Disneyland', standard: true, pickup: 'Anaheim' },

  // --- Cruise / port pages (different widget — health-only) ---
  { slug: 'port-canaveral', name: 'Port Canaveral', path: '/us/port-canaveral-scooter-rentals', match: 'Port Canaveral', standard: false },
  { slug: 'royal-caribbean', name: 'Royal Caribbean', path: '/us/royal-caribbean-scooter-rentals', match: 'Royal Caribbean', standard: false },
]

export const STANDARD_LOCATIONS = LOCATIONS.filter((l) => l.standard)
