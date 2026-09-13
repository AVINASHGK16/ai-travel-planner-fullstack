import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Compass, Sparkles, AlertTriangle, Loader2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  PlannerHeader, 
  TripConfigurationCard, 
  QuickStartSuggestions, 
  TripSummaryBar,
  TravelFeatureStrip
} from '../components/planner';
import SmartSuggestions from '../components/SmartSuggestions';
import TravelOptions from '../components/TravelOptions';
import RoadTripDetails from '../components/RoadTripDetails';
import WeatherInfo from '../components/WeatherInfo';
import BudgetCalculator from '../components/BudgetCalculator';
import ItineraryGenerator from '../components/ItineraryGenerator';
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
  const [flightError, setFlightError] = useState(null);
  const [savingTrip, setSavingTrip] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [activeTrip, setActiveTrip] = useState(() => {
    if (tripId) return null;
    return storage.getJSON('activePlan', null);
  });
  const [activeMode, setActiveMode] = useState('flight');
  const [suggestedValues, setSuggestedValues] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

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
    setSearchError(null);
    setShowEditForm(false);

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

      // 3. Initiate provider-backed flight search if corridor supports commercial flights (>= 200 km)
      const currentFlightRequestId = ++flightRequestIdRef.current;
      latestFlightResultRef.current = { requestId: currentFlightRequestId, offers: null, status: null, provider: null };

      if (canFly) {
        const flightController = new AbortController();
        flightControllerRef.current = flightController;
        setFlightLoading(true);
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
            latestFlightResultRef.current = {
              requestId: currentFlightRequestId,
              offers,
              status: res?.status || (offers.length > 0 ? 'CONFIRMED_OFFERS' : 'NO_FLIGHTS_FOUND'),
              provider: res?.provider || 'SerpApi'
            };

            setActiveTrip(prev => {
              if (!prev || flightRequestIdRef.current !== currentFlightRequestId) return prev;
              const updated = mergeFlightOffersIntoTrip(prev, offers);
              storage.setJSON('activePlan', updated);
              return updated;
            });
            setFlightLoading(false);
          })
          .catch(err => {
            if (flightController.signal.aborted) return;
            if (flightRequestIdRef.current !== currentFlightRequestId) return;
            console.warn('Flight provider query warning:', err?.message || err);
            setFlightError(err?.message || 'Could not retrieve live flight offers.');
            setFlightLoading(false);

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
        setFlightError(null);
      }

      // 4. Enrich with AI itinerary if possible
      let aiEnrichedTrip = baselineMock;
      try {
        const aiResult = await getAIGeneration(
          params.from,
          params.to,
          params.date,
          params.travelers,
          params.budget,
          controller.signal
        );

        if (!controller.signal.aborted && aiResult && Array.isArray(aiResult.itinerary) && aiResult.itinerary.length > 0) {
          aiEnrichedTrip = {
            ...baselineMock,
            itinerary: aiResult.itinerary,
            isAIGenerated: true,
            generationNotice: null
          };
        } else if (!controller.signal.aborted && aiResult?.isFallback) {
          aiEnrichedTrip = {
            ...baselineMock,
            generationNotice: aiResult.message || 'Gemini quota reached or service busy.'
          };
        }
      } catch (aiErr) {
        if (controller.signal.aborted) return;
        console.warn('AI Itinerary enrichment unavailable:', aiErr.message);
        aiEnrichedTrip = {
          ...baselineMock,
          generationNotice: 'Deterministic itinerary loaded (AI offline).'
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

  const handleSaveActiveTrip = async () => {
    if (!user || !token) {
      alert('Please sign in or create an account to save your travel itinerary.');
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
    if (flightControllerRef.current) {
      flightControllerRef.current.abort();
      flightControllerRef.current = null;
    }
    flightRequestIdRef.current++;
    setFlightLoading(false);
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

        {/* Trip Summary Header Bar with Modify Search & Save Plan */}
        <TripSummaryBar
          activeTrip={activeTrip}
          onBackToSearch={handleBackToSearch}
          onModifySearch={() => setShowEditForm(!showEditForm)}
          onSaveTrip={handleSaveActiveTrip}
          savingTrip={savingTrip}
        />

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
        {!activeTrip.isAIGenerated && activeTrip.generationNotice && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Notice: {activeTrip.generationNotice}. Displaying available flight options and deterministic itinerary.</span>
          </div>
        )}

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
            flightLoading={flightLoading}
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
                const updated = mergeFlightOffersIntoTrip(prev, [offer, ...(prev.options?.flight || []).filter(f => f.id !== offer.id)]);
                storage.setJSON('activePlan', updated);
                return updated;
              });
            }}
          >
            <RoadTripDetails tripData={activeTrip} />
          </TravelOptions>
        </div>

        {/* SECONDARY SECTION: Day-by-day Itinerary & Destination Logistics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pt-2">
          
          {/* Left Column: Itinerary Details */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-5 sm:p-6 rounded-xl bg-white border border-slate-200/90 shadow-xs">
              <ItineraryGenerator
                itinerary={activeTrip.itinerary}
                onChangeItinerary={handleChangeItinerary}
              />
            </div>
          </div>

          {/* Right Column: Destination Weather & Budget Details */}
          <div className="lg:col-span-4 space-y-6">
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
