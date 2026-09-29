import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Compass, Sparkles, AlertTriangle, Loader2, ArrowLeft, ArrowRight, Check, AlertCircle, Info, X } from 'lucide-react';
import { 
  PlannerHeader, 
  TripConfigurationCard, 
  QuickStartSuggestions, 
  TripSummaryBar,
  TravelFeatureStrip,
  TripOverview
} from '../components/planner';
import TravelOptions from '../components/TravelOptions';
import RoadTripDetails from '../components/RoadTripDetails';
import ChatAssistant from '../components/ChatAssistant';
import ErrorBoundary from '../components/ErrorBoundary';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { generateMockData, getAIGeneration, resolveTripGeography, calculateModeBudget } from '../utils/planner';
import { useAuth } from '../context/AuthContext';
import { storage, isValidTripsArray } from '../utils/storage';
import { createTrip } from '../services/tripService';
import { useTrip } from '../hooks/useTrip';
import { searchFlights } from '../services/flightService';

/**
 * Atomically merges live flight offers into a trip object,
 * recalculating flightCost and budgetDetails.
 */
function mergeFlightOffersIntoTrip(trip, offers) {
  if (!trip) return trip;
  const safeOffers = Array.isArray(offers) ? offers : [];
  const realFlightCost = safeOffers.length > 0 ? safeOffers[0].price : trip.costComponents?.flightCost;
  const updatedCostComponents = trip.costComponents ? {
    ...trip.costComponents,
    flightCost: realFlightCost
  } : trip.costComponents;
  const updatedBudget = updatedCostComponents
    ? calculateModeBudget(trip.transportMode || 'flight', updatedCostComponents)
    : trip.budgetDetails;

  return {
    ...trip,
    costComponents: updatedCostComponents,
    budgetDetails: updatedBudget,
    options: {
      ...trip.options,
      flight: safeOffers
    }
  };
}

