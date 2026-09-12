import { request } from './apiClient.js';

// Local verified city database for instantaneous offline/client resolution
export const KNOWN_CITIES = {
  bangalore: { lat: 12.9716, lon: 77.5946, name: 'Bangalore', address: 'Bengaluru, Karnataka, India' },
  bengaluru: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru', address: 'Bengaluru, Karnataka, India' },
  mysore: { lat: 12.3052, lon: 76.6554, name: 'Mysore', address: 'Mysuru, Karnataka, India' },
  mysuru: { lat: 12.3052, lon: 76.6554, name: 'Mysuru', address: 'Mysuru, Karnataka, India' },
  hyderabad: { lat: 17.3850, lon: 78.4867, name: 'Hyderabad', address: 'Hyderabad, Telangana, India' },
  chennai: { lat: 13.0827, lon: 80.2707, name: 'Chennai', address: 'Chennai, Tamil Nadu, India' },
  mumbai: { lat: 19.0760, lon: 72.8777, name: 'Mumbai', address: 'Mumbai, Maharashtra, India' },
  delhi: { lat: 28.6139, lon: 77.2090, name: 'Delhi', address: 'New Delhi, Delhi, India' },
  newdelhi: { lat: 28.6139, lon: 77.2090, name: 'New Delhi', address: 'New Delhi, Delhi, India' },
  pune: { lat: 18.5204, lon: 73.8567, name: 'Pune', address: 'Pune, Maharashtra, India' },
  goa: { lat: 15.2993, lon: 74.1240, name: 'Goa', address: 'Goa, India' },
  panaji: { lat: 15.4909, lon: 73.8278, name: 'Panaji', address: 'Panaji, Goa, India' },
  kolkata: { lat: 22.5726, lon: 88.3639, name: 'Kolkata', address: 'Kolkata, West Bengal, India' },
  kochi: { lat: 9.9312, lon: 76.2673, name: 'Kochi', address: 'Kochi, Kerala, India' },
  jaipur: { lat: 26.9124, lon: 75.7873, name: 'Jaipur', address: 'Jaipur, Rajasthan, India' },
  agra: { lat: 27.1767, lon: 78.0081, name: 'Agra', address: 'Agra, Uttar Pradesh, India' },
  ahmedabad: { lat: 23.0225, lon: 72.5714, name: 'Ahmedabad', address: 'Ahmedabad, Gujarat, India' },
  chandigarh: { lat: 30.7333, lon: 76.7794, name: 'Chandigarh', address: 'Chandigarh, India' },
  varanasi: { lat: 25.3176, lon: 82.9739, name: 'Varanasi', address: 'Varanasi, Uttar Pradesh, India' },
  ooty: { lat: 11.4102, lon: 76.6950, name: 'Ooty', address: 'Udhagamandalam, Tamil Nadu, India' },
  coorg: { lat: 12.3375, lon: 75.8069, name: 'Coorg', address: 'Madikeri, Kodagu, Karnataka, India' },
  pondicherry: { lat: 11.9416, lon: 79.8083, name: 'Pondicherry', address: 'Puducherry, India' },
  newyork: { lat: 40.7128, lon: -74.0060, name: 'New York', address: 'New York, NY, USA' },
  london: { lat: 51.5074, lon: -0.1278, name: 'London', address: 'London, UK' },
  paris: { lat: 48.8566, lon: 2.3522, name: 'Paris', address: 'Paris, France' },
  tokyo: { lat: 35.6762, lon: 139.6503, name: 'Tokyo', address: 'Tokyo, Japan' },
  sydney: { lat: -33.8688, lon: 151.2093, name: 'Sydney', address: 'Sydney, Australia' },
  singapore: { lat: 1.3521, lon: 103.8198, name: 'Singapore', address: 'Singapore' },
  dubai: { lat: 25.2048, lon: 55.2708, name: 'Dubai', address: 'Dubai, UAE' }
};

const clientGeocodeCache = new Map();

