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

/**
 * Normalizes an airport code or location name for Google Flights search queries.
 * Extracts 3-letter IATA codes from strings like "Hyderabad (HYD)" or "HYD".
 * If no code is present, falls back to the clean city name before any comma.
 *
 * @param {string|Object} location - Airport code string, city string, or object with code/city
 * @returns {string} - Clean IATA code or city name, or empty string
 */
export function getFlightLocationQuery(location) {
  if (!location) return '';
  if (typeof location === 'object') {
    if (location.code && typeof location.code === 'string' && /^[A-Za-z]{3}$/.test(location.code.trim())) {
      return location.code.trim().toUpperCase();
    }
    if (location.city && typeof location.city === 'string' && location.city.trim()) {
      return location.city.trim();
    }
    if (location.name && typeof location.name === 'string' && location.name.trim()) {
      return location.name.trim();
    }
  }
  if (typeof location !== 'string') return '';
  const trimmed = location.trim();
  if (!trimmed) return '';

  // Direct 3-letter IATA code
  if (/^[A-Za-z]{3}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Parenthetical 3-letter IATA code (e.g. "Hyderabad (HYD)", "Bengaluru (BLR)")
  const parenMatch = trimmed.match(/\(([A-Za-z]{3})\)/);
  if (parenMatch) {
    return parenMatch[1].toUpperCase();
  }

  // Strip parentheticals and take first part before comma
  const withoutParen = trimmed.replace(/\([^)]*\)/g, ' ').trim();
  const primaryCity = withoutParen.split(',')[0].trim();
  return primaryCity;
}

/**
 * Extracts a strict date-only YYYY-MM-DD string without timezone shifting.
 * Avoids any Date.prototype.toISOString() or new Date(str) parsing in non-UTC zones.
 *
 * @param {string|Date} dateVal - Input date string or Date instance
 * @returns {string|null} - YYYY-MM-DD string or null if unresolvable
 */
export function extractDateOnly(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const match = dateVal.trim().match(/(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

/**
 * Constructs an authoritative Google Flights destination URL.
 * Preserves route, departure date, return date (round-trip), passenger count, and cabin class.
 *
 * Supported format:
 * - Round-trip: "Flights from {ORIGIN} to {DESTINATION} on {YYYY-MM-DD} returning {YYYY-MM-DD}"
 * - One-way:    "Flights from {ORIGIN} to {DESTINATION} on {YYYY-MM-DD} one way"
 * - Extras:     "for {passengers} adults {cabin class}"
 *
 * Missing dates are handled explicitly instead of silently fabricated.
 *
 * @param {Object} params
 * @param {string|Object} params.origin - Origin airport code or city
 * @param {string|Object} params.destination - Destination airport code or city
 * @param {string|Date} [params.departureDate] - Departure date
 * @param {string|Date} [params.returnDate] - Return date (for round trips)
 * @param {number} [params.passengers=1] - Number of passengers/travelers
 * @param {string} [params.cabin='economy'] - Cabin class
 * @returns {string} - Google Flights URL or fallback homepage
 */
export function getGoogleFlightsUrl({
  origin,
  destination,
  departureDate = null,
  returnDate = null,
  passengers = 1,
  cabin = 'economy'
} = {}) {
  const fromCode = getFlightLocationQuery(origin);
  const toCode = getFlightLocationQuery(destination);

  if (!fromCode && !toCode) {
    return 'https://www.google.com/travel/flights';
  }

  const depDate = extractDateOnly(departureDate);
  const retDate = extractDateOnly(returnDate);

  const parts = [];
  if (fromCode && toCode) {
    parts.push(`Flights from ${fromCode} to ${toCode}`);
  } else if (toCode) {
    parts.push(`Flights to ${toCode}`);
  } else {
    parts.push(`Flights from ${fromCode}`);
  }

  if (depDate) {
    parts.push(`on ${depDate}`);
    if (retDate) {
      parts.push(`returning ${retDate}`);
    } else {
      parts.push('one way');
    }
  }

  const numPax = parseInt(passengers, 10);
  if (!isNaN(numPax) && numPax > 1) {
    parts.push(`for ${numPax} adults`);
  }

  const cabinStr = String(cabin || '').toLowerCase();
  if (cabinStr.includes('business')) {
    parts.push('business class');
  } else if (cabinStr.includes('first')) {
    parts.push('first class');
  } else if (cabinStr.includes('premium')) {
    parts.push('premium economy');
  }

  const query = parts.join(' ');
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

