import { request } from './apiClient.js';

/**
 * Fetch all trips for the authenticated user
 * @param {string} token - JWT authentication token
 * @param {AbortSignal} [signal] - Optional cancellation signal
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
export const getTrips = async (token, signal = null) => {
  return await request('/api/trips', {
    method: 'GET',
    token,
    signal,
    timeoutMs: 7000
  });
};

/**
 * Create/save a trip for the authenticated user
 * @param {Object} tripData - Trip payload
 * @param {string} token - JWT authentication token
 * @param {AbortSignal} [signal] - Optional cancellation signal
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
export const createTrip = async (tripData, token, signal = null) => {
  return await request('/api/trips', {
    method: 'POST',
    body: tripData,
    token,
    signal,
    timeoutMs: 8000
  });
};

/**
 * Delete a trip by ID for the authenticated user
 * @param {string} tripId - The trip ID to delete
 * @param {string} token - JWT authentication token
 * @param {AbortSignal} [signal] - Optional cancellation signal
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
export const deleteTrip = async (tripId, token, signal = null) => {
  return await request(`/api/trips/${tripId}`, {
    method: 'DELETE',
    token,
    signal,
    timeoutMs: 7000
  });
};

/** @alias getTrips */
export const fetchTrips = getTrips;

/** @alias createTrip */
export const saveTrip = createTrip;

const tripService = {
  getTrips,
  createTrip,
  deleteTrip,
  fetchTrips,
  saveTrip
};

export default tripService;