export const normalizeKey = (str) => {
  if (typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
};

export const isValidCoords = (coord) => {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  const [lat, lon] = coord;
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
};

export const calculateHaversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Authoritative Geocoding lookup.
 * Distinguishes GEOCODED vs FAILED_TO_GEOCODE.
 * Never fabricates coordinates.
 */
export const geocodeCity = async (cityName, signal = null) => {
  if (!cityName || typeof cityName !== 'string' || !cityName.trim()) {
    return {
      name: '',
      formattedAddress: null,
      latitude: null,
      longitude: null,
      source: null,
      status: 'FAILED_TO_GEOCODE',
      error: 'City name is required'
    };
  }

  const raw = cityName.trim();
  const key = normalizeKey(raw);

  // Fast path: known local database
  if (KNOWN_CITIES[key]) {
    const item = KNOWN_CITIES[key];
    return {
      name: item.name,
      formattedAddress: item.address,
      latitude: item.lat,
      longitude: item.lon,
      source: 'authoritative_cache',
      status: 'GEOCODED'
    };
  }

  // Client memory cache
  if (clientGeocodeCache.has(key)) {
    return clientGeocodeCache.get(key);
  }

  // Try backend proxy endpoint
  try {
    const res = await request(`/api/geo/geocode?q=${encodeURIComponent(raw)}`, {
      signal,
      timeoutMs: 4000
    });

    if (res.ok && res.data && res.data.status === 'GEOCODED') {
      clientGeocodeCache.set(key, res.data);
      return res.data;
    }
  } catch (err) {
    // Backend request failed or timed out — fall through to direct Nominatim
  }

  // Fallback: direct OpenStreetMap Nominatim request
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(raw)}&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AITravelPlanner-Frontend/1.0' },
      signal
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (isValidCoords([lat, lon])) {
          const canonical = {
            name: raw,
            formattedAddress: data[0].display_name || raw,
            latitude: lat,
            longitude: lon,
            source: 'nominatim',
            status: 'GEOCODED'
          };
          clientGeocodeCache.set(key, canonical);
          return canonical;
        }
      }
    }
  } catch (err) {
    // Nominatim unreachable
  }

  // Explicit failure — zero coordinate fabrication
  return {
    name: raw,
    formattedAddress: null,
    latitude: null,
    longitude: null,
    source: null,
    status: 'FAILED_TO_GEOCODE',
    error: `Could not resolve geographic location for "${raw}". Please verify spelling.`
  };
};

/**
 * Route calculation returning real road distance and duration.
 * Zero coordinate or distance fabrication.
 */
export const calculateRoute = async (fromCoords, toCoords, mode = 'driving', signal = null) => {
  if (!isValidCoords(fromCoords) || !isValidCoords(toCoords)) {
    throw new Error('Valid origin and destination coordinates required.');
  }

  const [lat1, lon1] = fromCoords;
  const [lat2, lon2] = toCoords;
  const haversineDist = calculateHaversine(lat1, lon1, lat2, lon2);

  // 1. Try backend route endpoint
  try {
    const res = await request('/api/geo/route', {
      method: 'POST',
      body: { origin: fromCoords, destination: toCoords, mode },
      signal,
      timeoutMs: 5000
    });

    if (res.ok && res.data && typeof res.data.distanceKm === 'number') {
      return res.data;
    }
  } catch {
    // Backend routing unavailable
  }

  // 2. Try direct OSRM
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl, {
      headers: { 'User-Agent': 'AITravelPlanner-Frontend/1.0' },
      signal
    });

    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route && typeof route.distance === 'number') {
        let geometry = null;
        if (route.geometry && Array.isArray(route.geometry.coordinates)) {
          geometry = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        }

        return {
          distanceKm: Math.round(route.distance / 1000),
          durationMinutes: Math.round(route.duration / 60),
          geometry,
          source: 'osrm',
          status: 'live',
          isRoadRoute: true,
          fetchedAt: new Date().toISOString()
        };
      }
    }
  } catch {
    // OSRM failed
  }

  // 3. Explicitly tagged estimate fallback (never claim straight-line is road distance)
  const estimatedRoadKm = Math.round(haversineDist * 1.25);
  const estimatedMinutes = Math.round((estimatedRoadKm / 60) * 60);

  return {
    distanceKm: estimatedRoadKm,
    durationMinutes: estimatedMinutes,
    straightLineKm: haversineDist,
    geometry: null,
    source: 'haversine_estimate',
    status: 'estimated',
    isRoadRoute: false,
    notice: 'Estimated road route. Highway routing service was temporarily unreachable.',
    fetchedAt: new Date().toISOString()
  };
};
