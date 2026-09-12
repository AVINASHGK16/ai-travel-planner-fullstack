import { useState, useEffect, useCallback } from 'react';
import { storage, isValidTripsArray } from '../utils/storage.js';
import { getTrips } from '../services/tripService.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Normalizes a trip object ensuring all expected properties are safely typed.
 */
export function normalizeTrip(rawTrip) {
  if (!rawTrip) return null;
  return {
    ...rawTrip,
    from: rawTrip.from || 'Origin',
    to: rawTrip.to || 'Destination',
    date: rawTrip.date || new Date().toISOString().split('T')[0],
    travelers: typeof rawTrip.travelers === 'number' ? rawTrip.travelers : (parseInt(rawTrip.travelers, 10) || 1),
    budget: typeof rawTrip.budget === 'number' ? rawTrip.budget : (parseFloat(rawTrip.budget) || 5000),
    itinerary: Array.isArray(rawTrip.itinerary) ? rawTrip.itinerary : [],
    options: rawTrip.options || {
      own: {
        distance: rawTrip.distance || '350 km',
        time: '5 hrs 30 mins',
        routes: [
          { name: 'Primary Route', distance: rawTrip.distance || '350 km', time: '5h 30m', tolls: 250, roadCondition: 'Good' }
        ]
      }
    }
  };
}

/**
 * Custom hook to resolve a saved trip by identifier (URL route param).
 * Resolves against client-side storage and backend API if authenticated.
 * Handles loading, not-found states, error states, and unmount cleanup.
 *
 * @param {string|null} tripId - The identifier of the trip from the route
 * @returns {{ trip: object|null, loading: boolean, notFound: boolean, error: string|null, refetch: Function }}
 */
export function useTrip(tripId) {
  const { token } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(Boolean(tripId));
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  const resolveTrip = useCallback(async (signal) => {
    if (!tripId) {
      setTrip(null);
      setLoading(false);
      setNotFound(false);
      setError(null);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setError(null);

    // 1. Check local storage first (instant synchronous resolution on refresh)
    const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
    const matchedLocal = localTrips.find(
      t => t?._id === tripId || t?.id === tripId || String(t?._id) === String(tripId)
    );

    if (matchedLocal) {
      setTrip(normalizeTrip(matchedLocal));
      setLoading(false);
      return;
    }

    // 2. If not found locally, query backend API when authenticated
    const effectiveToken = token || storage.get('authToken', null);
    if (effectiveToken) {
      try {
        const response = await getTrips(effectiveToken, signal);
        if (response.ok && Array.isArray(response.data)) {
          const serverTrips = response.data;
          const matchedServer = serverTrips.find(
            t => t?._id === tripId || t?.id === tripId || String(t?._id) === String(tripId)
          );

          if (matchedServer) {
            const normalized = normalizeTrip(matchedServer);
            setTrip(normalized);
            // Cache in local storage for subsequent offline/refresh access
            const updated = [normalized, ...localTrips.filter(t => t?._id !== normalized._id)];
            storage.setJSON('savedTrips', updated);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Backend unavailable while resolving trip by ID:', err.message);
          setError('Backend unavailable');
        }
      }
    }

    // 3. Trip does not exist locally or on server
    setTrip(null);
    setNotFound(true);
    setLoading(false);
  }, [tripId, token]);

  useEffect(() => {
    const controller = new AbortController();
    resolveTrip(controller.signal);
    return () => {
      controller.abort();
    };
  }, [resolveTrip]);

  return {
    trip,
    loading,
    notFound,
    error,
    refetch: () => resolveTrip()
  };
}

export default useTrip;