export default function PlannerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tripId } = useParams();
  const { user, token, logout, openAuthModal } = useAuth();
  const { trip: routeTrip, loading: resolvingTrip, notFound: tripNotFound } = useTrip(tripId);

  const [loading, setLoading] = useState(false);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightStatus, setFlightStatus] = useState(() => {
    if (tripId) return 'idle';
    const initialTrip = storage.getJSON('activePlan', null);
    return (initialTrip?.options?.flight && initialTrip.options.flight.length > 0) ? 'success' : 'idle';
  });
  const [flightError, setFlightError] = useState(null);
  const [savingTrip, setSavingTrip] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [activeTrip, setActiveTrip] = useState(() => {
    if (tripId) return null;
    return storage.getJSON('activePlan', null);
  });
  const [activeMode, setActiveMode] = useState('flight');
  const [activeView, setActiveView] = useState(() => (tripId ? 'overview' : 'transport'));
  const [suggestedValues, setSuggestedValues] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [saveNotification, setSaveNotification] = useState(null);
  const saveNotifyTimeoutRef = useRef(null);

  const showNotification = (type, message) => {
    if (saveNotifyTimeoutRef.current) {
      clearTimeout(saveNotifyTimeoutRef.current);
    }
    setSaveNotification({ type, message });
    saveNotifyTimeoutRef.current = setTimeout(() => {
      setSaveNotification(null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (saveNotifyTimeoutRef.current) {
        clearTimeout(saveNotifyTimeoutRef.current);
      }
    };
  }, []);

  // Memoized initial values for editing search parameters to prevent clobbering user edits
  const modifyInitialValues = useMemo(() => {
    if (!activeTrip) return null;
    return {
      from: activeTrip.from,
      to: activeTrip.to,
      date: activeTrip.date,
      returnDate: activeTrip.returnDate,
      travelers: activeTrip.travelers,
      budget: activeTrip.budget,
      preferredMode: activeMode
    };
  }, [
    activeTrip?.from,
    activeTrip?.to,
    activeTrip?.date,
    activeTrip?.returnDate,
    activeTrip?.travelers,
    activeTrip?.budget,
    activeMode
  ]);

  const searchControllerRef = useRef(null);
  const flightControllerRef = useRef(null);
  const flightRequestIdRef = useRef(0);
  const latestFlightResultRef = useRef({ requestId: 0, offers: null, status: null, provider: null });

  // Sync resolved trip from route parameter /plan/:tripId
  useEffect(() => {
    if (tripId && routeTrip) {
      setActiveTrip(routeTrip);
      const savedMode = routeTrip.transportMode || (routeTrip?.options?.own ? 'own' : 'flight');
      setActiveMode(savedMode);
      setActiveView('overview');
      setLoading(false);
      setFlightStatus(routeTrip.options?.flight?.length > 0 ? 'success' : 'idle');
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
      if (flightControllerRef.current) {
        flightControllerRef.current.abort();
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
    if (flightControllerRef.current) {
      flightControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchControllerRef.current = controller;

    setLoading(true);
    setFlightStatus('loading');
    setFlightLoading(true);
    setSearchError(null);
    setShowEditForm(false);
    setActiveView('transport');

    try {
      // 1. Authoritative Geocoding & Route Calculation
      let geoData = null;
      try {
        geoData = await resolveTripGeography(params.from, params.to, controller.signal);
      } catch (geoErr) {
        if (controller.signal.aborted) return;
        setSearchError(geoErr.message || 'Geographic location could not be resolved. Please verify city spelling.');
        setLoading(false);
        setFlightLoading(false);
        setFlightStatus('idle');
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

      // Initialize the baseline trip with baselineMock before launching asynchronous flight/AI requests
      setActiveTrip(baselineMock);
      storage.setJSON('activePlan', baselineMock);

      // 3. Initiate provider-backed flight search if corridor supports commercial flights (>= 200 km)
      const currentFlightRequestId = ++flightRequestIdRef.current;
      latestFlightResultRef.current = { requestId: currentFlightRequestId, offers: null, status: null, provider: null };

      if (canFly) {
        const flightController = new AbortController();
        flightControllerRef.current = flightController;
        setFlightLoading(true);
        setFlightStatus('loading');
        setFlightError(null);

        const originCity = geoData?.fromLocation?.name || (typeof params.from === 'string' ? params.from.split(',')[0].trim() : params.from);
        const destCity = geoData?.toLocation?.name || (typeof params.to === 'string' ? params.to.split(',')[0].trim() : params.to);
        const passengersCount = parseInt(params.travelers, 10) || 1;

        searchFlights({
          origin: originCity,
          destination: destCity,
          date: params.date,
          returnDate: params.returnDate || null,
          passengers: passengersCount,
          cabin: 'economy',
          allowEstimate: false
        }, flightController.signal)
          .then(res => {
            if (flightController.signal.aborted) return;
            if (flightRequestIdRef.current !== currentFlightRequestId) return;
            const offers = Array.isArray(res?.offers) ? res.offers : [];
            const newStatus = offers.length > 0 ? 'success' : 'empty';
            latestFlightResultRef.current = {
              requestId: currentFlightRequestId,
              offers,
              status: res?.status || (offers.length > 0 ? 'CONFIRMED_OFFERS' : 'NO_FLIGHTS_FOUND'),
              provider: res?.provider || 'SerpApi'
            };

            setActiveTrip(prev => {
              if (flightRequestIdRef.current !== currentFlightRequestId) return prev;
              const targetTrip = prev || baselineMock;
              const updated = mergeFlightOffersIntoTrip(targetTrip, offers);
              storage.setJSON('activePlan', updated);
              return updated;
            });
            setFlightLoading(false);
            setFlightStatus(newStatus);
          })
          .catch(err => {
            if (flightController.signal.aborted) return;
            if (flightRequestIdRef.current !== currentFlightRequestId) return;
            console.warn('Flight provider query warning:', err?.message || err);
            setFlightError(err?.message || 'Could not retrieve live flight offers.');
            setFlightLoading(false);
            setFlightStatus('error');

            // Explicitly mark provider-error state
            latestFlightResultRef.current = {
              requestId: currentFlightRequestId,
              offers: [],
              status: 'PROVIDER_ERROR',
              provider: 'SerpApi'
            };

            // Replace baselineMock.options.flight with an empty array before storing or displaying the plan
            if (baselineMock?.options) {
              baselineMock.options.flight = [];
            }

            // Ensure activeTrip does not retain generated flight offers
            setActiveTrip(prev => {
              if (!prev || flightRequestIdRef.current !== currentFlightRequestId) return prev;
              const updated = {
                ...prev,
                options: {
                  ...prev.options,
                  flight: []
                }
              };
              storage.setJSON('activePlan', updated);
              return updated;
            });
          });
      } else {
        setFlightLoading(false);
        setFlightStatus('empty');
        setFlightError(null);
      }

      // 4. Enrich with AI itinerary if possible
      let aiEnrichedTrip = baselineMock;
      try {
        console.log('[Roamly Planner] Calling getAIGeneration with parameters:', {
          from: params.from,
          to: params.to,
          date: params.date,
          travelers: params.travelers,
          budget: params.budget,
          preferredMode: effectiveMode
        });
        const aiResult = await getAIGeneration({
          from: params.from,
          to: params.to,
          date: params.date,
          returnDate: params.returnDate,
          travelers: params.travelers,
          budget: params.budget,
          preferredMode: effectiveMode
        }, controller.signal);

        if (!controller.signal.aborted && aiResult && Array.isArray(aiResult.itinerary) && aiResult.itinerary.length > 0) {
          console.log('[Roamly Planner] AI generation successful. Source:', aiResult.source || 'ai', 'Days:', aiResult.itinerary.length);
          aiEnrichedTrip = {
            ...baselineMock,
            itinerary: aiResult.itinerary,
            summary: aiResult.summary || baselineMock.summary,
            isAIGenerated: true,
            source: 'ai',
            generationNotice: null
          };
        } else if (!controller.signal.aborted && aiResult?.isFallback) {
          console.warn('[Roamly Planner] AI returned fallback flag:', aiResult.message);
          aiEnrichedTrip = {
            ...baselineMock,
            isAIGenerated: false,
            source: 'deterministic',
            generationNotice: aiResult.message || 'Gemini quota reached or service busy.'
          };
        }
      } catch (aiErr) {
        if (controller.signal.aborted) return;
        console.warn('[Roamly Planner] AI Itinerary enrichment unavailable:', aiErr.message);

        let notice = 'AI service temporarily unavailable';
        if (aiErr?.code === 'AI_TIMEOUT' || aiErr?.code === 'REQUEST_TIMEOUT' || aiErr?.status === 408 || aiErr?.name === 'TimeoutError' || aiErr?.message?.toLowerCase().includes('timed out')) {
          notice = 'AI request timed out';
        } else if (aiErr?.code === 'NETWORK_UNAVAILABLE' || aiErr?.status === 503) {
          notice = 'Network unavailable';
        } else if (aiErr?.code === 'FORBIDDEN' || aiErr?.status === 403) {
          notice = 'AI service access restricted';
        } else if (aiErr?.code === 'RATE_LIMIT_EXCEEDED' || aiErr?.status === 429) {
          notice = 'AI rate limit reached';
        } else {
          console.warn('[Roamly Planner] Unrecognized AI error:', aiErr?.message || aiErr);
          notice = 'AI service temporarily unavailable';
        }

        aiEnrichedTrip = {
          ...baselineMock,
          isAIGenerated: false,
          source: 'deterministic',
          generationNotice: notice
        };
      }

      if (controller.signal.aborted) return;

      // Attach any resolved flight results if already arrived
      if (latestFlightResultRef.current.offers && latestFlightResultRef.current.status !== 'PROVIDER_ERROR') {
        aiEnrichedTrip = mergeFlightOffersIntoTrip(aiEnrichedTrip, latestFlightResultRef.current.offers);
      } else if (latestFlightResultRef.current.status === 'PROVIDER_ERROR') {
        aiEnrichedTrip = {
          ...aiEnrichedTrip,
          options: {
            ...aiEnrichedTrip.options,
            flight: []
          }
        };
      }

      setActiveTrip(aiEnrichedTrip);
      storage.setJSON('activePlan', aiEnrichedTrip);
      setLoading(false);

    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Plan calculation error:', err);
      setSearchError('An unexpected error occurred while calculating your itinerary. Please try again.');
      setLoading(false);
    }
  };

  const handleChangeItinerary = (newItinerary) => {
    setActiveTrip(prev => {
      if (!prev) return prev;
      const updated = { ...prev, itinerary: newItinerary };
      storage.setJSON('activePlan', updated);
      return updated;
    });
  };

  const handleSaveActiveTrip = async (forcedAuthUser = null, forcedAuthToken = null) => {
    const activeUser = forcedAuthUser || user;
    const activeToken = forcedAuthToken || token;

    if (!activeUser || !activeToken) {
      showNotification('info', 'Please sign in or create an account to save your travel itinerary.');
      openAuthModal(({ user: loggedUser, token: loggedToken }) => {
        handleSaveActiveTrip(loggedUser, loggedToken);
      });
      return;
    }

    if (!activeTrip || !activeTrip.from || !activeTrip.to) {
      showNotification('warning', 'Cannot save incomplete trip. Please plan a trip first.');
      return;
    }

    const localTrips = storage.getJSON('savedTrips', [], isValidTripsArray);
    const alreadySaved = localTrips.some(
      t => t?.from === activeTrip.from && t?.to === activeTrip.to && t?.date === activeTrip.date
    );

    if (alreadySaved) {
      showNotification('info', 'This trip plan is already saved in your dashboard history.');
      return;
    }

    const tripToSave = {
      ...activeTrip,
      transportMode: activeMode,
      userEmail: activeUser.email
    };

    setSavingTrip(true);
    try {
      const response = await createTrip(tripToSave, activeToken);

      if (response.ok) {
        const savedData = response.data;
        const effectiveTrip = savedData || { ...tripToSave, _id: `trip_${Date.now()}` };
        storage.setJSON('savedTrips', [effectiveTrip, ...localTrips]);
        setActiveTrip(prev => {
          const updated = { ...prev, _id: effectiveTrip._id };
          storage.setJSON('activePlan', updated);
          return updated;
        });
        showNotification('success', 'Trip itinerary successfully saved to your dashboard!');
        return;
      }

      if (response.status === 400) {
        let errorMsg = 'Invalid trip details. Please check your trip inputs.';
        if (response.data?.error) errorMsg = response.data.error;
        else if (response.data?.details?.[0]?.message) errorMsg = response.data.details[0].message;
        showNotification('error', `Could not save trip: ${errorMsg}`);
        return;
      }

      if (response.status === 401 || response.status === 403) {
        showNotification('warning', 'Your session has expired. Please sign in again to save your trip.');
        logout();
        openAuthModal(({ user: loggedUser, token: loggedToken }) => {
          handleSaveActiveTrip(loggedUser, loggedToken);
        });
        return;
      }

      if (response.status === 429) {
        showNotification('warning', 'Too many save requests. Please wait a moment before trying again.');
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
      setActiveTrip(prev => {
        const updated = { ...prev, _id: localSavedTrip._id };
        storage.setJSON('activePlan', updated);
        return updated;
      });
      showNotification('info', 'Trip itinerary saved locally (Offline Mode).');
    } finally {
      setSavingTrip(false);
    }
  };

  const handleBackToSearch = () => {
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
      searchControllerRef.current = null;
    }
    if (flightControllerRef.current) {
      flightControllerRef.current.abort();
      flightControllerRef.current = null;
    }
    flightRequestIdRef.current++;
    setFlightLoading(false);
    setFlightStatus('idle');
    setFlightError(null);
    setActiveTrip(null);
    setSearchError(null);
    setShowEditForm(false);
    storage.remove('activePlan');
    navigate('/plan');
  };

  // State: Loading saved trip from URL
  if (tripId && resolvingTrip) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 animate-fade-in">
        <div className="text-center space-y-3 py-6">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <h2 className="font-display font-bold text-xl text-slate-900">Loading Travel Plan...</h2>
          <p className="text-sm text-slate-500">Resolving itinerary details for trip #{tripId}</p>
        </div>
        <Card className="p-6 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  // State: Saved trip not found
  if (tripId && tripNotFound) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center animate-fade-in">
        <Card className="p-8 space-y-5 border-slate-200 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display font-bold text-2xl text-slate-900">Trip Not Found</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              We couldn't find a saved travel plan matching ID <code className="px-1.5 py-0.5 rounded bg-slate-100 text-blue-600 font-mono text-xs font-semibold">{tripId}</code>. It may have been deleted, or the URL might be incorrect.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto cursor-pointer"
            >
              View Saved Trips
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/plan')}
              className="w-full sm:w-auto cursor-pointer"
            >
              Create New Plan
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // State: Calculating / Generating Plan
  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6 animate-fade-in">
        <Card className="p-8 space-y-6 border-slate-200 shadow-sm bg-white">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <Compass className="w-14 h-14 text-blue-600 animate-spin-slow" />
            <Sparkles className="w-5 h-5 text-purple-600 absolute -top-1 -right-1 animate-bounce" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display font-bold text-xl text-slate-900">
              Generating Authentic Itinerary
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Resolving canonical coordinates, calculating real highway routes, and fetching mode-aware budgets...
            </p>
          </div>
          <div className="space-y-2 pt-2 text-left">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Querying transport options & live routes...</span>
            </div>
            <Skeleton className="h-2 w-full rounded" />
          </div>
        </Card>
      </div>
    );
  }

  const handleApplyAIPrompt = (promptText) => {
    const lower = promptText.toLowerCase();
    const now = new Date();
    const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    const dep = new Date(now);
    dep.setDate(now.getDate() + 7);
    const ret = new Date(dep);
    ret.setDate(dep.getDate() + 4);

    let f = 'Bengaluru';
    let t = 'Goa';
    let b = 45000;

    if (lower.includes('jaipur') || lower.includes('rajasthan')) {
      f = 'Delhi';
      t = 'Jaipur';
      b = 30000;
    } else if (lower.includes('manali') || lower.includes('himachal')) {
      f = 'Delhi';
      t = 'Chandigarh';
      b = 40000;
    } else if (lower.includes('kerala') || lower.includes('kochi')) {
      f = 'Bengaluru';
      t = 'Kochi';
      b = 35000;
    }

    setSuggestedValues({
      from: f,
      to: t,
      date: formatYMD(dep),
      returnDate: formatYMD(ret),
      travelers: 2,
      budget: b,
      preferredMode: 'flight'
    });
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  // State: Empty Planner / Fresh search
  if (!activeTrip) {
    return (
      <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 animate-fade-in">
        
        {/* Compact SaaS Header: "Plan Your Next Adventure with AI" */}
        <PlannerHeader />

        {/* Geographic or Search Resolution Notice */}
        {searchError && (
          <div
            role="alert"
            className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-amber-800 text-sm shadow-xs animate-fade-in"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h5 className="font-semibold text-slate-900 text-sm">Geographic Resolution Notice</h5>
                <p className="text-xs text-amber-700 mt-0.5">{searchError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSearchError(null)}
              className="text-xs text-amber-800 hover:text-amber-950 font-medium px-2.5 py-1 rounded bg-amber-100/80 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Primary Planning Experience Card with Mode Selector [ Structured Search | Ask AI ]
            Unifies previously separate PlanWithAICallout card into a single cohesive SaaS entry */}
        <TripConfigurationCard
          onSearch={handleSearch}
          onApplyPrompt={handleApplyAIPrompt}
          loading={loading}
          initialValues={suggestedValues}
        />

        {/* Travel Feature Strip (Live flight data, Curated itineraries, Maps, AI) */}
        <TravelFeatureStrip />

        {/* Inspiration / Quick Start Corridors with Photography */}
        <QuickStartSuggestions
          onSelectSuggestion={(values) => {
            setSuggestedValues(values);
            window.scrollTo({ top: 120, behavior: 'smooth' });
          }}
        />

      </div>
    );
  }

  // State: Generated Trip / Results View (Primary Flight Focus)
  return (
    <ErrorBoundary fallbackTitle="Travel Plan Error" onReset={handleBackToSearch}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-in">

        {/* Workflow Stage Progress Indicator: 1. Choose Transport → 2. Customize Itinerary */}
        <div className="flex items-center justify-between border-b border-slate-200/90 pb-3 flex-wrap gap-4">
          <nav aria-label="Trip planning workflow progress" className="flex items-center">
            <ol className="flex items-center gap-2 sm:gap-4 list-none m-0 p-0">
              {/* Step 1: Choose Transport */}
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('transport')}
                  aria-current={activeView === 'transport' ? 'step' : undefined}
                  className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer select-none text-left ${
                    activeView === 'transport'
                      ? 'bg-blue-50/80 border border-blue-200 text-blue-900 shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent text-slate-600'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors shrink-0 ${
                      activeView === 'transport'
                        ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-100'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {activeView === 'overview' ? <Check className="w-3.5 h-3.5" /> : '1'}
                  </span>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block leading-none font-mono">
                      Step 1
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-bold leading-tight block ${
                        activeView === 'transport' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
                      }`}
                    >
                      1. Choose Transport
                    </span>
                  </div>
                </button>
              </li>

              {/* Progress Connector / Divider */}
              <li aria-hidden="true" className="flex items-center gap-1">
                <div className="w-8 sm:w-12 h-1 bg-[#E7E5DF] rounded-full overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-300 ease-out ${
                      activeView === 'overview' ? 'w-full bg-[#2453FF]' : 'w-0 bg-[#2453FF]'
                    }`}
                  />
                </div>
                <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${activeView === 'overview' ? 'text-[#2453FF]' : 'text-[#737885]'}`} />
              </li>

              {/* Step 2: Customize Itinerary */}
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('overview')}
                  aria-current={activeView === 'overview' ? 'step' : undefined}
                  className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer select-none text-left ${
                    activeView === 'overview'
                      ? 'bg-[#2453FF]/8 border border-[#2453FF]/30 text-[#14171F] shadow-xs'
                      : 'hover:bg-[#FAFAF8] border border-transparent text-[#737885]'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors shrink-0 ${
                      activeView === 'overview'
                        ? 'bg-[#2453FF] text-white shadow-xs ring-2 ring-[#2453FF]/20'
                        : 'bg-[#E7E5DF] text-[#737885] group-hover:bg-[#E7E5DF]/80'
                    }`}
                  >
                    2
                  </span>
                  <div>
                    <span
                      className={`text-[10px] font-bold block leading-none font-mono ${
                        activeView === 'overview' ? 'text-[#2453FF]' : 'text-[#737885]'
                      }`}
                    >
                      Step 2
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-bold leading-tight block ${
                        activeView === 'overview' ? 'text-[#14171F]' : 'text-[#3E434D] group-hover:text-[#14171F]'
                      }`}
                    >
                      2. Customize Itinerary
                    </span>
                  </div>
                </button>
              </li>
            </ol>
          </nav>

          {/* Quick Context Action Button */}
          {activeView === 'transport' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView('overview')}
              className="cursor-pointer font-semibold text-xs flex items-center gap-1.5 hover:bg-[#FAFAF8] border-[#E7E5DF] text-[#14171F]"
            >
              <span>View Itinerary</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#2453FF]" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView('transport')}
              className="cursor-pointer font-semibold text-xs flex items-center gap-1.5 hover:bg-[#FAFAF8] border-[#E7E5DF] text-[#14171F]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#2453FF]" />
              <span>Change Transport</span>
            </Button>
          )}
        </div>

        {/* Collapsible Search Parameter Editor */}
        {showEditForm && (
          <div className="animate-fade-in pt-1">
            <TripConfigurationCard
              onSearch={handleSearch}
              loading={loading}
              initialValues={modifyInitialValues}
            />
          </div>
        )}

        {/* Informational banner when deterministic fallback was used */}
        {(activeTrip.source === 'deterministic' || (!activeTrip.isAIGenerated && activeTrip.source !== 'ai')) && activeTrip.generationNotice && (
          <div className="p-3.5 bg-[#E8A33D]/10 border border-[#E7E5DF] border-l-[3px] border-l-[#E8A33D] rounded-xl text-xs text-[#14171F] flex items-center gap-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#E8A33D]" />
            <span className="leading-relaxed">Notice: {activeTrip.generationNotice}. Displaying available flight options and deterministic itinerary.</span>
          </div>
        )}

        {/* In-App Notification Toast / Banner for State Feedback */}
        {saveNotification && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-xs animate-fade-in ${
              saveNotification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : saveNotification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : saveNotification.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {saveNotification.type === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              {saveNotification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {saveNotification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
              {saveNotification.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
              <span className="font-medium">{saveNotification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveNotification(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Stage View: 2. Trip Overview OR 1. Transport & Routes */}
        {activeView === 'overview' ? (
          <TripOverview
            trip={activeTrip}
            onEditTrip={() => setShowEditForm(!showEditForm)}
            onChangeItinerary={handleChangeItinerary}
            onSaveTrip={handleSaveActiveTrip}
            savingTrip={savingTrip}
            isSaved={Boolean(tripId || activeTrip?._id)}
            onViewTransport={() => setActiveView('transport')}
            onBackToTrips={() => navigate('/dashboard')}
            onRetry={() => {
              if (activeTrip) {
                handleSearch({
                  from: activeTrip.from,
                  to: activeTrip.to,
                  date: activeTrip.date,
                  returnDate: activeTrip.returnDate,
                  travelers: activeTrip.travelers,
                  budget: activeTrip.budget,
                  preferredMode: activeMode
                });
              }
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Trip Summary Header Bar with Modify Search & Save Plan */}
            <TripSummaryBar
              activeTrip={activeTrip}
              onBackToSearch={handleBackToSearch}
              onModifySearch={() => setShowEditForm(!showEditForm)}
              onSaveTrip={handleSaveActiveTrip}
              savingTrip={savingTrip}
              isSaved={Boolean(tripId || activeTrip?._id)}
            />

            {/* PRIMARY FOCAL CONTENT: Transport & Flight Results (3-Column Layout) */}
            <div className="p-5 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
              <div className="pb-4 mb-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 tracking-tight">
                    Available Transport &amp; Routes
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your preferred route. Flights are backed by Google Flights live schedules.
                  </p>
                </div>
              </div>

              <TravelOptions
                from={activeTrip.from}
                to={activeTrip.to}
                date={activeTrip.date}
                returnDate={activeTrip.returnDate}
                travelers={activeTrip.travelers}
                options={activeTrip.options}
                activeMode={activeMode}
                setActiveMode={handleSelectMode}
                flightLoading={flightLoading || flightStatus === 'loading'}
                flightStatus={flightStatus}
                flightError={flightError}
                onModifySearch={() => setShowEditForm(true)}
                onRetrySearch={() => {
                  if (activeTrip) {
                    handleSearch({
                      from: activeTrip.from,
                      to: activeTrip.to,
                      date: activeTrip.date,
                      returnDate: activeTrip.returnDate,
                      travelers: activeTrip.travelers,
                      budget: activeTrip.budget,
                      preferredMode: activeMode
                    });
                  }
                }}
                suggestions={activeTrip.suggestions}
                onSelectFlightOffer={(offer) => {
                  setActiveTrip(prev => {
                    if (!prev) return prev;
                    const remainingOffers = (prev.options?.flight || []).filter(f => f !== offer);
                    const updated = mergeFlightOffersIntoTrip(prev, [offer, ...remainingOffers]);
                    storage.setJSON('activePlan', updated);
                    return updated;
                  });
                  setActiveView('overview');
                }}
                onSelectTrainOffer={(train) => {
                  handleSelectMode('train');
                  setActiveTrip(prev => {
                    if (!prev) return prev;
                    const updated = { ...prev, selectedTrain: train };
                    storage.setJSON('activePlan', updated);
                    return updated;
                  });
                  setActiveView('overview');
                }}
                onSelectBusOffer={(bus) => {
                  handleSelectMode('bus');
                  setActiveTrip(prev => {
                    if (!prev) return prev;
                    const updated = { ...prev, selectedBus: bus };
                    storage.setJSON('activePlan', updated);
                    return updated;
                  });
                  setActiveView('overview');
                }}
              >
                <RoadTripDetails
                  tripData={activeTrip}
                  onSelectRoadRoute={(routeIndexOrObj) => {
                    handleSelectMode('own');
                    setActiveTrip(prev => {
                      if (!prev) return prev;
                      const routes = prev.options?.own?.routes || [];
                      let resolvedRoute = routeIndexOrObj;
                      let resolvedIndex = 0;
                      if (typeof routeIndexOrObj === 'number') {
                        resolvedIndex = routeIndexOrObj;
                        resolvedRoute = routes[routeIndexOrObj] || null;
                      } else if (routeIndexOrObj && typeof routeIndexOrObj === 'object') {
                        const foundIdx = routes.findIndex(r => r === routeIndexOrObj);
                        resolvedIndex = foundIdx >= 0 ? foundIdx : 0;
                        resolvedRoute = routeIndexOrObj;
                      }
                      const updated = {
                        ...prev,
                        selectedRoute: resolvedRoute,
                        selectedRouteIndex: resolvedIndex
                      };
                      storage.setJSON('activePlan', updated);
                      return updated;
                    });
                    setActiveView('overview');
                  }}
                />
              </TravelOptions>
            </div>

            {/* Prompt to Continue to Itinerary */}
            <div className="p-4 sm:p-5 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <h4 className="font-bold text-sm text-blue-950">Ready to explore your daily itinerary?</h4>
                <p className="text-xs text-blue-800">Review your timeline, day-by-day sightseeing, route map, and budget breakdown.</p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => setActiveView('overview')}
                className="cursor-pointer font-semibold px-5 shrink-0 shadow-xs flex items-center gap-2"
              >
                <span>Continue to Trip Overview</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Floating Chat Assistant */}
        <ChatAssistant tripData={activeTrip} />

      </div>
    </ErrorBoundary>
  );
}
