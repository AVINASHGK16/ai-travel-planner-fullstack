import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Compass, Sparkles, ChevronLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import HeroSearch from '../components/HeroSearch';
import SmartSuggestions from '../components/SmartSuggestions';
import TravelOptions from '../components/TravelOptions';
import RoadTripDetails from '../components/RoadTripDetails';
import WeatherInfo from '../components/WeatherInfo';
import BudgetCalculator from '../components/BudgetCalculator';
import ItineraryGenerator from '../components/ItineraryGenerator';
import ChatAssistant from '../components/ChatAssistant';
import ErrorBoundary from '../components/ErrorBoundary';
import { generateMockData, getAIGeneration, resolveTripGeography, calculateModeBudget } from '../utils/planner';
import { useAuth } from '../context/AuthContext';
import { storage, isValidTripsArray } from '../utils/storage';
import { createTrip } from '../services/tripService';
import { useTrip } from '../hooks/useTrip';

export default function PlannerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tripId } = useParams();
  const { user, token, logout, openAuthModal } = useAuth();
  const { trip: routeTrip, loading: resolvingTrip, notFound: tripNotFound } = useTrip(tripId);

  const [loading, setLoading] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [activeTrip, setActiveTrip] = useState(() => {
    if (tripId) return null;
    return storage.getJSON('activePlan', null);
  });
  const [activeMode, setActiveMode] = useState('flight');
  const searchControllerRef = useRef(null);

  // Sync resolved trip from route parameter /plan/:tripId
  useEffect(() => {
    if (tripId && routeTrip) {
      setActiveTrip(routeTrip);
      const savedMode = routeTrip.transportMode || (routeTrip?.options?.own ? 'own' : 'flight');
      setActiveMode(savedMode);
      setLoading(false);
    }
  }, [tripId, routeTrip]);

  // Handle new search parameters from route state (/plan)
  useEffect(() => {
    const searchParams = location.state?.searchParams;
    if (!tripId && searchParams) {
      handleSearch(searchParams);
    }
    return () => {
      if (searchControllerRef.current) {
        searchControllerRef.current.abort();
      }
    };
  }, [location.state, tripId]);

  const handleSelectMode = (newMode) => {
    setActiveMode(newMode);
    setActiveTrip(prev => {
      if (!prev) return prev;
      const updatedBudget = calculateModeBudget(newMode, prev.costComponents || prev.budgetDetails);
      const updatedTrip = {
        ...prev,
        transportMode: newMode,
        budgetDetails: updatedBudget
      };
      storage.setJSON('activePlan', updatedTrip);
      return updatedTrip;
    });
  };

  const handleSearch = async (params) => {
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchControllerRef.current = controller;

    setLoading(true);
    setSearchError(null);

    try {
      // 1. Authoritative Geocoding & Route Calculation
      let geoData = null;
      try {
        geoData = await resolveTripGeography(params.from, params.to, controller.signal);
      } catch (geoErr) {
        if (controller.signal.aborted) return;
        setSearchError(geoErr.message || 'Geographic location could not be resolved. Please verify city spelling.');
        setLoading(false);
        return;
      }

      if (controller.signal.aborted) return;

      const { routeDetails } = geoData;
      const canFly = (routeDetails?.distanceKm || 0) >= 200;
      let effectiveMode = params.preferredMode && params.preferredMode !== 'any'
        ? params.preferredMode
        : (canFly ? 'flight' : 'own');
      if (effectiveMode === 'flight' && !canFly) {
        effectiveMode = 'own';
      }
      setActiveMode(effectiveMode);

      // 2. Generate baseline truthful domain plan
      const baselineMock = generateMockData(
        params.from,
        params.to,
        params.date,
        params.returnDate,
        params.travelers,
        params.budget,
        effectiveMode,
        geoData
      );

      // 3. Attempt Gemini narrative itinerary generation
      let responseData = null;
      let aiErrorNotice = null;

      try {
        responseData = await getAIGeneration(params, controller.signal);
      } catch (aiErr) {
        if (aiErr.code === 'CANCELLED') return;
        aiErrorNotice = aiErr.message || 'AI service unavailable';
      }

      if (controller.signal.aborted) return;

      if (responseData && responseData.itinerary && responseData.isAIGenerated) {
        // Enforce Gemini Boundary: AI provides itinerary narrative, but deterministic
        // travel facts (distance, route, coordinates, budgets, options) are authoritative.
        const completeTripData = {
          ...baselineMock,
          from: params.from,
          to: params.to,
          date: params.date,
          returnDate: params.returnDate || null,
          tripDays: baselineMock.tripDays || 1,
          travelers: parseInt(params.travelers, 10) || 1,
          budget: parseFloat(params.budget) || 2500,
          transportMode: effectiveMode,
          distance: baselineMock.distance,
          coordinates: baselineMock.coordinates,
          canonicalLocations: baselineMock.canonicalLocations,
          routeDetails: baselineMock.routeDetails,
          options: baselineMock.options,
          costComponents: baselineMock.costComponents,
          budgetDetails: baselineMock.budgetDetails,
          weather: baselineMock.weather,
          itinerary: Array.isArray(responseData.itinerary) ? responseData.itinerary : baselineMock.itinerary,
          isAIGenerated: true,
          generationSource: 'ai',
          generationNotice: null
        };

        setActiveTrip(completeTripData);
        storage.setJSON('activePlan', completeTripData);
      } else {
        const fallbackPlan = {
          ...baselineMock,
          isAIGenerated: false,
          generationSource: 'deterministic_fallback',
          generationNotice: aiErrorNotice || 'Standard curated itinerary (offline/fallback mode)'
        };
        setActiveTrip(fallbackPlan);
        storage.setJSON('activePlan', fallbackPlan);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Search processing error:', err);
      setSearchError(err.message || 'Error processing trip search. Please try again.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleChangeItinerary = (newItinerary) => {
    setActiveTrip(prev => {
      if (!prev || !Array.isArray(newItinerary)) return prev;

      const newMisc = newItinerary.reduce((acc, day) => {
        return acc + (day?.activities || []).reduce((sum, act) => sum + (parseFloat(act?.cost) || 0), 0);
      }, 0);

      const currentCosts = prev.costComponents ? {
        ...prev.costComponents,
        miscCost: newMisc
      } : {
        ...prev.budgetDetails,
        misc: newMisc
      };

      const updatedBudget = calculateModeBudget(activeMode, currentCosts);

      const updatedTrip = {
        ...prev,
        itinerary: newItinerary,
        budgetDetails: updatedBudget,
        costComponents: prev.costComponents ? { ...prev.costComponents, miscCost: newMisc } : prev.costComponents
      };
      storage.setJSON('activePlan', updatedTrip);
      return updatedTrip;
    });
  };

  const handleSaveActiveTrip = async () => {
    if (savingTrip) return;

    if (!user) {
      alert('Please Sign In first to save your trip itinerary!');
      openAuthModal();
      return;
    }

    if (!activeTrip || !activeTrip.from || !activeTrip.to) {
      alert('Cannot save incomplete trip. Please plan a trip first.');
      return;
    }

    const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
    const alreadySaved = localTrips.some(
      t => t?.from === activeTrip.from && t?.to === activeTrip.to && t?.date === activeTrip.date
    );

    if (alreadySaved) {
      alert('This trip plan is already saved in your dashboard history.');
      return;
    }

    const tripToSave = {
      ...activeTrip,
      transportMode: activeMode,
      userEmail: user.email
    };

    setSavingTrip(true);
    try {
      const response = await createTrip(tripToSave, token);

      if (response.ok) {
        const savedData = response.data;
        const effectiveTrip = savedData || { ...tripToSave, _id: `trip_${Date.now()}` };
        storage.setJSON('savedTrips', [effectiveTrip, ...localTrips]);
        alert('Trip itinerary successfully saved to your dashboard!');
        return;
      }

      if (response.status === 400) {
        let errorMsg = 'Invalid trip details. Please check your trip inputs.';
        if (response.data?.error) errorMsg = response.data.error;
        else if (response.data?.details?.[0]?.message) errorMsg = response.data.details[0].message;
        alert(`Could not save trip: ${errorMsg}`);
        return;
      }

      if (response.status === 401 || response.status === 403) {
        alert('Your session has expired. Please sign in again to save your trip.');
        logout();
        openAuthModal();
        return;
      }

      if (response.status === 429) {
        alert('Too many save requests. Please wait a moment before trying again.');
        return;
      }

      throw new Error(`Server returned status ${response.status}`);
    } catch (err) {
      console.warn('Backend unavailable, saving trip locally:', err.message);
      const localSavedTrip = {
        ...tripToSave,
        _id: `local_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      storage.setJSON('savedTrips', [localSavedTrip, ...localTrips]);
      alert('Trip itinerary saved locally (Offline Mode).');
    } finally {
      setSavingTrip(false);
    }
  };

  const handleBackToSearch = () => {
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
      searchControllerRef.current = null;
    }
    setActiveTrip(null);
    setSearchError(null);
    storage.remove('activePlan');
    navigate('/plan');
  };

  if (tripId && resolvingTrip) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <h3 className="font-display font-bold text-xl text-white">Loading Travel Plan...</h3>
        <p className="text-sm text-slate-400">Resolving itinerary details for trip #{tripId}</p>
      </div>
    );
  }

  if (tripId && tripNotFound) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-display font-bold text-2xl text-white">Trip Not Found</h3>
          <p className="text-sm text-slate-400 max-w-md mt-2">
            We couldn't find a saved travel plan matching ID <code className="px-1.5 py-0.5 rounded bg-white/10 text-blue-300 font-mono text-xs">{tripId}</code>. It may have been deleted, or the URL might be incorrect.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-lg shadow-blue-600/20"
          >
            View Saved Trips
          </button>
          <button
            type="button"
            onClick={() => navigate('/plan')}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            Create New Plan
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
        <div className="relative">
          <Compass className="w-16 h-16 text-blue-500 animate-spin-slow" />
          <Sparkles className="w-6 h-6 text-purple-400 absolute -top-1 -right-1 animate-bounce" />
        </div>
        <div>
          <h3 className="font-display font-bold text-xl text-white">Calculating Authentic Travel Plan</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-[280px]">
            Resolving authoritative coordinates, highway routes, and mode-specific budgets...
          </p>
        </div>
      </div>
    );
  }

  if (!activeTrip) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display font-black text-3xl md:text-5xl text-white tracking-tight">
            Plan Your <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Next Adventure</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Generate authoritative multi-modal travel itineraries, real road routes, and mode-aware budgets.
          </p>
        </div>

        {searchError && (
          <div className="max-w-3xl mx-auto p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-amber-300 text-sm shadow-md">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h5 className="font-semibold text-white text-sm">Geographic Resolution Notice</h5>
                <p className="text-xs text-amber-300/90 mt-0.5">{searchError}</p>
              </div>
            </div>
            <button
              onClick={() => setSearchError(null)}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        <HeroSearch onSearch={handleSearch} loading={loading} />
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Travel Plan Error" onReset={handleBackToSearch}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Header / Summary panel */}
        <div className="flex flex-col md:flex-row justify-between md:items-center p-5 rounded-2xl glass border border-white/10 gap-4">
          <div>
            <button
              type="button"
              onClick={handleBackToSearch}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold mb-2 group transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to search</span>
            </button>
            <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
              {(typeof activeTrip.from === 'string' ? activeTrip.from.split(',')[0] : 'Origin')} to {(typeof activeTrip.to === 'string' ? activeTrip.to.split(',')[0] : 'Destination')} Plan
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <p className="text-xs text-slate-400">
                Departing {activeTrip.date || 'N/A'}{activeTrip.returnDate ? ` • Returning ${activeTrip.returnDate}` : ''} • {activeTrip.travelers || 1} Travelers • Distance: {activeTrip.distance || 'N/A'} km
              </p>
              {activeTrip.isAIGenerated ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <Sparkles className="w-3 h-3" />
                  <span>Gemini AI Narrative</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30" title={activeTrip.generationNotice || 'Curated standard plan'}>
                  <Compass className="w-3 h-3" />
                  <span>Curated Standard Plan (Offline/Fallback)</span>
                </span>
              )}
              {activeTrip.routeDetails?.source && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  <span>Route: {activeTrip.routeDetails.source.toUpperCase()}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action items */}
          <div className="flex gap-2">
            <button
              type="button"
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
            <span>Notice: {activeTrip.generationNotice}. Displaying deterministic itinerary with mode-aware budget.</span>
          </div>
        )}

        {/* Smart suggestions row */}
        <SmartSuggestions
          suggestions={activeTrip.suggestions}
          onSelectMode={handleSelectMode}
          isAIGenerated={Boolean(activeTrip.isAIGenerated)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Transport options grid (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            <div className="p-6 rounded-2xl glass border border-white/10">
              <h3 className="font-display font-bold text-lg text-white mb-4">Compare & Book Transports</h3>
              <TravelOptions
                from={activeTrip.from}
                to={activeTrip.to}
                date={activeTrip.date}
                options={activeTrip.options}
                activeMode={activeMode}
                setActiveMode={handleSelectMode}
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
            <WeatherInfo
              weather={activeTrip.weather}
              destination={activeTrip.to}
              destinationCoords={activeTrip.coordinates?.to}
            />

            <BudgetCalculator
              budgetDetails={activeTrip.budgetDetails}
              travelers={activeTrip.travelers}
              activeMode={activeMode}
            />
          </div>
        </div>

        {/* Floating Chat Assistant */}
        <ChatAssistant tripData={activeTrip} />
      </div>
    </ErrorBoundary>
  );
}
