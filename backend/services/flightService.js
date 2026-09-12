/**
 * Application Flight Service
 * Orchestrates airport resolution, corridor constraints, provider invocation,
 * and normalized FlightOffer generation.
 */

import { resolveAirport } from './airportResolver.js';
import { duffelProvider } from './duffelProvider.js';
import { serpApiProvider } from './serpApiProvider.js';

export const resolveDefaultFlightProvider = () => {
  const serpKey = (process.env.SERPAPI_KEY && process.env.SERPAPI_KEY.trim()) ||
    (process.env.SERPAPI_API_KEY && process.env.SERPAPI_API_KEY.trim());
  if (serpKey) {
    return serpApiProvider;
  }
  if (process.env.DUFFEL_API_KEY && process.env.DUFFEL_API_KEY.trim()) {
    return duffelProvider;
  }
  return serpApiProvider;
};

// Haversine formula to approximate direct distance between two coordinates [lat, lon] in km
export const calculateGreatCircleDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Known approximate coordinates for corridor feasibility checking
const AIRPORT_COORDS = {
  BLR: [13.1986, 77.7066],
  DEL: [28.5562, 77.1000],
  BOM: [19.0896, 72.8656],
  MAA: [12.9941, 80.1709],
  HYD: [17.2403, 78.4294],
  CCU: [22.6547, 88.4467],
  COK: [10.1556, 76.3917],
  GOI: [15.3808, 73.8314],
  PNQ: [18.5822, 73.9197],
  JAI: [26.8242, 75.8122],
  AMD: [23.0772, 72.6347],
  IXC: [30.6735, 76.7885],
  VNS: [25.4524, 82.8593],
  AGR: [27.1558, 77.9609],
  MYQ: [12.2301, 76.6506]
};

/**
 * Creates an instance of FlightService with optional provider dependency injection.
 * @param {Object} [deps]
 * @param {Object} [deps.provider] - Flight provider adapter (e.g. serpApiProvider or duffelProvider)
 * @param {Function} [deps.airportResolver] - Airport resolution function
 */
export const createFlightService = (deps = {}) => {
  const getProvider = () => deps.provider || resolveDefaultFlightProvider();
  const resolver = deps.airportResolver || resolveAirport;

  /**
   * Search for flights between origin and destination.
   * @param {Object} params
   * @param {string} params.origin - Origin city name or 3-letter IATA code
   * @param {string} params.destination - Destination city name or 3-letter IATA code
   * @param {string} params.date - Departure date in YYYY-MM-DD format
   * @param {number} [params.passengers=1]
   * @param {string} [params.cabin='economy']
   * @param {boolean} [params.allowEstimateFallback=false] - Whether to fall back to explicit estimate if provider fails
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<Object>} Normalized search results
   */
  const searchFlights = async ({
    origin,
    destination,
    date,
    returnDate,
    passengers = 1,
    cabin = 'economy',
    allowEstimateFallback = false,
    signal = null
  }) => {
    // 1. Resolve canonical airports (throws AirportNotFoundError if unknown)
    const originAirport = resolver(origin, 'origin');
    const destAirport = resolver(destination, 'destination');

    // 2. Validate distinct origin and destination
    if (originAirport.code === destAirport.code) {
      const err = new Error('Origin and destination airport cannot be the same.');
      err.statusCode = 400;
      err.code = 'FLIGHT_SEARCH_INVALID';
      throw err;
    }

    // 3. Check corridor constraint: commercial flights do not operate on corridors < 200 km
    const coord1 = AIRPORT_COORDS[originAirport.code];
    const coord2 = AIRPORT_COORDS[destAirport.code];
    if (coord1 && coord2) {
      const distance = calculateGreatCircleDistance(coord1[0], coord1[1], coord2[0], coord2[1]);
      if (distance < 200) {
        return {
          origin: originAirport,
          destination: destAirport,
          departureDate: date,
          returnDate: returnDate || null,
          passengers: Number(passengers) || 1,
          cabin,
          distance,
          offers: [],
          count: 0,
          status: 'NO_COMMERCIAL_FLIGHTS',
          message: 'Commercial passenger flights do not operate on short corridors (<200 km). Please choose Train, Bus, or Road transit options.',
          isEstimated: false,
          provider: 'SerpApi'
        };
      }
    }

    // 4. Query provider
    try {
      const activeProvider = getProvider();
      const result = await activeProvider.searchFlights({
        originCode: originAirport.code,
        destinationCode: destAirport.code,
        departureDate: date,
        returnDate,
        passengers: Number(passengers) || 1,
        cabin,
        signal
      });

      const offers = result?.offers || [];
      const isEstimated = Boolean(result?.isEstimated);

      return {
        origin: originAirport,
        destination: destAirport,
        departureDate: date,
        returnDate: returnDate || null,
        passengers: Number(passengers) || 1,
        cabin,
        offers,
        count: offers.length,
        provider: result?.provider || 'SerpApi',
        isEstimated,
        status: offers.length > 0
          ? (isEstimated ? 'SANDBOX_OFFERS' : 'CONFIRMED_OFFERS')
          : 'NO_FLIGHTS_FOUND',
        message: offers.length > 0
          ? null
          : 'No commercial flights found for the specified route and date.'
      };
    } catch (providerError) {
      // 5. Fallback policy: only provide explicit estimate if explicitly requested
      if (allowEstimateFallback) {
        const approxDistance = coord1 && coord2
          ? calculateGreatCircleDistance(coord1[0], coord1[1], coord2[0], coord2[1])
          : 600;
        const flightMinutes = Math.max(50, Math.round(approxDistance / 8));
        const flightHours = Math.floor(flightMinutes / 60);
        const flightRemMins = flightMinutes % 60;
        const flightDurationStr = flightHours > 0 ? `${flightHours}h ${flightRemMins}m` : `${flightRemMins}m`;
        const estPrice = Math.round((1800 + approxDistance * 3.5) * (Number(passengers) || 1));

        const estimateOffer = {
          id: `fl_est_${approxDistance}_1`,
          mode: 'flight',
          airline: 'Estimated Regular Flight',
          airlineCode: 'EST',
          airlineLogo: null,
          flightNumber: 'EST 101',
          origin: { code: originAirport.code, name: originAirport.name, city: originAirport.city },
          destination: { code: destAirport.code, name: destAirport.name, city: destAirport.city },
          departure: `${date}T06:15:00`,
          arrival: `${date}T08:00:00`,
          depart: '06:15',
          arrive: '08:00',
          duration: flightDurationStr,
          durationMinutes: flightMinutes,
          stops: 0,
          cabin,
          price: estPrice,
          currency: 'INR',
          baggage: { checked: 1, cabin: 1 },
          source: 'estimate',
          status: 'estimated',
          isEstimated: true,
          provider: null,
          fetchedAt: new Date().toISOString(),
          expiresAt: null
        };

        return {
          origin: originAirport,
          destination: destAirport,
          departureDate: date,
          passengers: Number(passengers) || 1,
          cabin,
          offers: [estimateOffer],
          count: 1,
          provider: null,
          isEstimated: true,
          status: 'ESTIMATED_FALLBACK',
          notice: `Flight provider unavailable (${providerError.code || providerError.message}). Showing calculated estimated fares.`
        };
      }

      // Propagate structured application error
      throw providerError;
    }
  };

  return {
    searchFlights
  };
};

export const flightService = createFlightService();
export default flightService;
