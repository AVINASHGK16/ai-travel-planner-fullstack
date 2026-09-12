import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage, isValidTripsArray } from '../utils/storage';
import { useAuth } from './AuthContext';
import { getTrips, createTrip, deleteTrip as apiDeleteTrip } from '../services/tripService';

const TripsContext = createContext(null);

export function TripsProvider({ children }) {
  const { user, token, logout, openAuthModal } = useAuth();

  const [savedTrips, setSavedTrips] = useState(() => storage.getJSON('savedTrips', [], isValidTripsArray));
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState(null);

  // Load saved trips when user authenticates
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const fetchTrips = async () => {
      if (user && token) {
        setLoadingTrips(true);
        try {
          const response = await getTrips(token, controller.signal);
          if (!active) return;

          if (response.ok) {
            const data = response.data;
            const serverTrips = Array.isArray(data) ? data : [];

            // Preserve any local offline trips created by this user
            const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
            const offlineOnlyTrips = Array.isArray(localTrips)
              ? localTrips.filter(t => t?.userEmail === user.email && String(t?._id).startsWith('local_'))
              : [];

            // Merge offline trips with server trips (avoiding duplicates)
            const serverTripIds = new Set(serverTrips.map(t => t?._id).filter(Boolean));
            const uniqueOffline = offlineOnlyTrips.filter(t => !serverTripIds.has(t?._id));
            const mergedTrips = [...uniqueOffline, ...serverTrips];

            if (active) {
              setSavedTrips(mergedTrips);
              storage.setJSON('savedTrips', mergedTrips);
            }
          } else if (response.status === 401 || response.status === 403) {
            // Token expired or invalid — clear session cleanly
            logout();
          } else if (response.status === 429) {
            console.warn('Trips request rate limited (429). Loading cached trips.');
            const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
            const userTrips = Array.isArray(localTrips) ? localTrips.filter(t => t?.userEmail === user.email) : [];
            if (active) setSavedTrips(userTrips);
          } else {
            throw new Error(`Server returned error status: ${response.status}`);
          }
        } catch (error) {
          if (!active) return;
          if (error.name !== 'AbortError') {
            console.warn('Backend unavailable, loading trips from localStorage fallback:', error.message);
          }
          const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
          const userTrips = Array.isArray(localTrips) ? localTrips.filter(t => t?.userEmail === user.email) : [];
          setSavedTrips(userTrips);
        } finally {
          if (active) setLoadingTrips(false);
        }
      } else {
        setSavedTrips([]);
        setLoadingTrips(false);
      }
    };

    fetchTrips();
    return () => {
      active = false;
      controller.abort();
    };
  }, [user, token]);

  // Save active trip (non-reentrant)
  const handleSaveTrip = async (activeTrip) => {
    if (savingTrip) return false;

    if (!user) {
      alert('Please Sign In first to save your trip itinerary!');
      openAuthModal();
      return false;
    }

    if (!activeTrip) return false;

    if (!activeTrip.from || !activeTrip.to) {
      alert('Cannot save incomplete trip. Please plan a trip first.');
      return false;
    }

    // Verify if already saved to avoid duplicates
    const alreadySaved = savedTrips.some(
      t => t?.from === activeTrip.from && t?.to === activeTrip.to && t?.date === activeTrip.date
    );

    if (alreadySaved) {
      alert('This trip plan is already saved in your dashboard history.');
      return false;
    }

    const tripToSave = {
      ...activeTrip,
      userEmail: user.email
    };

    setSavingTrip(true);
    try {
      const response = await createTrip(tripToSave, token);

      if (response.ok) {
        const savedData = response.data;
        const effectiveTrip = savedData || { ...tripToSave, _id: `trip_${Date.now()}` };
        setSavedTrips(prev => [effectiveTrip, ...prev]);

        // Also sync to local storage for offline redundancy
        const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
        storage.setJSON('savedTrips', [effectiveTrip, ...localTrips]);

        alert('Trip itinerary successfully saved to your dashboard!');
        return true;
      }

      // Handle specific HTTP error status codes gracefully
      if (response.status === 400) {
        let errorMsg = 'Invalid trip details. Please check your trip inputs.';
        if (response.data?.error) errorMsg = response.data.error;
        else if (response.data?.details?.[0]?.message) errorMsg = response.data.details[0].message;
        alert(`Could not save trip: ${errorMsg}`);
        return false;
      }

      if (response.status === 401 || response.status === 403) {
        alert('Your session has expired. Please sign in again to save your trip.');
        logout();
        openAuthModal();
        return false;
      }

      if (response.status === 429) {
        alert('Too many save requests. Please wait a moment before trying again.');
        return false;
      }

      // For 500, 502, 503 or other server errors, fallback to offline local saving
      throw new Error(`Server returned status ${response.status}`);
    } catch (err) {
      console.warn('Backend unavailable, saving trip locally:', err.message);
      // Generate standard local ID for offline tracking
      const localSavedTrip = {
        ...tripToSave,
        _id: `local_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      setSavedTrips(prev => [localSavedTrip, ...prev]);

      const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
      storage.setJSON('savedTrips', [localSavedTrip, ...localTrips]);

      alert('Trip itinerary saved locally (Offline Mode).');
      return true;
    } finally {
      setSavingTrip(false);
    }
  };

  // Delete trip from history (non-reentrant and state consistent)
  const handleDeleteTrip = async (tripIdOrIndex) => {
    if (deletingTripId !== null) return false;
    setDeletingTripId(tripIdOrIndex);

    try {
      // Determine the actual trip ID
      let targetId = tripIdOrIndex;
      if (typeof tripIdOrIndex === 'number') {
        const tripObj = savedTrips[tripIdOrIndex];
        if (!tripObj) return false;
        targetId = tripObj._id || tripObj.id;
      }

      if (!targetId) return false;

      // Local offline trip: only exists in client storage
      if (typeof targetId === 'string' && targetId.startsWith('local_')) {
        setSavedTrips(prev => prev.filter(t => (t?._id || t?.id) !== targetId));
        const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
        const filteredLocal = localTrips.filter(t => (t?._id || t?.id) !== targetId);
        storage.setJSON('savedTrips', filteredLocal);
        return true;
      }

      // Backend trip: requires authenticated server confirmation
      try {
        const response = await apiDeleteTrip(targetId, token);

        if (response.status === 401 || response.status === 403) {
          alert('Your session has expired. Please sign in again.');
          logout();
          openAuthModal();
          return false; // Trip remains visible
        }

        if (response.status === 429) {
          alert('Too many delete requests. Please wait a moment before trying again.');
          return false; // Trip remains visible
        }

        if (response.status === 404) {
          // Trip was already deleted or not found on server — clean up local state
          setSavedTrips(prev => prev.filter(t => (t?._id || t?.id) !== targetId));
          const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
          const filteredLocal = localTrips.filter(t => (t?._id || t?.id) !== targetId);
          storage.setJSON('savedTrips', filteredLocal);
          return true;
        }

        if (!response.ok) {
          const errorDetail = response.data?.error ? `: ${response.data.error}` : '';
          alert(`Failed to delete trip from server${errorDetail}. Please try again.`);
          return false; // Trip remains visible on server error
        }

        // Deletion confirmed by server (200/204) — remove from local state and storage
        setSavedTrips(prev => prev.filter(t => (t?._id || t?.id) !== targetId));
        const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
        const filteredLocal = localTrips.filter(t => (t?._id || t?.id) !== targetId);
        storage.setJSON('savedTrips', filteredLocal);
        return true;
      } catch (err) {
        console.warn('Network error while deleting trip:', err.message);
        // Network drop or timeout — DO NOT delete locally; keep trip visible
        alert('Could not delete trip due to a network error. Please check your connection and try again.');
        return false;
      }
    } finally {
      setDeletingTripId(null);
    }
  };

  const getTripById = (id) => {
    if (!id) return null;
    const fromState = savedTrips.find(t => (t?._id === id || t?.id === id || String(t?._id) === String(id)));
    if (fromState) return fromState;

    const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
    return localTrips.find(t => (t?._id === id || t?.id === id || String(t?._id) === String(id))) || null;
  };

  const value = {
    savedTrips,
    loadingTrips,
    savingTrip,
    deletingTripId,
    saveTrip: handleSaveTrip,
    deleteTrip: handleDeleteTrip,
    getTripById,
    setSavedTrips
  };

  return (
    <TripsContext.Provider value={value}>
      {children}
    </TripsContext.Provider>
  );
}

export const useTrips = () => {
  const context = useContext(TripsContext);
  if (!context) {
    throw new Error('useTrips must be used within a TripsProvider');
  }
  return context;
};

export default TripsContext;
