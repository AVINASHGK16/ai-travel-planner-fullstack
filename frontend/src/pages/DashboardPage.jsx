import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import Dashboard from '../components/Dashboard';
import ChatAssistant from '../components/ChatAssistant';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAuth } from '../context/AuthContext';
import { storage, isValidTripsArray } from '../utils/storage';
import { getTrips, deleteTrip as apiDeleteTrip } from '../services/tripService';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, token, logout, openAuthModal } = useAuth();

  const [savedTrips, setSavedTrips] = useState(() => storage.getJSON('savedTrips', [], isValidTripsArray));
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState(null);
  const [notification, setNotification] = useState(null);
  const notifyTimeoutRef = useRef(null);

  const showNotification = (type, message) => {
    if (notifyTimeoutRef.current) {
      clearTimeout(notifyTimeoutRef.current);
    }
    setNotification({ type, message });
    notifyTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
      }
    };
  }, []);

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

  // Delete trip from history (non-reentrant and state consistent)
  const handleDeleteTrip = async (tripIdOrIndex) => {
    if (deletingTripId !== null) return false;
    setDeletingTripId(tripIdOrIndex);

    try {
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
          showNotification('warning', 'Your session has expired. Please sign in again.');
          logout();
          openAuthModal();
          return false;
        }

        if (response.status === 429) {
          showNotification('warning', 'Too many delete requests. Please wait a moment before trying again.');
          return false;
        }

        if (response.status === 404) {
          setSavedTrips(prev => prev.filter(t => (t?._id || t?.id) !== targetId));
          const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
          const filteredLocal = localTrips.filter(t => (t?._id || t?.id) !== targetId);
          storage.setJSON('savedTrips', filteredLocal);
          showNotification('success', 'Trip removed.');
          return true;
        }

        if (!response.ok) {
          const errorDetail = response.data?.error ? `: ${response.data.error}` : '';
          showNotification('error', `Failed to delete trip from server${errorDetail}. Please try again.`);
          return false;
        }

        setSavedTrips(prev => prev.filter(t => (t?._id || t?.id) !== targetId));
        const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
        const filteredLocal = localTrips.filter(t => (t?._id || t?.id) !== targetId);
        storage.setJSON('savedTrips', filteredLocal);
        showNotification('success', 'Trip successfully deleted.');
        return true;
      } catch (err) {
        console.warn('Network error while deleting trip:', err.message);
        showNotification('error', "We couldn't connect to Roamly right now. Please check your connection and try again.");
        return false;
      }
    } finally {
      setDeletingTripId(null);
    }
  };

  const handleSelectTrip = (trip) => {
    if (!trip) return;
    const targetId = trip._id || trip.id;
    if (targetId) {
      navigate(`/plan/${targetId}`);
    }
  };

  return (
    <ErrorBoundary fallbackTitle="Dashboard Error" onReset={() => navigate('/')}>
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div
            role="status"
            aria-live="polite"
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-xs animate-fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : notification.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
              {notification.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      <Dashboard
        savedTrips={savedTrips}
        onDeleteTrip={handleDeleteTrip}
        onSelectTrip={handleSelectTrip}
        setView={(view) => navigate(view === 'home' ? '/' : `/${view}`)}
        deletingTripId={deletingTripId}
        loadingTrips={loadingTrips}
      />
      {savedTrips?.length > 0 && savedTrips[0] && (
        <ChatAssistant tripData={savedTrips[0]} />
      )}
    </ErrorBoundary>
  );
}
