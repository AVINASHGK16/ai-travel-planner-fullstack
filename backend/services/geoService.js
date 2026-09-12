/**
 * Authoritative Geocoding and Routing Service
 * Provides canonical location resolution and real road distance/duration.
 * Zero coordinate fabrication — unknown locations return explicit FAILED_TO_GEOCODE.
 */

// Authoritative local database of verified city coordinates [lat, lon]
const AUTHORITATIVE_CITIES = {
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

// In-memory cache for dynamic geocoding lookups
const geocodeCache = new Map();

// Helper to normalize city query strings
export const normalizeCityKey = (str) => {
  if (typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
};

// Coordinate validation
export const isValidCoordinate = (lat, lon) => {
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

/**
 * Geocode a location query to a canonical location model.
 * Never fabricates coordinates.
 * Returns { name, formattedAddress, latitude, longitude, providerId, source, status }
 */
export const geocodeLocation = async (query, signal = null) => {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return {
      name: '',
      formattedAddress: null,
      latitude: null,
      longitude: null,
      providerId: null,
      source: null,
      status: 'FAILED_TO_GEOCODE',
      error: 'Query string is required'
    };
  }

  const rawQuery = query.trim();
  const normalized = normalizeCityKey(rawQuery);

  // 1. Check authoritative local cache
  if (AUTHORITATIVE_CITIES[normalized]) {
    const item = AUTHORITATIVE_CITIES[normalized];
    return {
      name: item.name,
      formattedAddress: item.address,
      latitude: item.lat,
      longitude: item.lon,
      providerId: `auth_${normalized}`,
      source: 'authoritative_cache',
      status: 'GEOCODED'
    };
  }

  // 2. Check in-memory geocoding cache
  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized);
  }

  // 3. Query OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(rawQuery)}&limit=1`;
    const timeoutSignal = AbortSignal.timeout(5000);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AITravelPlanner-Backend/1.0'
      },
      signal: combinedSignal
    });

    if (!res.ok) {
      throw new Error(`Nominatim HTTP ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);

      if (isValidCoordinate(lat, lon)) {
        const canonical = {
          name: rawQuery,
          formattedAddress: data[0].display_name || rawQuery,
          latitude: lat,
          longitude: lon,
          providerId: data[0].place_id ? `osm_${data[0].place_id}` : null,
          source: 'nominatim',
          status: 'GEOCODED'
        };
        geocodeCache.set(normalized, canonical);
        return canonical;
      }
    }

    // No results found
    const failedResult = {
      name: rawQuery,
      formattedAddress: null,
      latitude: null,
      longitude: null,
      providerId: null,
      source: null,
      status: 'FAILED_TO_GEOCODE',
      error: `Could not resolve geographic coordinates for "${rawQuery}".`
    };
    return failedResult;
  } catch (err) {
    // Network or timeout failure — explicit failure, zero fake coordinates
    return {
      name: rawQuery,
      formattedAddress: null,
      latitude: null,
      longitude: null,
      providerId: null,
      source: null,
      status: 'FAILED_TO_GEOCODE',
      error: `Geocoding lookup failed: ${err.message}`
    };
  }
};

/**
 * Standard Haversine straight-line distance in kilometers
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
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
 * Real Road Routing calculation via OSRM.
 * Returns distance in kilometers and duration in minutes.
 * Falls back to explicitly tagged Haversine straight-line estimate if OSRM is unreachable.
 */
export const getRoute = async (originCoords, destinationCoords, mode = 'driving', signal = null) => {
  if (!Array.isArray(originCoords) || !Array.isArray(destinationCoords) ||
      !isValidCoordinate(originCoords[0], originCoords[1]) ||
      !isValidCoordinate(destinationCoords[0], destinationCoords[1])) {
    const err = new Error('Invalid origin or destination coordinates provided for routing.');
    err.statusCode = 400;
    throw err;
  }

  const [lat1, lon1] = originCoords;
  const [lat2, lon2] = destinationCoords;

  const haversineDist = calculateHaversineDistance(lat1, lon1, lat2, lon2);

  try {
    // OSRM expects coordinates in lng,lat order
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
    const timeoutSignal = AbortSignal.timeout(6000);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    const res = await fetch(osrmUrl, {
      headers: { 'User-Agent': 'AITravelPlanner-Backend/1.0' },
      signal: combinedSignal
    });

    if (res.ok) {
      const data = await res.json();
      const primaryRoute = data?.routes?.[0];
      if (primaryRoute && typeof primaryRoute.distance === 'number') {
        const distanceKm = Math.round(primaryRoute.distance / 1000);
        const durationMinutes = Math.round(primaryRoute.duration / 60);

        // Convert GeoJSON [lon, lat] pairs to Leaflet [lat, lon] tuples
        let geometry = null;
        if (primaryRoute.geometry && Array.isArray(primaryRoute.geometry.coordinates)) {
          geometry = primaryRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        }

        return {
          distanceKm,
          durationMinutes,
          geometry,
          source: 'osrm',
          status: 'live',
          isRoadRoute: true,
          fetchedAt: new Date().toISOString()
        };
      }
    }
  } catch (err) {
    // OSRM service failure or timeout — proceed to controlled fallback
  }

  // Graceful fallback: Road distance heuristic (~1.25x straight-line in India/global corridors)
  const estimatedRoadKm = Math.round(haversineDist * 1.25);
  const estimatedRoadMinutes = Math.round((estimatedRoadKm / 60) * 60); // approx 60 km/h average

  return {
    distanceKm: estimatedRoadKm,
    durationMinutes: estimatedRoadMinutes,
    straightLineKm: haversineDist,
    geometry: null,
    source: 'haversine_estimate',
    status: 'estimated',
    isRoadRoute: false,
    notice: 'Estimated road route. Real-time highway routing service was temporarily unreachable.',
    fetchedAt: new Date().toISOString()
  };
};
