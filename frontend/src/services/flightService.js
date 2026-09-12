import { request, ApiError, normalizeApiError } from './apiClient.js';

/**
 * Search for flight offers between origin and destination.
 * Shields frontend components from backend routes and endpoint mechanics.
 * @param {Object} params
 * @param {string} params.origin - Origin city name or 3-letter IATA code
 * @param {string} params.destination - Destination city name or 3-letter IATA code
 * @param {string} params.date - Departure date in YYYY-MM-DD format
 * @param {number} [params.passengers=1] - Number of passengers (1-9)
 * @param {string} [params.cabin='economy'] - 'economy' | 'premium_economy' | 'business' | 'first'
 * @param {boolean} [params.allowEstimate=false] - Whether to allow estimate fallback if provider unavailable
 * @param {AbortSignal} [signal] - Optional cancellation signal
 * @returns {Promise<Object>} Normalized search results with offers array
 */
export const searchFlights = async ({
  origin,
  destination,
  date,
  passengers = 1,
  cabin = 'economy',
  allowEstimate = false
}, signal = null) => {
  const params = new URLSearchParams();
  if (origin) params.append('origin', origin);
  if (destination) params.append('destination', destination);
  if (date) params.append('date', date);
  if (passengers) params.append('passengers', String(passengers));
  if (cabin) params.append('cabin', cabin);
  if (allowEstimate) params.append('allowEstimate', 'true');

  const res = await request(`/api/flights/search?${params.toString()}`, {
    method: 'GET',
    signal,
    timeoutMs: 12000
  });

  if (!res.ok) {
    throw normalizeApiError(res, 'Failed to retrieve flight offers.');
  }

  return res.data;
};

export default {
  searchFlights
};
