import { request } from './apiClient.js';

export const fetchWeather = async (city, signal = null) => {
  return await request(`/api/weather?city=${encodeURIComponent(city)}`, {
    method: 'GET',
    signal,
    timeoutMs: 6000
  });
};
