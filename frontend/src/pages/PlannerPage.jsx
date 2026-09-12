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
import { generateMockData, getAIGeneration } from '../utils/planner';
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
      setActiveMode(routeTrip?.options?.own ? 'own' : 'flight');
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

  const handleSearch = async (params) => {
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchControllerRef.current = controller;

    setLoading(true);

    if (params.preferredMode && params.preferredMode !== 'any') {
      setActiveMode(params.preferredMode);
    } else {
      setActiveMode('flight');
    }

    try {
      let responseData = null;
      let aiErrorNotice = null;

      try {
        responseData = await getAIGeneration(params, controller.signal);
      } catch (aiErr) {
        if (aiErr.code === 'CANCELLED') return;
        aiErrorNotice = aiErr.message || 'AI service unavailable';
        console.warn('Backend AI generation unavailable, using local itinerary engine:', aiErr.message);
      }

      if (controller.signal.aborted) return;

      if (responseData && responseData.itinerary && responseData.isAIGenerated) {
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

        const aiSuggestions = (responseData.cheapest || responseData.fastest || responseData.comfort || responseData.value || responseData.eco) ? {
          cheapest: responseData.cheapest ? { ...responseData.cheapest, desc: responseData.cheapest.desc || responseData.cheapest.description } : baselineMock.suggestions?.cheapest,
          fastest: responseData.fastest ? { ...responseData.fastest, desc: responseData.fastest.desc || responseData.fastest.description } : baselineMock.suggestions?.fastest,
          comfort: responseData.comfort ? { ...responseData.comfort, desc: responseData.comfort.desc || responseData.comfort.description } : baselineMock.suggestions?.comfort,
          value: responseData.value ? { ...responseData.value, desc: responseData.value.desc || responseData.value.description } : baselineMock.suggestions?.value,
          eco: responseData.eco ? { ...responseData.eco, desc: responseData.eco.desc || responseData.eco.description } : baselineMock.suggestions?.eco,
        } : null;

        const completeTripData = {
          ...baselineMock,
          ...responseData,
          from: params.from,
          to: params.to,
          date: params.date,
          returnDate: params.returnDate || null,
          tripDays: baselineMock.tripDays || 1,
          travelers: parseInt(params.travelers, 10) || 1,
          budget: parseFloat(params.budget) || 2500,
          distance: baselineMock.distance,
          coordinates: responseData.coordinates || { from: fromCoords, to: toCoords, mid: midCoords },
          options: responseData.options || baselineMock.options,
          suggestions: responseData.suggestions || aiSuggestions || baselineMock.suggestions,
          budgetDetails: responseData.budgetDetails || baselineMock.budgetDetails,
          roadTripDetails: responseData.roadTripDetails || baselineMock.roadTripDetails,
          weather: responseData.weather || baselineMock.weather,
          itinerary: Array.isArray(responseData.itinerary) ? responseData.itinerary : baselineMock.itinerary,
          isAIGenerated: true,
          generationSource: 'ai',
          generationNotice: null
        };

        setActiveTrip(completeTripData);
        storage.setJSON('activePlan', completeTripData);
      } else {
        const mockData = generateMockData(
          params.from,
          params.to,
          params.date,
          params.returnDate,
          params.travelers,
          params.budget
        );

        const fallbackPlan = {
          ...mockData,
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
      const fallbackData = generateMockData(
        params.from,
        params.to,
        params.date,
        params.returnDate,
        params.travelers,
        params.budget
      );
      const catchPlan = {
        ...fallbackData,
        isAIGenerated: false,
        generationSource: 'deterministic_fallback',
        generationNotice: err.message || 'Error communicating with AI service'
      };
      setActiveTrip(catchPlan);
      storage.setJSON('activePlan', catchPlan);
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

      const updatedTrip = {
        ...prev,
        itinerary: newItinerary,
        ...(updatedBudgetDetails && { budgetDetails: updatedBudgetDetails })
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
          <h3 className="font-display font-bold text-xl text-white">Generating Best Travel Plan</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-[280px]">
            Analyzing routing channels, lodging indexes, petrol stations, and coordinates...
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
            Generate AI-optimized multi-modal travel itineraries, real-time weather forecasts, and route estimates.
          </p>
        </div>
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
            <WeatherInfo
              weather={activeTrip.weather}
              destination={activeTrip.to}
            />

            <BudgetCalculator
              budgetDetails={activeTrip.budgetDetails}
              travelers={activeTrip.travelers}
            />
          </div>
        </div>

        {/* Floating Chat Assistant */}
        <ChatAssistant tripData={activeTrip} />
      </div>
    </ErrorBoundary>
  );
}
