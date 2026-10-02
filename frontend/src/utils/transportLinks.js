/**
 * Utility functions for external transport provider links (Train & Bus).
 * Ensures safe, valid URLs without broken deep links, fake train identities, or 404 endpoints.
 */

/**
 * Normalizes a city or location name into a clean, lowercased kebab-case slug for redBus.
 * Handles strings like "Bangalore", "Bangalore, Karnataka, India", "Bengaluru (BLR)".
 *
 * @param {string} name - Raw location or city string
 * @returns {string} - Clean slug (e.g. "bangalore", "jaipur") or empty string
 */
export function getRedBusCitySlug(name) {
  if (!name || typeof name !== 'string') return '';
  // Extract primary city part before first comma
  const firstPart = name.split(',')[0]?.trim() || '';
  // Remove parenthetical abbreviations (e.g. "(BLR)")
  const clean = firstPart.replace(/\s*\([^)]*\)/g, '').trim();
  if (!clean) return '';
  // Replace non-alphanumeric chars with hyphens and trim boundary hyphens
  return clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Constructs a route-aware redBus destination URL.
 * Example: Bangalore -> Jaipur produces "https://www.redbus.in/bus-tickets/bangalore-to-jaipur"
 * If origin or destination is missing or invalid, safely falls back to the redBus homepage.
 * Never generates malformed query strings or invalid "/bus-tickets/search?" endpoints.
 *
 * @param {string} origin - Origin city or location
 * @param {string} destination - Destination city or location
 * @param {string} [date] - Optional travel date
 * @returns {string} - Route-aware URL or safe fallback
 */
export function getRedBusUrl(origin, destination, _date = null) {
  const fromSlug = getRedBusCitySlug(origin);
  const toSlug = getRedBusCitySlug(destination);

  if (fromSlug && toSlug) {
    return `https://www.redbus.in/bus-tickets/${fromSlug}-to-${toSlug}`;
  }

  // Safe fallback to provider homepage if either endpoint is absent
  return 'https://www.redbus.in/';
}

/**
 * Constructs a safe ConfirmTkt external train destination URL.
 * ConfirmTkt requires IRCTC 3-4 letter station codes (e.g. SBC, NDLS) for station-to-station deep links;
 * arbitrary city names or fake train numbers (e.g. /train-schedule/15042) result in 404s or wrong trains.
 * This helper avoids inventing fake train identities and safely routes users to the official ConfirmTkt
 * train booking and search page.
 *
 * @param {string} [_origin] - Origin city or location
 * @param {string} [_destination] - Destination city or location
 * @param {string} [_date] - Optional travel date
 * @returns {string} - Safe ConfirmTkt search portal URL
 */
export function getConfirmTktUrl(_origin = null, _destination = null, _date = null) {
  return 'https://www.confirmtkt.com/';
}
