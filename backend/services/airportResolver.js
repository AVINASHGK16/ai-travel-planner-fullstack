/**
 * Authoritative Airport Resolution Service
 * Maps canonical cities and IATA airport codes to structured airport models.
 * Zero silent substitutions: unknown locations throw AirportNotFoundError.
 */

export class AirportNotFoundError extends Error {
  constructor(location, field = 'location') {
    super(`Could not resolve a commercial airport for location: "${location}".`);
    this.name = 'AirportNotFoundError';
    this.code = 'AIRPORT_NOT_FOUND';
    this.statusCode = 404;
    this.field = field;
  }
}

// Canonical Airport Registry covering supported project destinations
const AIRPORTS = {
  BLR: { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bangalore', country: 'India' },
  DEL: { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'India' },
  BOM: { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India' },
  MAA: { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'India' },
  HYD: { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', country: 'India' },
  CCU: { code: 'CCU', name: 'Netaji Subhash Chandra Bose International Airport', city: 'Kolkata', country: 'India' },
  COK: { code: 'COK', name: 'Cochin International Airport', city: 'Kochi', country: 'India' },
  GOI: { code: 'GOI', name: 'Dabolim Airport', city: 'Goa', country: 'India' },
  PNQ: { code: 'PNQ', name: 'Pune Airport', city: 'Pune', country: 'India' },
  JAI: { code: 'JAI', name: 'Jaipur International Airport', city: 'Jaipur', country: 'India' },
  AMD: { code: 'AMD', name: 'Sardar Vallabhbhai Patel International Airport', city: 'Ahmedabad', country: 'India' },
  IXC: { code: 'IXC', name: 'Shaheed Bhagat Singh International Airport', city: 'Chandigarh', country: 'India' },
  VNS: { code: 'VNS', name: 'Lal Bahadur Shastri International Airport', city: 'Varanasi', country: 'India' },
  AGR: { code: 'AGR', name: 'Agra Airport', city: 'Agra', country: 'India' },
  MYQ: { code: 'MYQ', name: 'Mysore Airport', city: 'Mysore', country: 'India' },
  JFK: { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA' },
  LHR: { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom' },
  CDG: { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
  HND: { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan' },
  SYD: { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia' },
  SIN: { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
  DXB: { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates' }
};

// Canonical City to IATA Code Mappings
const CITY_TO_IATA = {
  bangalore: 'BLR',
  bengaluru: 'BLR',
  delhi: 'DEL',
  newdelhi: 'DEL',
  mumbai: 'BOM',
  bombay: 'BOM',
  chennai: 'MAA',
  madras: 'MAA',
  hyderabad: 'HYD',
  kolkata: 'CCU',
  calcutta: 'CCU',
  kochi: 'COK',
  cochin: 'COK',
  goa: 'GOI',
  panaji: 'GOI',
  pune: 'PNQ',
  jaipur: 'JAI',
  ahmedabad: 'AMD',
  chandigarh: 'IXC',
  varanasi: 'VNS',
  banaras: 'VNS',
  kashi: 'VNS',
  agra: 'AGR',
  mysore: 'MYQ',
  mysuru: 'MYQ',
  newyork: 'JFK',
  nyc: 'JFK',
  london: 'LHR',
  paris: 'CDG',
  tokyo: 'HND',
  sydney: 'SYD',
  singapore: 'SIN',
  dubai: 'DXB'
};

/**
 * Resolves a city name or IATA code string to a canonical Airport object.
 * @param {string} input - Raw city name or 3-letter IATA code
 * @param {string} [field='location'] - Parameter field name for error reporting ('origin' | 'destination')
 * @returns {{ code: string, name: string, city: string, country: string }}
 * @throws {AirportNotFoundError} when location cannot be resolved to a commercial airport
 */
export const resolveAirport = (input, field = 'location') => {
  if (!input || typeof input !== 'string') {
    throw new AirportNotFoundError(String(input || ''), field);
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new AirportNotFoundError('', field);
  }

  // 1. Check if input is a direct recognized 3-letter IATA code
  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper) && AIRPORTS[upper]) {
    return { ...AIRPORTS[upper] };
  }

  // 2. Normalize city key (lowercase, alphanumeric only)
  // Handle queries with comma separators like "Bangalore, Karnataka, India" -> "bangalore"
  const primaryName = trimmed.split(',')[0].trim();
  const normalizedKey = primaryName.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (CITY_TO_IATA[normalizedKey]) {
    const code = CITY_TO_IATA[normalizedKey];
    return { ...AIRPORTS[code] };
  }

  // Full string normalized check if comma-split was not enough
  const fullNormalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (CITY_TO_IATA[fullNormalized]) {
    const code = CITY_TO_IATA[fullNormalized];
    return { ...AIRPORTS[code] };
  }

  // 3. Unresolvable location (e.g. Ooty, Coorg, unknown place)
  throw new AirportNotFoundError(trimmed, field);
};

export default {
  resolveAirport,
  AirportNotFoundError
};
