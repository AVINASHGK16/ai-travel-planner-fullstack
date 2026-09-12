import { request, ApiError, normalizeApiError } from './apiClient.js';

/**
 * Request live weather forecast data for a specified city.
 * Shields calling components from endpoint URLs, HTTP mechanics, rate limiting, and backend API details.
 * @param {string} city - The city name to query.
 * @param {AbortSignal} [signal] - Optional cancellation signal.
 * @returns {Promise<Object>} Weather payload { temp, condition, windSpeed, rainAlert, forecast }
 */
export const getWeather = async (city, signal = null) => {
  const res = await request(`/api/weather?city=${encodeURIComponent(city)}`, {
    method: 'GET',
    signal,
    timeoutMs: 6000
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new ApiError(`Weather station not found for "${city}".`, 404, 'NOT_FOUND');
    }
    if (res.status === 429) {
      throw new ApiError('Weather update rate limit reached. Please check back later.', 429, 'RATE_LIMIT_EXCEEDED');
    }
    if (res.status === 503) {
      throw new ApiError('Live weather service is not configured on the server.', 503, 'SERVICE_UNAVAILABLE');
    }
    throw normalizeApiError(res, 'Live weather service is temporarily unavailable.');
  }

  const data = res.data;
  if (!data || typeof data.temp !== 'string' || !data.temp.trim()) {
    throw new ApiError('Weather service returned incomplete information.', 502, 'INCOMPLETE_DATA');
  }

  return data;
};

/**
 * Backwards-compatible raw fetch helper
 * @param {string} city
 * @param {AbortSignal} [signal]
 */
export const fetchWeather = async (city, signal = null) => {
  return await request(`/api/weather?city=${encodeURIComponent(city)}`, {
    method: 'GET',
    signal,
    timeoutMs: 6000
  });
};

const weatherService = {
  getWeather,
  fetchWeather
};

export default weatherService;
