import { request, ApiError, normalizeApiError } from './apiClient.js';

/**
 * Request live weather forecast data for a specified city or canonical coordinates.
 * Shields calling components from endpoint URLs, HTTP mechanics, rate limiting, and backend API details.
 * @param {string|Object} location - The city name string or { city, lat, lon } coordinate object.
 * @param {AbortSignal} [signal] - Optional cancellation signal.
 * @returns {Promise<Object>} Weather payload { temp, condition, windSpeed, rainAlert, forecast }
 */
export const getWeather = async (location, signal = null) => {
  let queryStr = '';
  let displayName = '';

  if (typeof location === 'object' && location !== null) {
    const { city, lat, lon } = location;
    displayName = city || `${lat}, ${lon}`;
    const params = new URLSearchParams();
    if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
      params.append('lat', lat.toString());
      params.append('lon', lon.toString());
    }
    if (city) {
      params.append('city', city);
    }
    queryStr = params.toString();
  } else if (typeof location === 'string') {
    displayName = location;
    queryStr = `city=${encodeURIComponent(location)}`;
  }

  const res = await request(`/api/weather?${queryStr}`, {
    method: 'GET',
    signal,
    timeoutMs: 6000
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new ApiError(`Weather station not found for "${displayName}".`, 404, 'NOT_FOUND');
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
 * @param {string|Object} location
 * @param {AbortSignal} [signal]
 */
export const fetchWeather = async (location, signal = null) => {
  let queryStr = '';
  if (typeof location === 'object' && location !== null) {
    const { city, lat, lon } = location;
    const params = new URLSearchParams();
    if (typeof lat === 'number' && typeof lon === 'number') {
      params.append('lat', lat.toString());
      params.append('lon', lon.toString());
    }
    if (city) params.append('city', city);
    queryStr = params.toString();
  } else {
    queryStr = `city=${encodeURIComponent(location || '')}`;
  }

  return await request(`/api/weather?${queryStr}`, {
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
