const sanitize = (str, maxLen = 500) => (typeof str === 'string' ? str.trim().slice(0, maxLen) : '');

export const getWeather = async (city) => {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    const err = new Error('OpenWeather API Key is not configured on the server.');
    err.statusCode = 503;
    err.code = 'WEATHER_UNCONFIGURED';
    throw err;
  }

  const sanitizedCity = sanitize(city, 100);

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(sanitizedCity)}&appid=${apiKey}&units=metric`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      if (response.status === 404) {
        const err = new Error(`Weather station not found for location "${sanitizedCity}".`);
        err.statusCode = 404;
        err.code = 'CITY_NOT_FOUND';
        throw err;
      }
      if (response.status === 429) {
        const err = new Error('Weather service rate limit reached. Please try again later.');
        err.statusCode = 429;
        err.code = 'WEATHER_RATE_LIMITED';
        throw err;
      }
      if (response.status === 401 || response.status === 403) {
        const err = new Error('Weather service configuration error on server.');
        err.statusCode = 503;
        err.code = 'WEATHER_UNCONFIGURED';
        throw err;
      }
      const err = new Error('Weather service is temporarily unavailable.');
      err.statusCode = 502;
      err.code = 'WEATHER_UPSTREAM_ERROR';
      throw err;
    }

    const data = await response.json();

    if (typeof data?.main?.temp !== 'number' || isNaN(data.main.temp)) {
      const err = new Error('Weather service returned incomplete temperature data.');
      err.statusCode = 502;
      err.code = 'WEATHER_INCOMPLETE';
      throw err;
    }

    const tempNum = Math.round(data.main.temp);
    const condition = data?.weather?.[0]?.main || data?.weather?.[0]?.description || 'Atmosphere';
    const windSpeedNum = typeof data?.wind?.speed === 'number' && !isNaN(data.wind.speed)
      ? Math.round(data.wind.speed * 3.6)
      : null;
    const windSpeedStr = windSpeedNum !== null ? `${windSpeedNum} km/h` : 'N/A';

    return {
      temp: `${tempNum}°C`,
      condition,
      windSpeed: windSpeedStr,
      rainAlert: data?.rain ? 'Possible light showers expected' : 'Clear dry weather forecast'
    };
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      const err = new Error('Weather request timed out.');
      err.statusCode = 504;
      err.code = 'WEATHER_TIMEOUT';
      throw err;
    }
    throw error;
  }
};
