/**
 * Duffel Flights API v2 Provider Adapter
 * Implements searchFlights against Duffel Flights API (POST /air/offer_requests)
 * Handles authentication, timeout bounds, and offer normalization.
 */

// Bounded timeout in milliseconds for Duffel HTTP requests
export const DUFFEL_DEFAULT_TIMEOUT_MS = 8000;
export const DUFFEL_BASE_URL = 'https://api.duffel.com';

/**
 * Custom error class for Flight Provider errors.
 */
export class FlightProviderError extends Error {
  constructor(message, statusCode = 500, code = 'FLIGHT_PROVIDER_ERROR', details = null) {
    super(message);
    this.name = 'FlightProviderError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Parses an ISO 8601 duration string like "PT2H45M" into minutes and formatted string.
 * @param {string} isoStr - ISO 8601 duration string (e.g. "PT2H45M", "PT1H", "PT50M")
 * @returns {{ minutes: number, formatted: string }}
 */
export const parseIsoDuration = (isoStr) => {
  if (!isoStr || typeof isoStr !== 'string') {
    return { minutes: 0, formatted: 'N/A' };
  }
  const match = isoStr.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!match) {
    return { minutes: 0, formatted: isoStr };
  }
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const totalMinutes = hours * 60 + minutes;
  const formatted = hours > 0
    ? (minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`)
    : `${minutes}m`;
  return { minutes: totalMinutes, formatted };
};

/**
 * Formats an ISO 8601 datetime string to local 24h time "HH:mm".
 * @param {string} isoStr - ISO datetime (e.g. "2026-10-15T06:15:00")
 * @returns {string} Formatted time string (e.g. "06:15")
 */
export const formatLocalTime = (isoStr) => {
  if (!isoStr || typeof isoStr !== 'string') return '--:--';
  const parts = isoStr.split('T');
  if (parts.length < 2) return '--:--';
  return parts[1].slice(0, 5);
};

/**
 * Normalizes a raw Duffel offer into the application's FlightOffer domain model.
 * Strict provenance: sandbox offers are NEVER labeled as live.
 * @param {Object} offer - Raw Duffel offer object
 * @returns {Object} Normalized FlightOffer
 */
export const normalizeDuffelOffer = (offer) => {
  if (!offer || typeof offer !== 'object') {
    throw new FlightProviderError('Malformed offer object received from provider', 502, 'FLIGHT_PROVIDER_MALFORMED_RESPONSE');
  }

  const isLive = Boolean(offer.live_mode);
  const firstSlice = offer.slices?.[0];
  const segments = firstSlice?.segments || [];
  const firstSegment = segments[0] || {};
  const lastSegment = segments[segments.length - 1] || firstSegment;

  const durationInfo = parseIsoDuration(firstSlice?.duration || firstSegment?.duration);
  const stopsCount = Math.max(0, segments.length - 1);

  // Compute total baggage allowance from the first passenger's segment details
  const baggages = firstSegment?.passengers?.[0]?.baggages || [];
  const checked = baggages
    .filter(b => b.type === 'checked')
    .reduce((sum, b) => sum + (Number(b.quantity) || 1), 0);
  const cabinBags = baggages
    .filter(b => b.type === 'carry_on')
    .reduce((sum, b) => sum + (Number(b.quantity) || 1), 0);

  const priceParsed = parseFloat(offer.total_amount || '0');
  const price = isNaN(priceParsed) ? 0 : Math.round(priceParsed);

  const carrierCode = offer.owner?.iata_code || firstSegment?.marketing_carrier?.iata_code || 'ZZ';
  const flightNum = firstSegment?.marketing_carrier_flight_number
    ? `${carrierCode} ${firstSegment.marketing_carrier_flight_number}`
    : (carrierCode !== 'ZZ' ? carrierCode : 'Duffel Flight');

  return {
    id: offer.id,
    mode: 'flight',
    airline: offer.owner?.name || firstSegment?.marketing_carrier?.name || 'Commercial Airline',
    airlineCode: carrierCode,
    airlineLogo: offer.owner?.logo_symbol_url || null,
    flightNumber: flightNum,
    origin: {
      code: firstSegment?.origin?.iata_code || firstSlice?.origin?.iata_code || '',
      name: firstSegment?.origin?.name || firstSlice?.origin?.name || '',
      city: firstSegment?.origin?.city_name || firstSlice?.origin?.city_name || ''
    },
    destination: {
      code: lastSegment?.destination?.iata_code || firstSlice?.destination?.iata_code || '',
      name: lastSegment?.destination?.name || firstSlice?.destination?.name || '',
      city: lastSegment?.destination?.city_name || firstSlice?.destination?.city_name || ''
    },
    departure: firstSegment?.departing_at || null,
    arrival: lastSegment?.arriving_at || null,
    depart: formatLocalTime(firstSegment?.departing_at),
    arrive: formatLocalTime(lastSegment?.arriving_at),
    duration: durationInfo.formatted,
    durationMinutes: durationInfo.minutes,
    stops: stopsCount,
    cabin: firstSegment?.passengers?.[0]?.cabin_class || 'economy',
    price,
    currency: offer.total_currency || 'INR',
    baggage: {
      checked,
      cabin: cabinBags
    },
    // Provenance integrity
    source: isLive ? 'live' : 'sandbox',
    status: isLive ? 'confirmed' : 'sandbox_offer',
    isEstimated: !isLive, // Sandbox offers are explicitly tagged isEstimated: true
    provider: 'duffel',
    fetchedAt: new Date().toISOString(),
    expiresAt: offer.expires_at || null
  };
};

/**
 * Creates a DuffelProvider instance with configurable transport for dependency injection.
 * @param {Object} [options]
 * @param {string} [options.apiKey]
 * @param {string} [options.baseUrl]
 * @param {number} [options.timeoutMs]
 * @param {Function} [options.fetchFn]
 */
export const createDuffelProvider = (options = {}) => {
  const getApiKey = () => options.apiKey !== undefined ? options.apiKey : process.env.DUFFEL_API_KEY;
  const baseUrl = options.baseUrl || DUFFEL_BASE_URL;
  const timeoutMs = options.timeoutMs || DUFFEL_DEFAULT_TIMEOUT_MS;
  const fetchFn = options.fetchFn || globalThis.fetch;

  /**
   * Search flights via Duffel Flights API (POST /air/offer_requests)
   * @param {Object} searchRequest
   * @param {string} searchRequest.originCode - 3-letter IATA code (e.g. "BLR")
   * @param {string} searchRequest.destinationCode - 3-letter IATA code (e.g. "DEL")
   * @param {string} searchRequest.departureDate - YYYY-MM-DD
   * @param {number} [searchRequest.passengers=1]
   * @param {string} [searchRequest.cabin='economy']
   * @param {AbortSignal} [searchRequest.signal]
   * @returns {Promise<{ offers: Array, count: number, provider: string, isEstimated: boolean }>}
   */
  const searchFlights = async ({
    originCode,
    destinationCode,
    departureDate,
    passengers = 1,
    cabin = 'economy',
    signal = null
  }) => {
    const key = getApiKey();
    if (!key || typeof key !== 'string' || !key.trim()) {
      throw new FlightProviderError(
        'Flight search provider is not configured (missing DUFFEL_API_KEY).',
        503,
        'FLIGHT_PROVIDER_UNAVAILABLE'
      );
    }

    const passengerCount = Math.max(1, Math.min(9, parseInt(passengers || '1', 10)));
    const cabinClass = ['economy', 'premium_economy', 'business', 'first'].includes(cabin)
      ? cabin
      : 'economy';

    // Official Duffel v2 request payload
    const requestBody = {
      data: {
        slices: [
          {
            origin: originCode,
            destination: destinationCode,
            departure_date: departureDate
          }
        ],
        passengers: Array.from({ length: passengerCount }, () => ({ type: 'adult' })),
        cabin_class: cabinClass
      }
    };

    const headers = {
      'Authorization': `Bearer ${key.trim()}`,
      'Duffel-Version': 'v2',
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip'
    };

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
      response = await fetchFn(`${baseUrl}/air/offer_requests?return_offers=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
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

    // Handle provider HTTP response errors
    if (!response.ok) {
      let errorBody = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = null;
      }

      const duffelError = errorBody?.errors?.[0];
      const duffelMessage = duffelError?.message || duffelError?.title || response.statusText;

      if (response.status === 429) {
        throw new FlightProviderError(
          'Flight search provider rate limit exceeded. Please retry shortly.',
          429,
          'FLIGHT_PROVIDER_RATE_LIMITED',
          errorBody?.errors
        );
      }

      if (response.status === 401 || response.status === 403) {
        throw new FlightProviderError(
          'Flight provider authorization failed.',
          502,
          'FLIGHT_PROVIDER_AUTH_ERROR'
        );
      }

      if (response.status === 400 || response.status === 422) {
        throw new FlightProviderError(
          duffelMessage || 'Invalid flight search request.',
          400,
          'FLIGHT_SEARCH_INVALID',
          errorBody?.errors
        );
      }

      if (response.status >= 500) {
        throw new FlightProviderError(
          'Flight search provider is temporarily unavailable.',
          503,
          'FLIGHT_PROVIDER_UNAVAILABLE'
        );
      }

      throw new FlightProviderError(
        `Flight provider returned status ${response.status}: ${duffelMessage}`,
        response.status,
        'FLIGHT_PROVIDER_ERROR'
      );
    }

    // Parse successful response
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

    const rawOffers = json?.data?.offers || [];
    const isLive = Boolean(json?.data?.live_mode);

    // Empty provider result is CASE A (NO_FLIGHTS_FOUND), NOT an error
    if (!Array.isArray(rawOffers) || rawOffers.length === 0) {
      return {
        offers: [],
        count: 0,
        provider: 'duffel',
        isEstimated: !isLive
      };
    }

    const normalizedOffers = rawOffers.map(normalizeDuffelOffer);

    return {
      offers: normalizedOffers,
      count: normalizedOffers.length,
      provider: 'duffel',
      isEstimated: !isLive
    };
  };

  return {
    searchFlights
  };
};

export const duffelProvider = createDuffelProvider();
export default duffelProvider;
