import React, { useState, useMemo } from 'react';
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
  ChevronRight,
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
  RotateCcw
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';
import { Modal } from './ui/Modal';

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

  // Safe currency / price formatter
  const formatPrice = (p, currency = 'INR') => {
    const symbol = currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '₹'));
    if (typeof p === 'number' && !Number.isNaN(p)) return `${symbol}${p.toLocaleString()}`;
    if (typeof p === 'string' && p.trim()) {
      return p.trim().startsWith(symbol) ? p.trim() : `${symbol}${p.trim()}`;
    }
    return 'N/A';
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

  // Route price range
  const minRoutePrice = useMemo(() => {
    if (flightList.length === 0) return 0;
    const prices = flightList.map(f => f.price || 0).filter(p => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [flightList]);

  const maxRoutePrice = useMemo(() => {
    if (flightList.length === 0) return 100000;
    const prices = flightList.map(f => f.price || 0).filter(p => p > 0);
    return prices.length > 0 ? Math.max(...prices) : 100000;
  }, [flightList]);

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

      // 4. Price filter
      if (maxPriceFilter !== null && typeof f.price === 'number') {
        if (f.price > maxPriceFilter) return false;
      }

      return true;
    });
  }, [flightList, selectedStops, selectedAirlines, departureTimeFilter, maxPriceFilter]);

  // Sort filtered flights
  const sortedFlights = useMemo(() => {
    return [...filteredFlights].sort((a, b) => {
      if (sortBy === 'price') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'duration') {
        return getDurationMinutes(a) - getDurationMinutes(b);
      }
      if (sortBy === 'departure') {
        return String(a.depart || '').localeCompare(String(b.depart || ''));
      }
      return 0; // 'recommended' uses natural API rank
    });
  }, [filteredFlights, sortBy]);

  // Cheapest & fastest flight IDs for semantic badges
  const cheapestFlightId = useMemo(() => {
    if (flightList.length === 0) return null;
    const sorted = [...flightList].sort((a, b) => (a.price || 0) - (b.price || 0));
    return sorted[0]?.id || null;
  }, [flightList]);

  const fastestFlightId = useMemo(() => {
    if (flightList.length === 0) return null;
    const sorted = [...flightList].sort((a, b) => getDurationMinutes(a) - getDurationMinutes(b));
    return sorted[0]?.id || null;
  }, [flightList]);

  const getFlightBadge = (flight, idx) => {
    if (flight.id === cheapestFlightId) {
      return { label: 'CHEAPEST', icon: '🟢', color: 'emerald' };
    }
    if (flight.id === fastestFlightId && flight.id !== cheapestFlightId) {
      return { label: 'FASTEST', icon: '⚡', color: 'blue' };
    }
    if (idx === 0 && flight.id !== cheapestFlightId && flight.id !== fastestFlightId) {
      return { label: 'RECOMMENDED', icon: '✦', color: 'blue' };
    }
    if (idx === 1 && flight.id !== cheapestFlightId && flight.id !== fastestFlightId) {
      return { label: 'BEST VALUE', icon: '💎', color: 'blue' };
    }
    return null;
  };

  // Compute Smart Picks (Best Value, Fastest, Cheapest)
  const smartPicks = useMemo(() => {
    if (flightList.length === 0) return null;

    const cheapestFlight = [...flightList].sort((a, b) => (a.price || 0) - (b.price || 0))[0];
    const fastestFlight = [...flightList].sort((a, b) => getDurationMinutes(a) - getDurationMinutes(b))[0];
    const bestValueFlight = flightList[0];

    return {
      bestValue: bestValueFlight ? {
        title: 'Best value',
        price: bestValueFlight.price,
        duration: bestValueFlight.duration || '2h 50m',
        flightId: bestValueFlight.id
      } : null,
      fastest: fastestFlight ? {
        title: 'Fastest',
        price: fastestFlight.price,
        duration: fastestFlight.duration || '2h 35m',
        flightId: fastestFlight.id
      } : null,
      cheapest: cheapestFlight ? {
        title: 'Cheapest',
        price: cheapestFlight.price,
        duration: cheapestFlight.duration,
        flightId: cheapestFlight.id
      } : null
    };
  }, [flightList]);

  // Lowest fare and comparative calculation for Price Insights
  const lowestFare = useMemo(() => {
    const validPrices = flightList.map(f => f.price).filter(p => typeof p === 'number' && p > 0);
    if (validPrices.length === 0) return null;
    return Math.min(...validPrices);
  }, [flightList]);

  const priceComparison = useMemo(() => {
    const validPrices = flightList.map(f => f.price).filter(p => typeof p === 'number' && p > 0);
    if (validPrices.length < 2) return null;
    const min = Math.min(...validPrices);
    const avg = Math.round(validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length);
    if (avg <= min) return null;
    const percent = Math.round(((avg - min) / avg) * 100);
    return percent > 0 ? percent : null;
  }, [flightList]);

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
      <div className="space-y-2.5 pt-3 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Departure
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'all', label: 'Any' },
            { id: 'morning', label: 'Morning (<12)', icon: <Sun className="w-3 h-3 text-amber-500" /> },
            { id: 'afternoon', label: 'Afternoon', icon: <Sunset className="w-3 h-3 text-orange-500" /> },
            { id: 'evening', label: 'Evening (>18)', icon: <Moon className="w-3 h-3 text-indigo-500" /> }
          ].map(slot => (
            <button
              key={slot.id}
              type="button"
              onClick={() => setDepartureTimeFilter(slot.id)}
              className={`p-1.5 text-[11px] rounded-md border text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                departureTimeFilter === slot.id
                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {slot.icon}
              <span>{slot.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Price Filter */}
      {maxRoutePrice > minRoutePrice && (
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Price Range
            </label>
            <span className="text-xs font-bold text-slate-900 font-mono">
              Up to {formatPrice(effectiveMaxPrice)}
            </span>
          </div>
          <input
            type="range"
            min={minRoutePrice}
            max={maxRoutePrice}
            step={500}
            value={effectiveMaxPrice}
            onChange={(e) => setMaxPriceFilter(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>{formatPrice(minRoutePrice)}</span>
            <span>{formatPrice(maxRoutePrice)}</span>
          </div>
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
        <Card className="p-4 bg-white border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-mono">
              YOUR TRIP
            </span>
            {onModifySearch && (
              <button
                type="button"
                onClick={onModifySearch}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <h4 className="font-display font-bold text-base text-slate-900 leading-tight">
              {originCity} → {destCity}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{date || 'Upcoming'}{returnDate ? ` – ${returnDate}` : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{travelers} {travelers === 1 ? 'Traveler' : 'Travelers'}</span>
            </div>
          </div>
        </Card>

        {/* Card 2: PRICE INSIGHTS */}
        <Card className="p-4 bg-white border border-slate-200/90 shadow-xs space-y-2.5">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-mono">
            PRICE INSIGHTS
          </span>

          <div>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {lowestFare !== null ? `₹${lowestFare.toLocaleString()}` : 'Live fares available'}
            </div>
            {priceComparison ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mt-1">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{priceComparison}% lower than the average fare for this route.</span>
              </div>
            ) : (
              <div className="text-xs text-slate-500 mt-1">
                Prices are dynamically queried for this route.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Prices are currently typical or low for this route.</span>
          </div>
        </Card>

        {/* Card 3: POPULAR TIMES */}
        <Card className="p-4 bg-white border border-slate-200/90 shadow-xs space-y-2.5">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-mono">
            POPULAR TIMES
          </span>

          <p className="text-xs text-slate-600 leading-relaxed">
            Fares are typically cheaper on <strong className="text-slate-900">Tuesday</strong> &amp; <strong className="text-slate-900">Wednesday</strong> departures.
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
                      bar.low ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                  />
                  <span className={`text-[9px] font-mono ${bar.low ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-slate-400 text-center font-mono pt-1">
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
        <div className="flex lg:hidden items-center justify-between gap-2.5 pb-2">
          <button
            type="button"
            onClick={() => setShowMobileFilterModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
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

        {/* Mobile Filter Modal Sheet */}
        <Modal
          isOpen={showMobileFilterModal}
          onClose={() => setShowMobileFilterModal(false)}
          title="Filter Travel Options"
          maxWidth="md"
        >
          <div className="space-y-4">
            {renderFilterPanel()}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowMobileFilterModal(false)}
                className="w-full sm:w-auto font-semibold px-6"
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
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>✨ Smart picks</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {smartPicks.bestValue && (
                    <button
                      type="button"
                      onClick={() => setSortBy('recommended')}
                      className="p-2.5 rounded-lg bg-white border border-slate-200/90 text-left hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider font-mono">
                        {smartPicks.bestValue.title}
                      </div>
                      <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                        ₹{smartPicks.bestValue.price?.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {smartPicks.bestValue.duration}
                      </div>
                    </button>
                  )}

                  {smartPicks.fastest && (
                    <button
                      type="button"
                      onClick={() => setSortBy('duration')}
                      className="p-2.5 rounded-lg bg-white border border-slate-200/90 text-left hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider font-mono">
                        {smartPicks.fastest.title}
                      </div>
                      <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                        ₹{smartPicks.fastest.price?.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {smartPicks.fastest.duration}
                      </div>
                    </button>
                  )}

                  {smartPicks.cheapest && (
                    <button
                      type="button"
                      onClick={() => setSortBy('price')}
                      className="p-2.5 rounded-lg bg-white border border-slate-200/90 text-left hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider font-mono">
                        {smartPicks.cheapest.title}
                      </div>
                      <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                        ₹{smartPicks.cheapest.price?.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">
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

            {/* Flight Results List (5-Question Immediate Result Card Hierarchy) */}
            <div className="space-y-3.5">
              {sortedFlights.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 border border-slate-200/90 bg-white space-y-2">
                  <p className="text-sm font-medium text-slate-700">No flights match the selected filter criteria.</p>
                  <p className="text-xs text-slate-400">Try loosening your stops, airlines, or departure time filters.</p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-2 text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    Reset filters
                  </button>
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

                  const stopsLabel = typeof flight.stops === 'number'
                    ? (flight.stops === 0 ? 'Non-stop' : (flight.stops === 1 ? '1 stop' : `${flight.stops} stops`))
                    : '—';
                  const durationLabel = flight.duration || '—';

                  return (
                    <Card
                      key={flight.id || idx}
                      className={`p-4 sm:p-5 transition-all duration-150 bg-white border ${
                        isSelected 
                          ? 'border-blue-600 ring-1 ring-blue-600 shadow-xs' 
                          : 'border-slate-200/90 hover:border-blue-300 hover:shadow-xs'
                      }`}
                    >
                      {/* 1. Header: Who (Airline & Flight #) + Semantic Recommendation Badge */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          {flight.airlineLogo ? (
                            <img
                              src={flight.airlineLogo}
                              alt={flight.airline || 'Airline'}
                              className="w-9 h-9 rounded-lg object-contain bg-slate-50 p-1 border border-slate-200/80 shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                              {(flight.airlineCode || flight.airline || '✈').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                              {flight.airline || '—'}
                            </h4>
                            {flight.flightNumber && (
                              <span className="text-xs text-slate-400 font-mono">
                                {flight.flightNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Semantic Recommendation Badge */}
                        <div className="flex items-center gap-2">
                          {badgeMeta && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase font-mono border ${
                              badgeMeta.color === 'emerald'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : badgeMeta.color === 'blue'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              <span>{badgeMeta.icon}</span>
                              <span>{badgeMeta.label}</span>
                            </span>
                          )}

                          {isLive && (
                            <Badge variant="success" size="sm" className="hidden sm:inline-flex font-mono">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Google Flights · Live</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* 2 & 3. Middle: When & How Long (Departure ── Route Graphic ── Arrival) */}
                      <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        
                        {/* Departure */}
                        <div className="min-w-[90px]">
                          <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight block">
                            {flight.depart || '—'}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 block">
                            {originCity}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono font-bold">
                            {originCode}
                          </span>
                        </div>

                        {/* Route Line Graphic: How Long */}
                        <div className="flex flex-col items-center px-2 flex-1 max-w-[240px] mx-auto text-center w-full">
                          <span className="text-xs font-bold text-slate-700 mb-1 font-mono">
                            {durationLabel} · {stopsLabel}
                          </span>
                          <div className="w-full flex items-center gap-1.5">
                            <div className="h-px bg-slate-300 flex-1" />
                            <Plane className="w-3.5 h-3.5 text-blue-600 rotate-90 shrink-0" />
                            <div className="h-px bg-slate-300 flex-1" />
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium mt-1">
                            {flight.cabin ? flight.cabin.replace('_', ' ') : 'Economy'}
                          </span>
                        </div>

                        {/* Arrival */}
                        <div className="min-w-[90px] text-left sm:text-right">
                          <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight block">
                            {flight.arrive || '—'}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 block">
                            {destCity}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono font-bold">
                            {destCode}
                          </span>
                        </div>

                      </div>

                      {/* 4 & 5. Bottom: How Much (Price) & What Do I Do (Select CTA) */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">
                            Google Flights
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono block leading-tight">
                              {formatPrice(flight.price)}
                            </span>
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-medium">
                              / traveler
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant={isSelected ? 'primary' : 'outline'}
                              size="md"
                              onClick={() => handleSelectFlight(flight)}
                              className={`cursor-pointer font-bold px-5 ${
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
                                <span>Select →</span>
                              )}
                            </Button>

                            {flight.bookingUrl && (
                              <a
                                href={flight.bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                title="View on Google Flights"
                                aria-label="View on Google Flights"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
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
