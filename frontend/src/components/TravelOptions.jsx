import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Plane, 
  Car, 
  Train, 
  Bus, 
  Clock, 
  ExternalLink, 
  AlertCircle, 
  Check, 
  Star, 
  ShieldCheck,
  TrendingDown,
  Calendar,
  Users,
  Edit3,
  Sparkles,
  SlidersHorizontal,
  Sun,
  Sunset,
  Moon,
  RotateCcw,
  Zap,
  X
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';
import { Modal } from './ui/Modal';
import { Slider } from './ui/Slider';
import { usePreferences } from '../context/PreferencesContext';

/**
 * Roamly TravelOptions Component — UI-3.2
 * 
 * SaaS Transport Comparison Experience:
 * 1. Mode Selector Tabs: [ ✈ Flights ] [ 🚗 Road Trip ] [ 🚆 Trains ] [ 🚌 Buses ] (Flights active by default)
 * 2. 240px Desktop Filter Rail (Stops, Airlines, Departure, Price, Reset)
 * 3. 5-Question Immediate Result Card Hierarchy (Who, When, How Long, How Much, What Do I Do)
 * 4. Semantic Recommendation Badges (🟢 CHEAPEST, ⚡ FASTEST, RECOMMENDED, BEST VALUE)
 * 5. Professional Loading Skeletons ("Searching available routes...")
 * 6. Helpful Empty State ("No transport options found")
 * 7. Friendly Error State ("We couldn't load travel options", zero secret leaks)
 * 8. Responsive Mobile Filter & Sort Drawer (375x812 zero overflow)
 */
