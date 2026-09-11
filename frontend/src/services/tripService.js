import { request } from './apiClient.js';

export const fetchTrips = async (token, signal = null) => {
  return await request('/api/trips', {
    method: 'GET',
    token,
    signal,
    timeoutMs: 7000
  });
};

export const saveTrip = async (tripData, token, signal = null) => {
  return await request('/api/trips', {
    method: 'POST',
    body: tripData,
    token,
    signal,
    timeoutMs: 8000
  });
};

export const deleteTrip = async (tripId, token, signal = null) => {
  return await request(`/api/trips/${tripId}`, {
    method: 'DELETE',
    token,
    signal,
    timeoutMs: 7000
  });
};
