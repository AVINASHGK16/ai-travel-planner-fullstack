import { request } from './apiClient.js';

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
      throw new Error(`Weather station not found for "${city}".`);
    }
    if (res.status === 429) {
      throw new Error('Weather update rate limit reached. Please check back later.');
    }
    if (res.status === 503) {
      throw new Error('Live weather service is not configured on the server.');
    }
    throw new Error(res.data?.error || 'Live weather service is temporarily unavailable.');
  }

  const data = res.data;
  if (!data || typeof data.temp !== 'string' || !data.temp.trim()) {
    throw new Error('Weather service returned incomplete information.');
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
