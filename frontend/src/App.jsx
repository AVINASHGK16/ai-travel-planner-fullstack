import React, { useState, useEffect, useRef } from 'react';
import { Compass, Sparkles, ChevronLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import Navbar from './components/Navbar';
import HeroSearch from './components/HeroSearch';
import SmartSuggestions from './components/SmartSuggestions';
import TravelOptions from './components/TravelOptions';
import RoadTripDetails from './components/RoadTripDetails';
import WeatherInfo from './components/WeatherInfo';
import BudgetCalculator from './components/BudgetCalculator';
import ItineraryGenerator from './components/ItineraryGenerator';
import ChatAssistant from './components/ChatAssistant';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import SettingsPanel from './components/SettingsPanel';
import { generateMockData, getAIGeneration } from './utils/planner';

// Safe JSON parser to prevent uncaught SyntaxError crashes on corrupted localStorage
const safeJsonParse = (str, fallback) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [view, setView] = useState('home'); // 'home' | 'search' | 'dashboard'
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState(null);
  
  // Trip details state
  const [activeTrip, setActiveTrip] = useState(null);
  const [activeMode, setActiveMode] = useState('flight'); // 'flight' | 'train' | 'bus' | 'cab' | 'own'
  
  // Settings state (client-only configuration)
  const [settings, setSettings] = useState({
    googleMapsKey: localStorage.getItem('googleMapsKey') || ''
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Authentication State
  const [auth, setAuth] = useState({
    user: null,
    token: localStorage.getItem('authToken') || null,
    modalOpen: false
  });

  // Saved Trips History
  const [savedTrips, setSavedTrips] = useState([]);

  // Async operations lifecycle & non-reentrancy states
  const [savingTrip, setSavingTrip] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const searchControllerRef = useRef(null);

  // Validate stored auth token on mount
  useEffect(() => {
    // Purge any legacy API keys from browser localStorage for security
    localStorage.removeItem('geminiKey');
    localStorage.removeItem('openWeatherKey');

    let active = true;
    const validateToken = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/auth/me`, {
          signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined,
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!active) return;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.user) {
            setAuth({ user: data.user, token, modalOpen: false });
          } else {
            const cachedUser = safeJsonParse(localStorage.getItem('user'), null);
            setAuth({ user: cachedUser, token, modalOpen: false });
          }
        } else if (res.status === 401 || res.status === 403) {
          // Explicit token rejection from server
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setAuth({ user: null, token: null, modalOpen: false });
        } else {
          // On 429, 500, or temporary server issues, retain cached user session
          const cachedUser = safeJsonParse(localStorage.getItem('user'), null);
          if (cachedUser) {
            setAuth(prev => ({ ...prev, user: cachedUser }));
          }
        }
      } catch {
        // Backend offline or request timed out — use cached user data if available
        if (!active) return;
        const cachedUser = safeJsonParse(localStorage.getItem('user'), null);
        if (cachedUser) {
          setAuth(prev => ({ ...prev, user: cachedUser }));
        }
      }
    };
    validateToken();
    return () => {
      active = false;
    };
  }, []);

  // Load saved trips when user authenticates
  useEffect(() => {
    let active = true;
    const fetchTrips = async () => {
      if (auth.user && auth.token) {
        setLoadingTrips(true);
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
          const response = await fetch(`${backendUrl}/api/trips`, {
            signal: AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined,
            headers: { 'Authorization': `Bearer ${auth.token}` }
          });
          if (!active) return;

          if (response.ok) {
            const data = await response.json().catch(() => null);
            const serverTrips = Array.isArray(data) ? data : [];
            
            // Preserve any local offline trips created by this user
            const localTrips = safeJsonParse(localStorage.getItem('savedTrips'), []);
            const offlineOnlyTrips = Array.isArray(localTrips)
              ? localTrips.filter(t => t?.userEmail === auth.user.email && String(t?._id).startsWith('local_'))
              : [];
            
            // Merge offline trips with server trips (avoiding duplicates)
            const serverTripIds = new Set(serverTrips.map(t => t?._id).filter(Boolean));
            const uniqueOffline = offlineOnlyTrips.filter(t => !serverTripIds.has(t?._id));
            const mergedTrips = [...uniqueOffline, ...serverTrips];

            if (active) {
              setSavedTrips(mergedTrips);
              localStorage.setItem('savedTrips', JSON.stringify(mergedTrips));
            }
          } else if (response.status === 401 || response.status === 403) {
            // Token expired or invalid — clear session cleanly
            handleLogout();
          } else if (response.status === 429) {
            console.warn('Trips request rate limited (429). Loading cached trips.');
            const localTrips = safeJsonParse(localStorage.getItem('savedTrips'), []);
            const userTrips = Array.isArray(localTrips) ? localTrips.filter(t => t?.userEmail === auth.user.email) : [];
            if (active) setSavedTrips(userTrips);
          } else {
            throw new Error(`Server returned error status: ${response.status}`);
          }
        } catch (error) {
          if (!active) return;
          console.warn('Backend unavailable, loading trips from localStorage fallback:', error.message);
          const localTrips = safeJsonParse(localStorage.getItem('savedTrips'), []);
          const userTrips = Array.isArray(localTrips) ? localTrips.filter(t => t?.userEmail === auth.user.email) : [];
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
    };
  }, [auth.user, auth.token]);

  const handleLoginSuccess = ({ user, token }) => {
    setAuth({ user, token, modalOpen: false });
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const handleLogout = async () => {
    const token = auth.token;
    setAuth({ user: null, token: null, modalOpen: false });
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setSavedTrips([]);

    if (token) {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        await fetch(`${backendUrl}/api/auth/logout`, {
          method: 'POST',
          signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        // Local logout completed even if network drops
      }
    }
  };

  const handleSaveSettings = (newSettings) => {
    setSettings({ googleMapsKey: newSettings.googleMapsKey || '' });
    localStorage.setItem('googleMapsKey', newSettings.googleMapsKey || '');
    localStorage.removeItem('geminiKey');
    localStorage.removeItem('openWeatherKey');
    alert('Settings successfully updated!');
  };

  // View navigation helper that ensures stale loading state cannot survive navigation
  const handleNavigate = (newView) => {
    if (loading && searchControllerRef.current) {
      searchControllerRef.current.abort();
      searchControllerRef.current = null;
    }
    setLoading(false);
    setView(newView);
  };

  // Perform search and fetch AI travel plans
  const handleSearch = async (params) => {
    // Abort any existing search in flight
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchControllerRef.current = controller;

    setSearchParams(params);
    setLoading(true);
    setView('search');

    // Default to flight tab or own vehicle depending on selection
    if (params.preferredMode && params.preferredMode !== 'any') {
      setActiveMode(params.preferredMode);
    } else {
      setActiveMode('flight');
    }

    try {
      // Route AI generation through backend proxy (keys stay server-side)
      let responseData = null;
      let aiErrorNotice = null;

      try {
        responseData = await getAIGeneration(params, controller.signal);
      } catch (aiErr) {
        if (aiErr.code === 'CANCELLED') {
          return; // User navigated away or started another search
        }
        aiErrorNotice = aiErr.message || 'AI service unavailable';
        console.warn('Backend AI generation unavailable, using local itinerary engine:', aiErr.message);
      }

      if (controller.signal.aborted) return;

      if (responseData && responseData.itinerary && responseData.isAIGenerated) {
        // Generate baseline mock to guarantee complete fallback structures
        const baselineMock = generateMockData(
          params.from,
          params.to,
          params.date,
          params.returnDate,
          params.travelers,
          params.budget
        );

        const fromCoords = baselineMock.coordinates.from;
        const toCoords = baselineMock.coordinates.to;
        const midCoords = [(fromCoords[0] + toCoords[0]) / 2, (fromCoords[1] + toCoords[1]) / 2];

        const completeTripData = {
          ...baselineMock,
          ...responseData,
          from: params.from,
          to: params.to,
          date: params.date,
          returnDate: params.returnDate || null,
          travelers: parseInt(params.travelers) || 1,
          budget: parseFloat(params.budget) || 2500,
          distance: baselineMock.distance,
          coordinates: responseData.coordinates || { from: fromCoords, to: toCoords, mid: midCoords },
          options: responseData.options || baselineMock.options,
          suggestions: responseData.suggestions || baselineMock.suggestions,
          budgetDetails: responseData.budgetDetails || baselineMock.budgetDetails,
          roadTripDetails: responseData.roadTripDetails || baselineMock.roadTripDetails,
          weather: responseData.weather || baselineMock.weather,
          itinerary: Array.isArray(responseData.itinerary) ? responseData.itinerary : baselineMock.itinerary,
          isAIGenerated: true,
          generationSource: 'ai',
          generationNotice: null
        };

        setActiveTrip(completeTripData);
      } else {
        // Run in curated fallback mode — clearly tagged as deterministic fallback
        const mockData = generateMockData(
          params.from,
          params.to,
          params.date,
          params.returnDate,
          params.travelers,
          params.budget
        );
        
        setActiveTrip({
          ...mockData,
          isAIGenerated: false,
          generationSource: 'deterministic_fallback',
          generationNotice: aiErrorNotice || 'Standard curated itinerary (offline/fallback mode)'
        });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Search processing error:', err);
      const fallbackData = generateMockData(
        params.from,
        params.to,
        params.date,
        params.returnDate,
        params.travelers,
        params.budget
      );
      setActiveTrip({
        ...fallbackData,
        isAIGenerated: false,
        generationSource: 'deterministic_fallback',
        generationNotice: err.message || 'Error communicating with AI service'
      });
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  // Save current active plan to dashboard (non-reentrant)
  const handleSaveActiveTrip = async () => {
    if (savingTrip) return;

    if (!auth.user) {
      alert('Please Sign In first to save your trip itinerary!');
      setAuth(prev => ({ ...prev, modalOpen: true }));
      return;
    }

    if (!activeTrip) return;

    if (!activeTrip.from || !activeTrip.to) {
      alert('Cannot save incomplete trip. Please plan a trip first.');
      return;
    }

    // Verify if already saved to avoid duplicates
    const alreadySaved = savedTrips.some(
      t => t?.from === activeTrip.from && t?.to === activeTrip.to && t?.date === activeTrip.date
    );

    if (alreadySaved) {
      alert('This trip plan is already saved in your dashboard history.');
      return;
    }

    const tripToSave = {
      ...activeTrip,
      userEmail: auth.user.email
    };

    setSavingTrip(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/trips`, {
        method: 'POST',
        signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(tripToSave)
      });

      if (response.ok) {
        const savedData = await response.json().catch(() => null);
        const effectiveTrip = savedData || { ...tripToSave, _id: `trip_${Date.now()}` };
        setSavedTrips(prev => [effectiveTrip, ...prev]);
        
        // Also sync to local storage for offline redundancy
        const localTrips = safeJsonParse(localStorage.getItem('savedTrips'), []);
        localStorage.setItem('savedTrips', JSON.stringify([effectiveTrip, ...(Array.isArray(localTrips) ? localTrips : [])]));
        
        alert('Trip itinerary successfully saved to your dashboard!');
        return;
      }

      // Handle specific HTTP error status codes gracefully
      if (response.status === 400) {
        let errorMsg = 'Invalid trip details. Please check your trip inputs.';
        try {
          const errData = await response.json();
          if (errData?.error) errorMsg = errData.error;
          else if (errData?.details?.[0]?.message) errorMsg = errData.details[0].message;
        } catch { /* ignore parsing errors */ }
        alert(`Could not save trip: ${errorMsg}`);
        return;
      }

      if (response.status === 401 || response.status === 403) {
        alert('Your session has expired. Please sign in again to save your trip.');
        handleLogout();
        setAuth(prev => ({ ...prev, modalOpen: true }));
        return;
      }

      if (response.status === 429) {
        alert('Too many save requests. Please wait a moment before trying again.');
        return;
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

      const localTrips = safeJsonParse(localStorage.getItem('savedTrips'), []);
      localStorage.setItem('savedTrips', JSON.stringify([localSavedTrip, ...(Array.isArray(localTrips) ? localTrips : [])]));

      alert('Trip itinerary saved locally (Offline Mode).');
    } finally {
      setSavingTrip(false);
    }
  };

  // Delete trip from history (non-reentrant and state consistent)
  const handleDeleteTrip = async (tripIdOrIndex) => {
    if (deletingTripId !== null) return;
    setDeletingTripId(tripIdOrIndex);

    try {
      // Determine the actual trip ID
      let targetId = tripIdOrIndex;
      if (typeof tripIdOrIndex === 'number') {
        const tripObj = savedTrips[tripIdOrIndex];
        if (!tripObj) return;
        targetId = tripObj._id;
      }

      if (!targetId) return;

      // Local offline trip: only exists in client storage
      if (typeof targetId === 'string' && targetId.startsWith('local_')) {
        setSavedTrips(prev => prev.filter(t => t?._id !== targetId));
        const localTrips = safeJsonParse(localStorage.getItem('savedTrips'), []);
        const filteredLocal = Array.isArray(localTrips) ? localTrips.filter(t => t?._id !== targetId) : [];
        localStorage.setItem('savedTrips', JSON.stringify(filteredLocal));
        return;
      }

      // Backend trip: requires authenticated server confirmation
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/trips/${targetId}`, {
          method: 'DELETE',
          signal: AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined,
          headers: { 'Authorization': `Bearer ${auth.token}` }
        });

        if (response.status === 401 || response.status === 403) {
          alert('Your session has expired. Please sign in again.');
          handleLogout();
          setAuth(prev => ({ ...prev, modalOpen: true }));
          return; // Trip remains visible
        }

        if (response.status === 429) {
          alert('Too many delete requests. Please wait a moment before trying again.');
          return; // Trip remains visible
        }

        if (response.status === 404) {
          // Trip was already deleted or not found on server — clean up local state
          setSavedTrips(prev => prev.filter(t => t?._id !== targetId));
          const localTrips = safeJsonParse(localStorage.getItem('savedTrips'), []);
          const filteredLocal = Array.isArray(localTrips) ? localTrips.filter(t => t?._id !== targetId) : [];
          localStorage.setItem('savedTrips', JSON.stringify(filteredLocal));
          return;
        }

        if (!response.ok) {
          let errorDetail = '';
          try {
            const errJson = await response.json();
            if (errJson?.error) errorDetail = `: ${errJson.error}`;
          } catch { /* ignore parsing errors */ }
          alert(`Failed to delete trip from server${errorDetail}. Please try again.`);
          return; // Trip remains visible on server error
        }
        
        // Deletion confirmed by server (200/204) — remove from local state and storage
        setSavedTrips(prev => prev.filter(t => t?._id !== targetId));
        const localTrips = safeJsonParse(localStorage.getItem('savedTrips'), []);
        const filteredLocal = Array.isArray(localTrips) ? localTrips.filter(t => t?._id !== targetId) : [];
        localStorage.setItem('savedTrips', JSON.stringify(filteredLocal));
      } catch (err) {
        console.warn('Network error while deleting trip:', err.message);
        // Network drop or timeout — DO NOT delete locally; keep trip visible
        alert('Could not delete trip due to a network error. Please check your connection and try again.');
      }
    } finally {
      setDeletingTripId(null);
    }
  };

  // Select trip from dashboard history to view
  const handleSelectTrip = (trip) => {
    if (!trip) {
      alert('Selected trip data is unavailable.');
      return;
    }
    // Defensive normalization to ensure all child components render smoothly
    const normalizedTrip = {
      ...trip,
      from: trip.from || 'Origin',
      to: trip.to || 'Destination',
      date: trip.date || new Date().toISOString().split('T')[0],
      travelers: typeof trip.travelers === 'number' ? trip.travelers : (parseInt(trip.travelers, 10) || 1),
      budget: typeof trip.budget === 'number' ? trip.budget : (parseFloat(trip.budget) || 5000),
      itinerary: Array.isArray(trip.itinerary) ? trip.itinerary : [],
      options: trip.options || {
        own: {
          distance: trip.distance || '350 km',
          time: '5 hrs 30 mins',
          routes: [
            { name: 'Primary Route', distance: trip.distance || '350 km', time: '5h 30m', tolls: 250, roadCondition: 'Good' }
          ]
        }
      }
    };
    setActiveTrip(normalizedTrip);
    setView('search');
    if (normalizedTrip?.options?.own) {
      setActiveMode('own');
    } else {
      setActiveMode('flight');
    }
  };

  const handleChangeItinerary = (newItinerary) => {
    setActiveTrip(prev => {
      if (!prev || !Array.isArray(newItinerary)) return prev;
      
      const newMisc = newItinerary.reduce((acc, day) => {
        return acc + (day?.activities || []).reduce((sum, act) => sum + (parseFloat(act?.cost) || 0), 0);
      }, 0);

      const updatedBudgetDetails = prev.budgetDetails ? {
        ...prev.budgetDetails,
        misc: newMisc,
        total: (Number(prev.budgetDetails.tickets) || 0) +
               (Number(prev.budgetDetails.fuel) || 0) +
               (Number(prev.budgetDetails.hotel) || 0) +
               (Number(prev.budgetDetails.food) || 0) +
               (Number(prev.budgetDetails.toll) || 0) +
               (Number(prev.budgetDetails.parking) || 0) +
               newMisc
      } : null;

      return {
        ...prev,
        itinerary: newItinerary,
        ...(updatedBudgetDetails && { budgetDetails: updatedBudgetDetails })
      };
    });
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between ${theme === 'dark' ? 'bg-[#080b11] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Top Navbar */}
      <Navbar
        theme={theme}
        setTheme={setTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        auth={auth}
        setAuth={setAuth}
        setView={handleNavigate}
        view={view}
        onLogout={handleLogout}
      />

      {/* Main Container Content */}
      <main className="flex-grow pb-16">
        
        {/* VIEW 1: HOME PAGE */}
        {view === 'home' && (
          <div className="relative min-h-[calc(100vh-72px)] flex flex-col items-center justify-center overflow-hidden">
            {/* Animated background orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" />
              <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] animate-pulse" style={{animationDelay:'1.5s'}} />
              <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-indigo-500/8 blur-[100px] animate-pulse" style={{animationDelay:'3s'}} />
            </div>
            {/* Hero dot-grid background pattern */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.06) 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }} />
            {/* Feature badges */}
            <div className="relative z-10 flex items-center gap-3 mb-6 flex-wrap justify-center px-4">
              {[
                { icon: '✈️', label: 'AI Itineraries' },
                { icon: '🗺️', label: 'Live Route Maps' },
                { icon: '💰', label: 'Budget Optimizer' },
                { icon: '⛽', label: 'Road Trip Guide' },
                { icon: '🌤️', label: 'Weather Alerts' },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-white/10 text-xs font-medium text-slate-300">
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
            {/* Main search form */}
            <div className="relative z-10 w-full">
              <HeroSearch onSearch={handleSearch} loading={loading} />
            </div>
            {/* Powered-by strip */}
            <div className="relative z-10 mt-6 text-center text-xs text-slate-500 flex items-center gap-2">
              <div className="h-px w-12 bg-white/10"/>
              <span>Powered by Gemini AI · Leaflet OSM · OpenWeather</span>
              <div className="h-px w-12 bg-white/10"/>
            </div>
          </div>
        )}

        {/* VIEW 2: LOADING SCREEN */}
        {view === 'search' && loading && (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
            <div className="relative">
              <Compass className="w-16 h-16 text-blue-500 animate-spin-slow" />
              <Sparkles className="w-6 h-6 text-purple-400 absolute -top-1 -right-1 animate-bounce" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-white">Generating Best Travel Plan</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-[280px]">
                Analyzing routing channels, lodging indexes, petrol stations, and coordinates...
              </p>
            </div>
          </div>
        )}

        {/* VIEW 3: SEARCH RESULTS PAGE */}
        {view === 'search' && !loading && activeTrip && (
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            
            {/* Header / Summary panel */}
            <div className="flex flex-col md:flex-row justify-between md:items-center p-5 rounded-2xl glass border border-white/10 gap-4">
              <div>
                <button
                  onClick={() => handleNavigate('home')}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold mb-2 group transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back to search</span>
                </button>
                <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
                  {(activeTrip.from || 'Origin').split(',')[0]} to {(activeTrip.to || 'Destination').split(',')[0]} Plan
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <p className="text-xs text-slate-400">
                    Departing {activeTrip.date || 'N/A'}{activeTrip.returnDate ? ` • Returning ${activeTrip.returnDate}` : ''} • {activeTrip.travelers || 1} Travelers • Distance: {activeTrip.distance || 'N/A'} km
                  </p>
                  {activeTrip.isAIGenerated ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      <Sparkles className="w-3 h-3" />
                      <span>Gemini AI Generated</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30" title={activeTrip.generationNotice || 'Curated standard plan'}>
                      <Compass className="w-3 h-3" />
                      <span>Curated Standard Plan (Offline/Fallback)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action items */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveActiveTrip}
                  disabled={savingTrip}
                  className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 ${
                    savingTrip ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'
                  }`}
                >
                  {savingTrip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Informational banner when deterministic fallback was used */}
            {!activeTrip.isAIGenerated && activeTrip.generationNotice && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2.5 shadow-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Notice: {activeTrip.generationNotice}. Displaying standard curated itinerary for this route.</span>
              </div>
            )}

            {/* Smart suggestions row */}
            <SmartSuggestions 
              suggestions={activeTrip.suggestions} 
              onSelectMode={(mode) => setActiveMode(mode)}
              isAIGenerated={Boolean(activeTrip.isAIGenerated)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Transport options grid (Left 8 cols) */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Core booking tabs */}
                <div className="p-6 rounded-2xl glass border border-white/10">
                  <h3 className="font-display font-bold text-lg text-white mb-4">Compare & Book Transports</h3>
                  <TravelOptions
                    from={activeTrip.from}
                    to={activeTrip.to}
                    date={activeTrip.date}
                    options={activeTrip.options}
                    activeMode={activeMode}
                    setActiveMode={setActiveMode}
                  >
                    <RoadTripDetails tripData={activeTrip} />
                  </TravelOptions>
                </div>

                {/* Day-by-day Itinerary */}
                <div className="p-6 rounded-2xl glass border border-white/10">
                  <ItineraryGenerator 
                    itinerary={activeTrip.itinerary} 
                    onChangeItinerary={handleChangeItinerary}
                  />
                </div>

              </div>

              {/* Weather, Budget details (Right 4 cols) */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* Weather widget */}
                <WeatherInfo 
                  weather={activeTrip.weather} 
                  destination={activeTrip.to}
                />

                {/* Budget Calculator */}
                <BudgetCalculator 
                  budgetDetails={activeTrip.budgetDetails} 
                  travelers={activeTrip.travelers}
                />

              </div>

            </div>

            {/* Floating Chat Assistant */}
            <ChatAssistant tripData={activeTrip} />

          </div>
        )}

        {/* VIEW 4: USER DASHBOARD SAVED TRIPS */}
        {view === 'dashboard' && (
          <>
            <Dashboard
              savedTrips={savedTrips}
              onDeleteTrip={handleDeleteTrip}
              onSelectTrip={handleSelectTrip}
              setView={handleNavigate}
              deletingTripId={deletingTripId}
              loadingTrips={loadingTrips}
            />
            {/* Show Chatbot even on dashboard with last active trip info */}
            {savedTrips?.length > 0 && savedTrips[0] && (
              <ChatAssistant tripData={savedTrips[0]} />
            )}
          </>
        )}

      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={auth.modalOpen}
        onClose={() => setAuth(prev => ({ ...prev, modalOpen: false }))}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Settings Modal */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Bottom Footer */}
      <footer className="py-6 border-t border-white/5 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} AI Travel Planner Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="cursor-pointer hover:text-slate-400">Privacy Policy</span>
            <span>•</span>
            <span className="cursor-pointer hover:text-slate-400">Terms of Use</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
