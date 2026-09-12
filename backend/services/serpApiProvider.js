/**
 * SerpApi Google Flights Provider Adapter
 * Connects to SerpApi Google Flights API (engine=google_flights)
 * Normalizes live airline offers (IndiGo, Air India, Akasa, SpiceJet, etc.)
 * into the application's canonical FlightOffer model.
 */

import { FlightProviderError } from './duffelProvider.js';

export const SERPAPI_DEFAULT_TIMEOUT_MS = 12000;
export const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

/**
 * Format minutes into a readable duration string (e.g. 170 -> "2h 50m")
 * @param {number} totalMinutes
 * @returns {string}
 */
export const formatDuration = (totalMinutes) => {
  const mins = Number(totalMinutes) || 0;
  if (mins <= 0) return 'N/A';
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return hours > 0
    ? (rem > 0 ? `${hours}h ${rem}m` : `${hours}h`)
    : `${rem}m`;
};

/**
 * Formats "YYYY-MM-DD HH:mm" or ISO string to local 24h time "HH:mm"
 * @param {string} timeStr
 * @returns {string}
 */
export const formatTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return '--:--';
  const trimmed = timeStr.trim();
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(' ');
    if (parts[1] && parts[1].length >= 5) return parts[1].slice(0, 5);
  }
  if (trimmed.includes('T')) {
    const parts = trimmed.split('T');
    if (parts[1] && parts[1].length >= 5) return parts[1].slice(0, 5);
  }
  return '--:--';
};

/**
 * Normalizes a single SerpApi flight itinerary item into the application's FlightOffer domain model.
 * @param {Object} item - SerpApi flight item from best_flights or other_flights
 * @param {number} index - Index for unique identification
 * @param {string} cabin - Cabin class requested
 * @returns {Object} Normalized FlightOffer
 */
export const normalizeSerpApiOffer = (item, index = 0, cabin = 'economy') => {
  if (!item || typeof item !== 'object') {
    throw new FlightProviderError(
      'Malformed offer object received from flight provider.',
      502,
      'FLIGHT_PROVIDER_MALFORMED_RESPONSE'
    );
  }

  const legs = Array.isArray(item.flights) ? item.flights : [];
  const firstLeg = legs[0] || {};
  const lastLeg = legs[legs.length - 1] || firstLeg;

  const rawPrice = item.price;
  let price = 0;
  if (typeof rawPrice === 'number' && !isNaN(rawPrice)) {
    price = Math.round(rawPrice);
  } else if (typeof rawPrice === 'string') {
    const parsed = parseInt(rawPrice.replace(/[^\d]/g, ''), 10);
    price = isNaN(parsed) ? 0 : parsed;
  }

  const durationMinutes = Number(item.total_duration || firstLeg.duration) || 0;
  const durationFormatted = formatDuration(durationMinutes);
  const stopsCount = Math.max(0, legs.length - 1);

  // Extract flight number and airline code (e.g. "6E 6406" -> code: "6E", number: "6E 6406")
  const fullFlightNum = firstLeg.flight_number || (firstLeg.airline ? `${firstLeg.airline} Flight` : 'Commercial Flight');
  const flightCodeParts = String(firstLeg.flight_number || '').trim().split(/\s+/);
  const carrierCode = flightCodeParts[0] || 'FL';

  const depTimeStr = firstLeg.departure_airport?.time || null;
  const arrTimeStr = lastLeg.arrival_airport?.time || null;

  const depIso = depTimeStr ? (depTimeStr.includes('T') ? depTimeStr : depTimeStr.replace(' ', 'T') + ':00') : null;
  const arrIso = arrTimeStr ? (arrTimeStr.includes('T') ? arrTimeStr : arrTimeStr.replace(' ', 'T') + ':00') : null;

  // Safe unique ID
  const bookingTokenSnippet = item.booking_token ? item.booking_token.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) : '';
  const offerId = `serp_${carrierCode}_${index}_${bookingTokenSnippet || Date.now()}`;

  return {
    id: offerId,
    mode: 'flight',
    airline: firstLeg.airline || item.airline || 'Commercial Airline',
    airlineCode: carrierCode,
    airlineLogo: item.airline_logo || firstLeg.airline_logo || null,
    flightNumber: fullFlightNum,
    origin: {
      code: firstLeg.departure_airport?.id || '',
      name: firstLeg.departure_airport?.name || '',
      city: ''
    },
    destination: {
      code: lastLeg.arrival_airport?.id || '',
      name: lastLeg.arrival_airport?.name || '',
      city: ''
    },
    departure: depIso,
    arrival: arrIso,
    depart: formatTime(depTimeStr),
    arrive: formatTime(arrTimeStr),
    duration: durationFormatted,
    durationMinutes,
    stops: stopsCount,
    cabin: firstLeg.travel_class ? firstLeg.travel_class.toLowerCase().replace(/\s+/g, '_') : cabin,
    price,
    currency: 'INR',
    baggage: {
      checked: 1,
      cabin: 1
    },
    // Real live provider provenance
    source: 'serpapi',
    status: 'live',
    isEstimated: false,
    provider: 'SerpApi',
    bookingUrl: `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(lastLeg.arrival_airport?.id || '')}%20from%20${encodeURIComponent(firstLeg.departure_airport?.id || '')}`,
    fetchedAt: new Date().toISOString(),
    expiresAt: null
  };
};

/**
 * Creates a SerpApiProvider instance with configurable transport for dependency injection.
 * @param {Object} [options]
 * @param {string} [options.apiKey]
 * @param {string} [options.baseUrl]
 * @param {number} [options.timeoutMs]
 * @param {Function} [options.fetchFn]
 */