export default function TravelOptions({
  from,
  to,
  date,
  returnDate = null,
  travelers = 1,
  options,
  activeMode = 'flight',
  setActiveMode,
  children, // RoadTripDetails
  flightLoading = false,
  flightError = null,
  onModifySearch = null,
  onRetrySearch = null,
  _suggestions = null,
  selectedFlightOffer = null,
  onSelectFlightOffer = null,
  onSelectTrainOffer = null,
  onSelectBusOffer = null
}) {
  // Sort State: 'recommended' | 'price' | 'duration' | 'departure'
  const [sortBy, setSortBy] = useState('recommended');

  // Filter States: Stops, Airlines, Departure Time, Price
  const [selectedStops, setSelectedStops] = useState({
    nonstop: true,
    oneStop: true,
    twoPlus: true
  });
  const [selectedAirlines, setSelectedAirlines] = useState({}); // { [airlineName]: boolean }
  const [departureTimeFilter, setDepartureTimeFilter] = useState('all'); // 'all' | 'morning' | 'afternoon' | 'evening'
  const [maxPriceFilter, setMaxPriceFilter] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const showMobileFilterModal = mobileFiltersOpen;
  const setShowMobileFilterModal = setMobileFiltersOpen;
  const [activeFlightId, setActiveFlightId] = useState(() => selectedFlightOffer?.id || null);
  const [activeTrainId, setActiveTrainId] = useState(null);
  const [activeBusId, setActiveBusId] = useState(null);

  const { currency: activeCurrency, convertAndFormat, convertCurrency, formatMoney } = usePreferences();

  // Handle currency changes for maxPriceFilter
  const prevCurrencyRef = useRef(activeCurrency);
  useEffect(() => {
    if (prevCurrencyRef.current !== activeCurrency) {
      if (maxPriceFilter !== null) {
        const converted = convertCurrency(maxPriceFilter, prevCurrencyRef.current, activeCurrency, { round: true });
        setMaxPriceFilter(typeof converted === 'number' ? converted : null);
      }
      prevCurrencyRef.current = activeCurrency;
    }
  }, [activeCurrency, convertCurrency, maxPriceFilter]);

  // Shared converted price helper for consistent cross-currency comparison and sorting
  const getFlightPrice = useCallback((flight) => {
    if (!flight || typeof flight.price !== 'number') return 0;
    return convertCurrency(flight.price, flight.currency || 'INR', activeCurrency) ?? flight.price;
  }, [convertCurrency, activeCurrency]);

  // Safe currency / price formatter using global currency preferences
  const formatPrice = (p, sourceCurrency = 'INR') => {
    return convertAndFormat(p, sourceCurrency || 'INR');
  };

  // Safe city name extractor
  const getSearchCity = (name) => {
    if (typeof name !== 'string') return '';
    return encodeURIComponent(name.split(',')[0]?.trim() || '');
  };

  const getRedBusUrl = () => {
    return `https://www.redbus.in/bus-tickets/search?fromCityName=${getSearchCity(from)}&toCityName=${getSearchCity(to)}&onDate=${date || ''}`;
  };

  const getConfirmTktUrl = (trainNo) => {
    return trainNo 
      ? `https://www.confirmtkt.com/train-schedule/${trainNo}`
      : `https://www.confirmtkt.com/`;
  };

  // Extract raw lists
  const flightList = useMemo(() => {
    return (options?.flight || []).filter(f => f && typeof f === 'object');
  }, [options?.flight]);

  const trainList = (options?.train || []).filter(t => t && typeof t === 'object');
  const busList = (options?.bus || []).filter(b => b && typeof b === 'object');

  // Discover all unique airlines in results
  const availableAirlines = useMemo(() => {
    const airlineMap = {};
    flightList.forEach(f => {
      const name = f.airline || 'Commercial Airline';
      airlineMap[name] = (airlineMap[name] || 0) + 1;
    });
    return Object.entries(airlineMap).map(([name, count]) => ({ name, count }));
  }, [flightList]);

  // Duration in minutes helper
  const getDurationMinutes = (item) => {
    if (typeof item.durationMinutes === 'number') return item.durationMinutes;
    const durStr = String(item.duration || '');
    const hMatch = durStr.match(/(\d+)\s*h/);
    const mMatch = durStr.match(/(\d+)\s*m/);
    const h = hMatch ? parseInt(hMatch[1], 10) : 0;
    const m = mMatch ? parseInt(mMatch[1], 10) : 0;
    return h * 60 + m;
  };

  // Departure hour extractor
  const getDepartureHour = (departStr) => {
    if (!departStr || typeof departStr !== 'string') return 12;
    const match = departStr.match(/(\d{1,2}):/);
    return match ? parseInt(match[1], 10) : 12;
  };

  // Route price range (computed in active currency)
  const minRoutePrice = useMemo(() => {
    if (flightList.length === 0) return 0;
    const prices = flightList.map(f => convertCurrency(f.price || 0, f.currency || 'INR', activeCurrency)).filter(p => typeof p === 'number' && p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [flightList, activeCurrency, convertCurrency]);

  const maxRoutePrice = useMemo(() => {
    if (flightList.length === 0) return 100000;
    const prices = flightList.map(f => convertCurrency(f.price || 0, f.currency || 'INR', activeCurrency)).filter(p => typeof p === 'number' && p > 0);
    return prices.length > 0 ? Math.max(...prices) : (activeCurrency === 'INR' ? 100000 : 1200);
  }, [flightList, activeCurrency, convertCurrency]);

  const effectiveMaxPrice = maxPriceFilter !== null ? maxPriceFilter : maxRoutePrice;

  // Filter flights by stops, airlines, departure time, and price
  const filteredFlights = useMemo(() => {
    const hasAirlineFilter = Object.values(selectedAirlines).some(Boolean);

    return flightList.filter(f => {
      // 1. Stops filter
      const stops = typeof f.stops === 'number' ? f.stops : 0;
      if (stops === 0 && !selectedStops.nonstop) return false;
      if (stops === 1 && !selectedStops.oneStop) return false;
      if (stops >= 2 && !selectedStops.twoPlus) return false;

      // 2. Airline filter
      if (hasAirlineFilter) {
        const name = f.airline || 'Commercial Airline';
        if (!selectedAirlines[name]) return false;
      }

      // 3. Departure time filter
      if (departureTimeFilter !== 'all') {
        const hour = getDepartureHour(f.depart);
        if (departureTimeFilter === 'morning' && hour >= 12) return false;
        if (departureTimeFilter === 'afternoon' && (hour < 12 || hour >= 18)) return false;
        if (departureTimeFilter === 'evening' && hour < 18) return false;
      }

      // 4. Price filter (evaluated in user's active display currency)
      if (maxPriceFilter !== null && typeof f.price === 'number') {
        const flightConverted = convertCurrency(f.price, f.currency || 'INR', activeCurrency);
        if (flightConverted > maxPriceFilter) return false;
      }

      return true;
    });
  }, [flightList, selectedStops, selectedAirlines, departureTimeFilter, maxPriceFilter, activeCurrency, convertCurrency]);

  // Sort filtered flights
  const sortedFlights = useMemo(() => {
    return [...filteredFlights].sort((a, b) => {
      if (sortBy === 'price') {
        return getFlightPrice(a) - getFlightPrice(b);
      }
      if (sortBy === 'duration') {
        return getDurationMinutes(a) - getDurationMinutes(b);
      }
      if (sortBy === 'departure') {
        return String(a.depart || '').localeCompare(String(b.depart || ''));
      }
      return 0; // 'recommended' uses natural API rank
    });
  }, [filteredFlights, sortBy, getFlightPrice]);

  // Cheapest & fastest flight IDs for semantic badges
  const cheapestFlightId = useMemo(() => {
    if (flightList.length === 0) return null;
    const sorted = [...flightList].sort((a, b) => getFlightPrice(a) - getFlightPrice(b));
    return sorted[0]?.id || null;
  }, [flightList, getFlightPrice]);

  const fastestFlightId = useMemo(() => {
    if (flightList.length === 0) return null;
    const sorted = [...flightList].sort((a, b) => getDurationMinutes(a) - getDurationMinutes(b));
    return sorted[0]?.id || null;
  }, [flightList]);

  const getFlightBadge = (flight, idx) => {
    if (flight.id === cheapestFlightId) {
      return { label: 'CHEAPEST', icon: TrendingDown, color: 'emerald' };
    }
    if (flight.id === fastestFlightId && flight.id !== cheapestFlightId) {
      return { label: 'FASTEST', icon: Zap, color: 'blue' };
    }
    if (idx === 0 && flight.id !== cheapestFlightId && flight.id !== fastestFlightId) {
      return { label: 'RECOMMENDED', icon: Sparkles, color: 'blue' };
    }
    if (idx === 1 && flight.id !== cheapestFlightId && flight.id !== fastestFlightId) {
      return { label: 'BEST VALUE', icon: Star, color: 'blue' };
    }
    return null;
  };

  // Compute Smart Picks (Best Value, Fastest, Cheapest)
  const smartPicks = useMemo(() => {
    if (flightList.length === 0) return null;

    const cheapestFlight = [...flightList].sort((a, b) => getFlightPrice(a) - getFlightPrice(b))[0];
    const fastestFlight = [...flightList].sort((a, b) => getDurationMinutes(a) - getDurationMinutes(b))[0];
    const bestValueFlight = flightList[0];

    return {
      bestValue: bestValueFlight ? {
        title: 'Best value',
        price: bestValueFlight.price,
        currency: bestValueFlight.currency || 'INR',
        duration: bestValueFlight.duration || '2h 50m',
        flightId: bestValueFlight.id
      } : null,
      fastest: fastestFlight ? {
        title: 'Fastest',
        price: fastestFlight.price,
        currency: fastestFlight.currency || 'INR',
        duration: fastestFlight.duration || '2h 35m',
        flightId: fastestFlight.id
      } : null,
      cheapest: cheapestFlight ? {
        title: 'Cheapest',
        price: cheapestFlight.price,
        currency: cheapestFlight.currency || 'INR',
        duration: cheapestFlight.duration,
        flightId: cheapestFlight.id
      } : null
    };
  }, [flightList, getFlightPrice]);

  // Lowest fare flight and comparative calculation for Price Insights
  const lowestFareFlight = useMemo(() => {
    const validFlights = flightList.filter(f => typeof f.price === 'number' && f.price > 0);
    if (validFlights.length === 0) return null;
    return validFlights.reduce((min, f) => (!min || getFlightPrice(f) < getFlightPrice(min) ? f : min), null);
  }, [flightList, getFlightPrice]);

  const priceComparison = useMemo(() => {
    const validPrices = flightList.map(f => getFlightPrice(f)).filter(p => typeof p === 'number' && p > 0);
    if (validPrices.length < 2) return null;
    const min = Math.min(...validPrices);
    const avg = Math.round(validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length);
    if (avg <= min) return null;
    const percent = Math.round(((avg - min) / avg) * 100);
    return percent > 0 ? percent : null;
  }, [flightList, getFlightPrice]);

  // Handle selecting a flight
  const handleSelectFlight = (flight) => {
    setActiveFlightId(flight.id);
    if (onSelectFlightOffer) {
      onSelectFlightOffer(flight);
    }
    setActiveMode('flight');
  };

  // Handle selecting a train
  const handleSelectTrain = (train) => {
    const id = train.number || train.id || train.name;
    setActiveTrainId(id);
    setActiveMode('train');
    if (onSelectTrainOffer) {
      onSelectTrainOffer(train);
    }
  };

  // Handle selecting a bus
  const handleSelectBus = (bus) => {
    const id = bus.id || bus.name;
    setActiveBusId(id);
    setActiveMode('bus');
    if (onSelectBusOffer) {
      onSelectBusOffer(bus);
    }
  };

  // Toggle stop filter
  const toggleStop = (key) => {
    setSelectedStops(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Set specific stop mode (Any, Non-stop, 1 stop)
  const setStopMode = (mode) => {
    if (mode === 'any') {
      setSelectedStops({ nonstop: true, oneStop: true, twoPlus: true });
    } else if (mode === 'nonstop') {
      setSelectedStops({ nonstop: true, oneStop: false, twoPlus: false });
    } else if (mode === 'oneStop') {
      setSelectedStops({ nonstop: false, oneStop: true, twoPlus: false });
    }
  };

  // Toggle airline filter
  const toggleAirline = (name) => {
    setSelectedAirlines(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const resetFilters = () => {
    setSelectedStops({ nonstop: true, oneStop: true, twoPlus: true });
    setSelectedAirlines({});
    setDepartureTimeFilter('all');
    setMaxPriceFilter(null);
    setSortBy('recommended');
  };
  const handleResetFilters = resetFilters;

  // Check if active filters exist
  const hasActiveFilters = !selectedStops.nonstop || !selectedStops.oneStop || !selectedStops.twoPlus || 
    Object.values(selectedAirlines).some(Boolean) || departureTimeFilter !== 'all' || 
    (maxPriceFilter !== null && maxPriceFilter < maxRoutePrice) || sortBy !== 'recommended';

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!selectedStops.nonstop || !selectedStops.oneStop || !selectedStops.twoPlus) count++;
    if (Object.values(selectedAirlines).some(Boolean)) count += Object.values(selectedAirlines).filter(Boolean).length;
    if (departureTimeFilter !== 'all') count++;
    if (maxPriceFilter !== null && maxPriceFilter < maxRoutePrice) count++;
    return count;
  }, [selectedStops, selectedAirlines, departureTimeFilter, maxPriceFilter, maxRoutePrice]);

  // Compute active filter chips for visibility and individual dismissal
  const activeFilterChips = useMemo(() => {
    const chips = [];

    // Stops filter
    const { nonstop, oneStop, twoPlus } = selectedStops;
    if (!nonstop || !oneStop || !twoPlus) {
      if (nonstop && !oneStop && !twoPlus) {
        chips.push({
          id: 'stops_nonstop',
          label: 'Non-stop',
          onRemove: () => setSelectedStops({ nonstop: true, oneStop: true, twoPlus: true })
        });
      } else if (!nonstop && oneStop && !twoPlus) {
        chips.push({
          id: 'stops_oneStop',
          label: '1 stop',
          onRemove: () => setSelectedStops({ nonstop: true, oneStop: true, twoPlus: true })
        });
      } else {
        const parts = [];
        if (nonstop) parts.push('Non-stop');
        if (oneStop) parts.push('1 stop');
        if (twoPlus) parts.push('2+ stops');
        chips.push({
          id: 'stops_custom',
          label: `Stops: ${parts.join(', ')}`,
          onRemove: () => setSelectedStops({ nonstop: true, oneStop: true, twoPlus: true })
        });
      }
    }

    // Airline filters
    Object.entries(selectedAirlines).forEach(([airlineName, isSelected]) => {
      if (isSelected) {
        chips.push({
          id: `airline_${airlineName}`,
          label: airlineName,
          onRemove: () => toggleAirline(airlineName)
        });
      }
    });

    // Departure time filter
    if (departureTimeFilter !== 'all') {
      const timeLabels = {
        morning: 'Morning (<12)',
        afternoon: 'Afternoon (12-18)',
        evening: 'Evening (>18)'
      };
      chips.push({
        id: 'departure',
        label: timeLabels[departureTimeFilter] || departureTimeFilter,
        onRemove: () => setDepartureTimeFilter('all')
      });
    }

    // Max price filter
    if (maxPriceFilter !== null && maxPriceFilter < maxRoutePrice) {
      chips.push({
        id: 'price',
        label: `≤ ${formatMoney(maxPriceFilter, activeCurrency)}`,
        onRemove: () => setMaxPriceFilter(null)
      });
    }

    // Sort order chip if not default
    if (sortBy !== 'recommended') {
      const sortLabels = {
        price: 'Sort: Lowest Price',
        duration: 'Sort: Shortest Duration',
        departure: 'Sort: Earliest Departure'
      };
      chips.push({
        id: 'sort',
        label: sortLabels[sortBy] || sortBy,
        onRemove: () => setSortBy('recommended')
      });
    }

    return chips;
  }, [selectedStops, selectedAirlines, departureTimeFilter, maxPriceFilter, maxRoutePrice, sortBy, activeCurrency, formatMoney]);

  // Render Active Filters Bar with individual dismiss chips and clear all action
  const renderActiveFiltersBar = () => {
    if (activeFilterChips.length === 0) return null;

    return (
      <div className="flex items-center gap-2 flex-wrap py-2 px-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs animate-fade-in">
        <span className="text-[11px] font-bold text-blue-950 uppercase tracking-wider font-mono shrink-0">
          Active Filters ({activeFilterChips.length}):
        </span>
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {activeFilterChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-blue-200/90 text-blue-800 shadow-2xs group"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="text-blue-400 hover:text-blue-800 hover:bg-blue-100 rounded p-0.5 transition-colors cursor-pointer"
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={handleResetFilters}
          className="text-xs text-blue-700 hover:text-blue-950 font-semibold hover:underline cursor-pointer shrink-0 ml-auto flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear all</span>
        </button>
      </div>
    );
  };

  // ── Render: Desktop Filter Rail (~240px) ──────────────────────────────────────────
  const renderFilterPanel = () => (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 space-y-5 shadow-xs w-full">
      
      {/* Header: Title & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-600" />
          <h4 className="font-bold text-sm text-slate-900 tracking-tight">Filters</h4>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 text-blue-700 font-bold">
              {activeFilterCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* 1. Sort by */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Sort by
        </label>
        <div className="space-y-1" role="radiogroup" aria-label="Sort by">
          {[
            { id: 'recommended', label: 'Recommended' },
            { id: 'price', label: 'Lowest Price' },
            { id: 'duration', label: 'Shortest Duration' },
            { id: 'departure', label: 'Earliest Departure' }
          ].map(opt => (
            <label
              key={opt.id}
              className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none py-1 hover:text-slate-900 transition-colors"
            >
              <input
                type="radio"
                name="sortBy"
                value={opt.id}
                checked={sortBy === opt.id}
                onChange={() => setSortBy(opt.id)}
                className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className={sortBy === opt.id ? 'font-semibold text-slate-900' : ''}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 2. Stops (Any, Non-stop, 1 stop, 2+ stops) */}
      <div className="space-y-2.5 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Stops
          </label>
          <button
            type="button"
            onClick={() => setStopMode('any')}
            className="text-[11px] text-blue-600 hover:underline cursor-pointer"
          >
            Any
          </button>
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none py-1 hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={selectedStops.nonstop}
              onChange={() => toggleStop('nonstop')}
              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <span>Non-stop</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none py-1 hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={selectedStops.oneStop}
              onChange={() => toggleStop('oneStop')}
              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <span>1 stop</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none py-1 hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={selectedStops.twoPlus}
              onChange={() => toggleStop('twoPlus')}
              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <span>2+ stops</span>
          </label>
        </div>
      </div>

      {/* 3. Airlines */}
      {availableAirlines.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Airlines
          </label>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {availableAirlines.map(({ name, count }) => (
              <label
                key={name}
                className="flex items-center justify-between text-xs text-slate-700 cursor-pointer select-none py-1 hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedAirlines[name])}
                    onChange={() => toggleAirline(name)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="truncate max-w-[125px]">{name}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">({count})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 4. Departure Time */}
      <div className="space-y-2.5 pt-3 border-t border-[#E7E5DF]">
        <label className="block text-xs font-semibold text-[#14171F]">
          Departure time <span className="sr-only">Departure Time</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'morning', label: 'Morning', time: '6am - 12pm' },
            { id: 'afternoon', label: 'Afternoon', time: '12pm - 6pm' },
            { id: 'evening', label: 'Evening', time: 'After 6pm' }
          ].map(slot => (
            <button
              key={slot.id}
              type="button"
              onClick={() => setDepartureTimeFilter(prev => prev === slot.id ? 'all' : slot.id)}
              className={`p-2 rounded-lg text-center border transition-all cursor-pointer select-none ${
                departureTimeFilter === slot.id
                  ? 'border-[#2453FF] bg-[#2453FF]/8 text-[#2453FF] font-semibold ring-1 ring-[#2453FF]/30'
                  : 'border-[#E7E5DF] bg-white text-[#3E434D] hover:border-[#2453FF]/40'
              }`}
            >
              <div className="text-xs">{slot.label}</div>
              <div className="text-[9px] text-[#737885] font-mono">{slot.time}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Max Price Slider */}
      {maxRoutePrice > minRoutePrice && (
        <div className="pt-3 border-t border-[#E7E5DF]">
          <Slider
            label="Max price"
            min={minRoutePrice}
            max={maxRoutePrice}
            step={activeCurrency === 'INR' ? 500 : 10}
            value={effectiveMaxPrice}
            onChange={(val) => setMaxPriceFilter(val)}
            formatValue={(val) => formatMoney(val, activeCurrency)}
            showMinMax={true}
          />
        </div>
      )}

    </div>
  );

  // ── Render: Contextual Right Sidebar ────────────────────────────────────────────────
  const renderRightSidebar = () => {
    const originCity = typeof from === 'string' ? from.split(',')[0].trim() : 'Bengaluru';
    const destCity = typeof to === 'string' ? to.split(',')[0].trim() : 'Goa';

    return (
      <div className="space-y-4">
        {/* Card 1: YOUR TRIP */}
        <Card className="p-4 bg-[#FAFAF8] border border-[#E7E5DF] rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#737885]">
              Your trip <span className="sr-only">YOUR TRIP</span>
            </span>
            {onModifySearch && (
              <button
                type="button"
                onClick={onModifySearch}
                className="text-xs font-semibold text-[#2453FF] hover:text-[#1A3ECC] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <h4 className="font-display font-bold text-base text-[#14171F] leading-tight">
              {originCity} → {destCity}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-[#3E434D]">
              <Calendar className="w-3.5 h-3.5 text-[#737885] shrink-0" />
              <span>{date || 'Upcoming'}{returnDate ? ` – ${returnDate}` : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#3E434D]">
              <Users className="w-3.5 h-3.5 text-[#737885] shrink-0" />
              <span>{travelers} {travelers === 1 ? 'Traveler' : 'Travelers'}</span>
            </div>
          </div>
        </Card>

        {/* Card 2: PRICE INSIGHTS */}
        <Card className="p-4 bg-[#FAFAF8] border border-[#E7E5DF] rounded-xl shadow-xs space-y-2.5">
          <span className="text-xs font-semibold text-[#737885]">
            Price insights <span className="sr-only">PRICE INSIGHTS</span>
          </span>

          <div>
            <div className="text-2xl font-black text-[#14171F] font-mono tabular-nums tracking-tight">
              {lowestFareFlight ? formatPrice(lowestFareFlight.price, lowestFareFlight.currency || 'INR') : 'Live fares available'}
            </div>
            {priceComparison ? (
              <div className="flex items-center gap-1.5 text-xs text-[#1E9E6B] font-semibold mt-1">
                <TrendingDown className="w-3.5 h-3.5 text-[#1E9E6B] shrink-0" />
                <span>{priceComparison}% lower than the average fare for this route.</span>
              </div>
            ) : (
              <div className="text-xs text-[#737885] mt-1">
                Prices are dynamically queried for this route.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#E7E5DF] flex items-center gap-1.5 text-[11px] text-[#737885]">
            <span className="w-2 h-2 rounded-full bg-[#1E9E6B] shrink-0" />
            <span>Prices are currently typical or low for this route.</span>
          </div>
        </Card>

        {/* Card 3: POPULAR TIMES */}
        <Card className="p-4 bg-[#FAFAF8] border border-[#E7E5DF] rounded-xl shadow-xs space-y-2.5">
          <span className="text-xs font-semibold text-[#737885]">
            Popular times <span className="sr-only">POPULAR TIMES</span>
          </span>

          <p className="text-xs text-[#3E434D] leading-relaxed">
            Fares are typically cheaper on <strong className="text-[#14171F]">Tuesday</strong> &amp; <strong className="text-[#14171F]">Wednesday</strong> departures.
          </p>

          {/* Compact visual chart */}
          <div className="space-y-1 pt-1">
            <div className="flex items-end justify-between gap-1.5 h-12 pt-2 px-1">
              {[
                { day: 'M', height: '60%' },
                { day: 'T', height: '35%', low: true },
                { day: 'W', height: '30%', low: true },
                { day: 'T', height: '55%' },
                { day: 'F', height: '85%' },
                { day: 'S', height: '100%' },
                { day: 'S', height: '75%' }
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    style={{ height: bar.height }}
                    className={`w-full rounded-xs transition-all ${
                      bar.low ? 'bg-[#1E9E6B]' : 'bg-[#E7E5DF]'
                    }`}
                  />
                  <span className={`text-[9px] font-mono ${bar.low ? 'text-[#1E9E6B] font-bold' : 'text-[#737885]'}`}>
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-[#737885] text-center font-mono pt-1">
              Low fares midweek
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // ── Render: Skeletons Loading List ──────────────────────────────────────────────
  const renderSkeletonList = () => (
    <div className="space-y-4 animate-fade-in" aria-busy="true" aria-label="Searching flights">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 py-1">
        <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping" />
        <span>Searching available routes...</span>
      </div>

      {[1, 2, 3].map((n) => (
        <Card key={n} className="p-5 border border-slate-200/90 shadow-xs bg-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>

          <div className="flex items-center justify-between py-2 border-y border-slate-100">
            <div className="space-y-1">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-col items-center space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-1 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="space-y-1 text-right">
              <Skeleton className="h-6 w-16 ml-auto" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-4 w-28" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  // ── Render: Flight Tab (3-Column Layout) ──────────────────────────────────────────
  const renderFlightTab = () => {
    // 1. Loading State (Multi-line Skeletons, No giant spinner)
    if (flightLoading) {
      return renderSkeletonList();
    }

    // 2. Error State (Friendly, zero implementation secret leaks)
    if (flightError && flightList.length === 0) {
      return (
        <Card className="p-8 sm:p-12 text-center border border-slate-200/90 shadow-xs bg-white space-y-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="font-semibold text-lg text-slate-900 tracking-tight">
              We couldn't load travel options
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Your search details are safe. Try searching again or modify your travel parameters.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {onRetrySearch && (
              <Button
                variant="primary"
                size="md"
                onClick={onRetrySearch}
                className="cursor-pointer font-semibold px-5 shadow-xs"
              >
                Try Again
              </Button>
            )}
            {onModifySearch && (
              <Button
                variant="outline"
                size="md"
                onClick={onModifySearch}
                className="cursor-pointer font-semibold px-5"
              >
                Modify Search
              </Button>
            )}
          </div>
        </Card>
      );
    }

    // 3. Empty State (Clean, helpful, no scary error styling)
    if (flightList.length === 0) {
      return (
        <Card className="p-8 sm:p-12 text-center border border-slate-200/90 shadow-xs bg-white space-y-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
            <Plane className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="font-semibold text-lg text-slate-900 tracking-tight">
              No transport options found
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We couldn't find routes matching your search.
            </p>
            <p className="text-xs text-slate-400">
              Try changing your dates or travel preferences.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onModifySearch && (
              <Button
                variant="primary"
                size="md"
                onClick={onModifySearch}
                className="cursor-pointer font-semibold px-6 shadow-xs"
              >
                Modify Search
              </Button>
            )}
            <Button
              variant="outline"
              size="md"
              onClick={() => setActiveMode('own')}
              className="cursor-pointer"
            >
              Explore Road Trip
            </Button>
          </div>
        </Card>
      );
    }

    // 4. Results Available: Desktop 3-Column Grid / Mobile Single Column with Modal Filter
    return (
      <div className="space-y-4">
        
        {/* Mobile Filter & Sort Action Bar (Hidden on desktop) */}
        <div className="flex lg:hidden flex-col gap-2.5 pb-2">
          <div className="flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => setShowMobileFilterModal(true)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                activeFilterCount > 0
                  ? 'border-blue-500 bg-blue-50/90 text-blue-800 shadow-xs ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                <strong>{sortedFlights.length}</strong> options found
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 cursor-pointer outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Sort options"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="price">Lowest Price</option>
                <option value="duration">Shortest Duration</option>
                <option value="departure">Earliest Departure</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips Bar (Mobile) */}
          {renderActiveFiltersBar()}
        </div>

        {/* Mobile Filter Drawer / Modal Sheet */}
        <Modal
          isOpen={showMobileFilterModal}
          onClose={() => setShowMobileFilterModal(false)}
          title="Filter Travel Options"
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Mobile Drawer Header Status Pill */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <span className="font-semibold text-slate-700">
                {activeFilterCount > 0 ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}` : 'No filters applied'}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset all</span>
                </button>
              )}
            </div>

            {renderFilterPanel()}

            {/* Sticky Action Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleResetFilters}
                  className="w-1/3 text-xs font-semibold cursor-pointer"
                >
                  Reset
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowMobileFilterModal(false)}
                className={`${hasActiveFilters ? 'w-2/3' : 'w-full'} font-bold px-6 shadow-xs cursor-pointer`}
              >
                Apply Filters ({sortedFlights.length} available)
              </Button>
            </div>
          </div>
        </Modal>

        {/* 3-Column Desktop Grid: [ Filters (240px / 20-25%) ] [ Results (55-60%) ] [ Contextual Sidebar (20-25%) ] */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Filter Rail (Desktop ~240px) */}
          <div className="hidden lg:block lg:col-span-3 sticky top-4">
            {renderFilterPanel()}
          </div>

          {/* Center Column: Flight Results (Desktop ~55-60%) */}
          <div className="lg:col-span-6 space-y-4">

            {/* Smart Picks Summary Chips Bar */}
            {smartPicks && (
              <div className="bg-[#FAFAF8] rounded-xl border border-[#E7E5DF] p-3 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#14171F]">
                  <Sparkles className="w-3.5 h-3.5 text-[#2453FF]" />
                  <span>✨ Smart picks</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {smartPicks.bestValue && (
                    <button
                      type="button"
                      onClick={() => setSortBy('recommended')}
                      className="p-3 rounded-lg bg-white border border-[#E7E5DF] border-t-[3px] border-t-[#2453FF] text-left hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-[#2453FF]">
                        {smartPicks.bestValue.title}
                      </div>
                      <div className="text-sm font-bold text-[#14171F] font-mono tabular-nums mt-0.5">
                        {formatPrice(smartPicks.bestValue.price, smartPicks.bestValue.currency || 'INR')}
                      </div>
                      <div className="text-[10px] text-[#737885] font-mono">
                        {smartPicks.bestValue.duration}
                      </div>
                    </button>
                  )}

                  {smartPicks.fastest && (
                    <button
                      type="button"
                      onClick={() => setSortBy('duration')}
                      className="p-3 rounded-lg bg-white border border-[#E7E5DF] border-t-[3px] border-t-[#1E9E6B] text-left hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-[#1E9E6B]">
                        {smartPicks.fastest.title}
                      </div>
                      <div className="text-sm font-bold text-[#14171F] font-mono tabular-nums mt-0.5">
                        {formatPrice(smartPicks.fastest.price, smartPicks.fastest.currency || 'INR')}
                      </div>
                      <div className="text-[10px] text-[#737885] font-mono">
                        {smartPicks.fastest.duration}
                      </div>
                    </button>
                  )}

                  {smartPicks.cheapest && (
                    <button
                      type="button"
                      onClick={() => setSortBy('price')}
                      className="p-3 rounded-lg bg-white border border-[#E7E5DF] border-t-[3px] border-t-[#E8A33D] text-left hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150 cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-[#E8A33D]">
                        {smartPicks.cheapest.title}
                      </div>
                      <div className="text-sm font-bold text-[#14171F] font-mono tabular-nums mt-0.5">
                        {formatPrice(smartPicks.cheapest.price, smartPicks.cheapest.currency || 'INR')}
                      </div>
                      <div className="text-[10px] text-[#737885]">
                        Lowest available
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Desktop Results Header Bar: Count + Sort Dropdown */}
            <div className="hidden lg:flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
              <div className="text-slate-600 font-medium">
                <strong className="text-slate-900 font-bold">{sortedFlights.length}</strong> {sortedFlights.length === 1 ? 'option found' : 'options found'}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs font-semibold border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-800 cursor-pointer outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="recommended">Recommended ▾</option>
                  <option value="price">Lowest Price</option>
                  <option value="duration">Shortest Duration</option>
                  <option value="departure">Earliest Departure</option>
                </select>
              </div>
            </div>

            {/* Active Filters Bar (Desktop) */}
            <div className="hidden lg:block">
              {renderActiveFiltersBar()}
            </div>

            {/* Flight Results List (Target Structure: Left: Airline & Timeline, Center: Duration & Stops, Right: Price & CTA) */}
            <div className="space-y-3.5">
              {sortedFlights.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 border border-slate-200/90 bg-white space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
                    <SlidersHorizontal className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">No flights match the selected filter criteria.</p>
                    <p className="text-xs text-slate-400">Try loosening your stops, airlines, or departure time filters.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="mt-2 text-xs font-semibold cursor-pointer mx-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    <span>Reset filters</span>
                  </Button>
                </Card>
              ) : (
                sortedFlights.map((flight, idx) => {
                  const isLive = !flight.isEstimated && (
                    String(flight.provider || '').toLowerCase() === 'serpapi' ||
                    String(flight.source || '').toLowerCase() === 'serpapi' ||
                    String(flight.source || '').toLowerCase() === 'live'
                  );

                  const originCode = flight.origin?.code || '—';
                  const destCode = flight.destination?.code || '—';
                  const originCity = typeof from === 'string' ? from.split(',')[0].trim() : (flight.origin?.name || '—');
                  const destCity = typeof to === 'string' ? to.split(',')[0].trim() : (flight.destination?.name || '—');

                  const isSelected = activeFlightId === flight.id || (!activeFlightId && idx === 0 && activeMode === 'flight');
                  const badgeMeta = getFlightBadge(flight, idx);

                  const stopsCount = typeof flight.stops === 'number' ? flight.stops : 0;
                  const stopsLabel = stopsCount === 0 ? 'Non-stop' : (stopsCount === 1 ? '1 stop' : `${stopsCount} stops`);
                  const durationLabel = flight.duration || '—';
                  const cabinLabel = flight.cabin ? flight.cabin.replace('_', ' ') : 'Economy';
                  const layoverInfo = flight.layover || flight.layovers?.[0] || flight.stopsInfo || null;

                  return (
                    <Card
                      key={flight.id || idx}
                      className={`p-4 sm:p-5 transition-all duration-150 bg-white border rounded-xl relative ${
                        isSelected 
                          ? 'border-[#2453FF] ring-2 ring-[#2453FF]/20 shadow-xs' 
                          : 'border-[#E7E5DF] hover:border-[#2453FF]/40 hover:shadow-xs'
                      }`}
                    >
                      {/* Top Micro-Badges Bar: Semantic Recommendation + Live Verification (unobtrusive) */}
                      {(badgeMeta || isLive) && (
                        <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#E7E5DF]">
                          <div className="flex items-center gap-2">
                            {badgeMeta && (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide uppercase font-mono border ${
                                badgeMeta.color === 'emerald'
                                  ? 'bg-[#1E9E6B]/10 text-[#1E9E6B] border-[#1E9E6B]/30'
                                  : badgeMeta.color === 'blue'
                                  ? 'bg-[#2453FF]/10 text-[#2453FF] border-[#2453FF]/30'
                                  : 'bg-[#E8A33D]/10 text-[#E8A33D] border-[#E8A33D]/30'
                              }`}>
                                {badgeMeta.icon && <badgeMeta.icon className="w-3 h-3 shrink-0" />}
                                <span>{badgeMeta.label}</span>
                              </span>
                            )}
                          </div>

                          {isLive && (
                            <Badge variant="success" size="sm" className="font-mono text-[10px] py-0.5">
                              <ShieldCheck className="w-3 h-3 text-[#1E9E6B]" />
                              <span>Google Flights · Live</span>
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Main Ticket Information Grid: 3 explicit, non-overlapping columns */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center">
                        
                        {/* 1. Airline Identity + Departure → Arrival Timeline (sm:col-span-6) */}
                        <div className="sm:col-span-6 flex items-start gap-3 min-w-0">
                          {/* Airline Brand Icon/Logo */}
                          {flight.airlineLogo ? (
                            <img
                              src={flight.airlineLogo}
                              alt={flight.airline || 'Airline'}
                              className="w-10 h-10 rounded-lg object-contain bg-[#FAFAF8] p-1.5 border border-[#E7E5DF] shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#2453FF]/10 border border-[#2453FF]/20 text-[#2453FF] font-bold text-xs flex items-center justify-center font-mono shrink-0">
                              {(flight.airlineCode || flight.airline || 'FL').slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          {/* Flight Details & Timeline */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-[#14171F] truncate">
                                {flight.airline || 'Commercial Airline'}
                              </h4>
                              {flight.flightNumber && (
                                <span className="text-[11px] text-[#737885] font-mono">
                                  {flight.flightNumber}
                                </span>
                              )}
                            </div>

                            {/* Timeline Flow: Departure → Arrival */}
                            <div className="flex items-baseline gap-2 mt-1">
                              <div className="flex items-baseline gap-1">
                                <span className="text-base sm:text-lg font-black font-mono tabular-nums tracking-tight text-[#14171F]">
                                  {flight.depart || '—'}
                                </span>
                                <span className="text-xs font-bold text-[#3E434D] font-mono">
                                  {originCode}
                                </span>
                              </div>

                              <span className="text-[#737885] text-xs shrink-0 font-bold">→</span>

                              <div className="flex items-baseline gap-1">
                                <span className="text-base sm:text-lg font-black font-mono tabular-nums tracking-tight text-[#14171F]">
                                  {flight.arrive || '—'}
                                </span>
                                <span className="text-xs font-bold text-[#3E434D] font-mono">
                                  {destCode}
                                </span>
                              </div>
                            </div>

                            <div className="text-[11px] text-[#737885] truncate mt-0.5">
                              {originCity} to {destCity}
                            </div>
                          </div>
                        </div>

                        {/* 2. Duration + Stops Region (sm:col-span-3 text-center) */}
                        <div className="sm:col-span-3 flex flex-col items-center justify-center text-center px-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E7E5DF]">
                          <div className="text-xs font-bold text-[#14171F] font-mono tracking-tight">
                            {durationLabel}
                          </div>

                          {/* Route Bar Graphic */}
                          <div className="w-full max-w-[100px] flex items-center gap-1.5 my-1">
                            <div className="h-0.5 bg-[#E7E5DF] flex-1 rounded-full" />
                            <Plane className="w-3.5 h-3.5 text-[#2453FF] rotate-90 shrink-0" />
                            <div className="h-0.5 bg-[#E7E5DF] flex-1 rounded-full" />
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-center text-[11px]">
                            <span
                              className={`font-semibold ${
                                stopsCount === 0 ? 'text-[#1E9E6B]' : 'text-[#E8A33D]'
                              }`}
                            >
                              {stopsLabel}
                            </span>
                            {layoverInfo && (
                              <span className="text-[10px] text-[#737885] font-mono">
                                ({layoverInfo})
                              </span>
                            )}
                            <span className="text-[#E7E5DF]">·</span>
                            <span className="text-[10px] text-[#737885] capitalize">
                              {cabinLabel}
                            </span>
                          </div>
                        </div>

                        {/* 3. Price Region (sm:col-span-3 text-right) */}
                        <div className="sm:col-span-3 text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E7E5DF]">
                          <div className="text-xl sm:text-2xl font-black text-[#14171F] font-mono tabular-nums tracking-tight whitespace-nowrap">
                            {/* formatPrice(flight.price) source-currency aware */}
                            {formatPrice(flight.price, flight.currency || 'INR')}
                          </div>
                          <span className="text-[10px] text-[#737885] uppercase tracking-wider font-semibold block mt-0.5">
                            / traveler
                          </span>
                        </div>

                      </div>

                      {/* 4. Independent Action Row: CTA + External Link */}
                      <div className="flex items-center justify-end gap-2.5 pt-3 mt-3 border-t border-[#E7E5DF]">
                        <Button
                          variant={isSelected ? 'primary' : 'outline'}
                          size="md"
                          onClick={() => handleSelectFlight(flight)}
                          className={`cursor-pointer font-bold px-4 sm:px-5 rounded-lg shadow-xs transition-all whitespace-nowrap shrink-0 min-w-[140px] h-10 inline-flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#2453FF] hover:bg-[#1A3ECC] text-white border-transparent'
                              : 'border-[#2453FF] text-[#2453FF] hover:bg-[#2453FF]/8'
                          }`}
                        >
                          {isSelected ? (
                            <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                              <Check className="w-4 h-4 shrink-0" />
                              <span>Selected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                              <span>Select Flight →</span>
                              <span className="sr-only">Select →</span>
                            </span>
                          )}
                        </Button>

                        {flight.bookingUrl && (
                          <a
                            href={flight.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors inline-flex items-center justify-center shrink-0"
                            title="View on Google Flights"
                            aria-label="View on Google Flights"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

          </div>

          {/* Right Column: Contextual Sidebar (Desktop ~20-25%) */}
          <div className="hidden lg:block lg:col-span-3 sticky top-4">
            {renderRightSidebar()}
          </div>

        </div>

      </div>
    );
  };

  // ── Render: Other Modes ──────────────────────────────────────────────────────────
  const renderTrainsTab = () => (
    <div className="space-y-4 animate-fade-in">
      {trainList.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 border border-slate-200 bg-white">
          No trains scheduled for this corridor.
        </Card>
      ) : (
        trainList.map((train, idx) => {
          const trainKey = train.number || train.id || train.name || idx;
          const isSelected = activeMode === 'train' && (activeTrainId === trainKey || (!activeTrainId && idx === 0));

          return (
            <Card
              key={trainKey}
              className={`p-5 transition-all duration-150 bg-white border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isSelected
                  ? 'border-blue-600 ring-1 ring-blue-600 shadow-xs'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Train className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900">
                    {train.name || 'Express Train'}
                  </h4>
                  {train.number && (
                    <span className="text-xs text-slate-400 font-mono">
                      #{train.number}
                    </span>
                  )}
                  <Badge variant="warning" size="sm">Estimated</Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1 font-mono text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {train.depart || '--'} → {train.arrive || '--'} ({train.duration || 'N/A'})
                  </span>
                  {train.tier && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                      Class: {train.tier}
                    </span>
                  )}
                  {train.avail && (
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                      Available: {train.avail} seats
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-none pt-3 md:pt-0 border-slate-100">
                <div className="text-right">
                  <span className="text-lg font-bold text-slate-900 font-mono block">
                    {formatPrice(train.price)}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">Estimated Fare</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={isSelected ? 'primary' : 'outline'}
                    size="md"
                    onClick={() => handleSelectTrain(train)}
                    className={`cursor-pointer font-bold px-4 ${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-4 h-4 mr-1.5" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <span>Select Train</span>
                    )}
                  </Button>

                  <a
                    href={getConfirmTktUrl(train.number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-xs shrink-0"
                    title="Open live ticket booking on ConfirmTkt"
                  >
                    <span>ConfirmTkt</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );

  const renderBusesTab = () => (
    <div className="space-y-4 animate-fade-in">
      {busList.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 border border-slate-200 bg-white">
          No buses scheduled for this corridor.
        </Card>
      ) : (
        busList.map((bus, idx) => {
          const busKey = bus.id || bus.name || idx;
          const isSelected = activeMode === 'bus' && (activeBusId === busKey || (!activeBusId && idx === 0));

          return (
            <Card
              key={busKey}
              className={`p-5 transition-all duration-150 bg-white border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isSelected
                  ? 'border-blue-600 ring-1 ring-blue-600 shadow-xs'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Bus className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900">
                    {bus.name || 'Bus Service'}
                  </h4>
                  <Badge variant="warning" size="sm">Estimated</Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1 font-mono text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {bus.depart || '--'} → {bus.arrive || '--'} ({bus.duration || 'N/A'})
                  </span>
                  {bus.seats !== undefined && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700">
                      {bus.seats} seats left
                    </span>
                  )}
                  {bus.rating && (
                    <span className="flex items-center gap-0.5 text-amber-600 font-medium text-[11px]">
                      <Star className="w-3 h-3 fill-current" />
                      {bus.rating}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-none pt-3 md:pt-0 border-slate-100">
                <div className="text-right">
                  <span className="text-lg font-bold text-slate-900 font-mono block">
                    {formatPrice(bus.price)}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">Per Ticket</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={isSelected ? 'primary' : 'outline'}
                    size="md"
                    onClick={() => handleSelectBus(bus)}
                    className={`cursor-pointer font-bold px-4 ${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-4 h-4 mr-1.5" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <span>Select Bus</span>
                    )}
                  </Button>

                  <a
                    href={getRedBusUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-xs shrink-0"
                    title="Open live ticket booking on redBus"
                  >
                    <span>redBus</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );

  return (
    <div className="w-full space-y-6">
      
      {/* Transport Tabs: [ ✈ Flights ] [ 🚗 Road Trip ] [ 🚆 Trains ] [ 🚌 Buses ] */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none" role="tablist">
        
        {/* 1. Flights Tab */}
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'flight'}
          onClick={() => setActiveMode('flight')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
            activeMode === 'flight'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Plane className="w-4 h-4" />
          <span>Flights</span>
          {!flightLoading && flightList.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeMode === 'flight' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {flightList.length}
            </span>
          )}
        </button>

        {/* 2. Road Trip Tab */}
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'own'}
          onClick={() => setActiveMode('own')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
            activeMode === 'own'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Road Trip</span>
        </button>

        {/* 3. Trains Tab */}
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'train'}
          onClick={() => setActiveMode('train')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
            activeMode === 'train'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Train className="w-4 h-4" />
          <span>Trains</span>
          {trainList.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeMode === 'train' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {trainList.length}
            </span>
          )}
        </button>

        {/* 4. Buses Tab */}
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'bus'}
          onClick={() => setActiveMode('bus')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
            activeMode === 'bus'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bus className="w-4 h-4" />
          <span>Buses</span>
          {busList.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeMode === 'bus' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {busList.length}
            </span>
          )}
        </button>

      </div>

      {/* Panels */}
      <div className="pt-1">
        {activeMode === 'flight' && renderFlightTab()}
        {(activeMode === 'own' || activeMode === 'cab') && children}
        {activeMode === 'train' && renderTrainsTab()}
        {activeMode === 'bus' && renderBusesTab()}
      </div>

    </div>
  );
}