export const createSerpApiProvider = (options = {}) => {
  const getApiKey = () => (options.apiKey !== undefined ? options.apiKey : (process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY));
  const baseUrl = options.baseUrl || SERPAPI_BASE_URL;
  const timeoutMs = options.timeoutMs || SERPAPI_DEFAULT_TIMEOUT_MS;
  const fetchFn = options.fetchFn || globalThis.fetch;

  /**
   * Search flights via SerpApi Google Flights API
   * @param {Object} searchRequest
   * @param {string} searchRequest.originCode - 3-letter IATA code (e.g. "BLR")
   * @param {string} searchRequest.destinationCode - 3-letter IATA code (e.g. "DEL")
   * @param {string} searchRequest.departureDate - YYYY-MM-DD
   * @param {string} [searchRequest.returnDate] - Optional return date YYYY-MM-DD for round trips
   * @param {number} [searchRequest.passengers=1]
   * @param {string} [searchRequest.cabin='economy']
   * @param {AbortSignal} [searchRequest.signal]
   * @returns {Promise<{ offers: Array, count: number, provider: string, isEstimated: boolean }>}
   */
  const searchFlights = async ({
    originCode,
    destinationCode,
    departureDate,
    returnDate,
    passengers = 1,
    cabin = 'economy',
    signal = null
  }) => {
    const key = getApiKey();
    if (!key || typeof key !== 'string' || !key.trim()) {
      throw new FlightProviderError(
        'Flight search provider is not configured (missing SERPAPI_KEY).',
        503,
        'FLIGHT_PROVIDER_UNAVAILABLE'
      );
    }

    const passengerCount = Math.max(1, Math.min(9, parseInt(passengers || '1', 10)));

    // Map cabin class to SerpApi Google Flights travel_class:
    // 1 = Economy, 2 = Premium economy, 3 = Business, 4 = First
    const travelClassMap = {
      economy: '1',
      premium_economy: '2',
      business: '3',
      first: '4'
    };
    const travelClass = travelClassMap[cabin] || '1';
    const isRoundTrip = Boolean(returnDate && String(returnDate).trim());

    const params = new URLSearchParams({
      engine: 'google_flights',
      departure_id: originCode,
      arrival_id: destinationCode,
      outbound_date: departureDate,
      currency: 'INR',
      hl: 'en',
      gl: 'in',
      adults: String(passengerCount),
      type: isRoundTrip ? '1' : '2',
      travel_class: travelClass,
      api_key: key.trim()
    });

    if (isRoundTrip) {
      params.append('return_date', String(returnDate).trim());
    }

    // Bounded request timeout handling
    let effectiveSignal = signal;
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      effectiveSignal = signal && typeof AbortSignal.any === 'function'
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal;
    }

    let response;
    try {
      response = await fetchFn(`${baseUrl}?${params.toString()}`, {
        method: 'GET',
        signal: effectiveSignal
      });
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        throw new FlightProviderError(
          `Flight search request timed out after ${timeoutMs}ms.`,
          504,
          'FLIGHT_PROVIDER_TIMEOUT'
        );
      }
      throw new FlightProviderError(
        `Failed to connect to flight provider: ${err.message}`,
        503,
        'FLIGHT_PROVIDER_UNAVAILABLE'
      );
    }

    let json;
    try {
      json = await response.json();
    } catch (err) {
      throw new FlightProviderError(
        'Malformed response returned by flight provider.',
        502,
        'FLIGHT_PROVIDER_MALFORMED_RESPONSE'
      );
    }

    // Check for provider error messages in JSON
    if (json.error) {
      const errMsg = String(json.error);
      if (errMsg.toLowerCase().includes('invalid api key') || response.status === 401) {
        throw new FlightProviderError(
          'Flight provider authorization failed.',
          502,
          'FLIGHT_PROVIDER_AUTH_ERROR'
        );
      }
      if (errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('searches') || response.status === 429) {
        throw new FlightProviderError(
          'Flight search provider rate limit exceeded. Please retry shortly.',
          429,
          'FLIGHT_PROVIDER_RATE_LIMITED'
        );
      }
      if (errMsg.toLowerCase().includes('no flights') || errMsg.toLowerCase().includes('not found')) {
        return {
          offers: [],
          count: 0,
          provider: 'SerpApi',
          isEstimated: false
        };
      }
      throw new FlightProviderError(
        `Flight provider error: ${errMsg}`,
        400,
        'FLIGHT_SEARCH_INVALID'
      );
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new FlightProviderError(
          'Flight provider authorization failed.',
          502,
          'FLIGHT_PROVIDER_AUTH_ERROR'
        );
      }
      if (response.status === 429) {
        throw new FlightProviderError(
          'Flight search provider rate limit exceeded. Please retry shortly.',
          429,
          'FLIGHT_PROVIDER_RATE_LIMITED'
        );
      }
      throw new FlightProviderError(
        `Flight provider returned status ${response.status}`,
        503,
        'FLIGHT_PROVIDER_UNAVAILABLE'
      );
    }

    const rawBest = Array.isArray(json.best_flights) ? json.best_flights : [];
    const rawOther = Array.isArray(json.other_flights) ? json.other_flights : [];
    const rawAll = [...rawBest, ...rawOther];

    if (rawAll.length === 0) {
      return {
        offers: [],
        count: 0,
        provider: 'SerpApi',
        isEstimated: false
      };
    }

    const normalizedOffers = rawAll.map((item, idx) => normalizeSerpApiOffer(item, idx, cabin));

    return {
      offers: normalizedOffers,
      count: normalizedOffers.length,
      provider: 'SerpApi',
      isEstimated: false
    };
  };

  return {
    searchFlights
  };
};

export const serpApiProvider = createSerpApiProvider();
export default serpApiProvider;
