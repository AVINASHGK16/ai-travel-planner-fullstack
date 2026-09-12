import React, { useState } from 'react';
import { 
  Plane, 
  Car, 
  Train, 
  Bus, 
  Clock, 
  ExternalLink, 
  AlertCircle, 
  Check, 
  ArrowUpDown, 
  Star, 
  Info,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';

/**
 * Roamly TravelOptions Component — UI-4 Redesign
 * Establishes 3 core transport categories:
 * 1. Flights (Provider-backed live SerpApi offers + estimated fallback)
 * 2. Road Trip (OSRM highway routing & Leaflet map)
 * 3. Other Ground Options (Trains, Buses, Cabs)
 */
export default function TravelOptions({
  from,
  to,
  date,
  options,
  activeMode = 'flight',
  setActiveMode,
  children, // RoadTripDetails
  flightLoading = false,
  flightError = null
}) {
  const [sortBy, setSortBy] = useState('recommended'); // 'recommended' | 'price' | 'duration' | 'departure'
  const [groundSubTab, setGroundSubTab] = useState('train'); // 'train' | 'bus' | 'cab'

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

  const getCabUrl = (type) => {
    return type === 'Uber' 
      ? `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${getSearchCity(to)}`
      : `https://www.olacabs.com/`;
  };

  // Determine top-level active category
  const isFlightActive = activeMode === 'flight';
  const isRoadActive = activeMode === 'own';
  const isGroundActive = ['train', 'bus', 'cab'].includes(activeMode);

  // Flight list extraction & sorting
  const flightList = (options?.flight || []).filter(f => f && typeof f === 'object');
  const trainList = (options?.train || []).filter(t => t && typeof t === 'object');
  const busList = (options?.bus || []).filter(b => b && typeof b === 'object');
  const cabList = (options?.cab || []).filter(c => c && typeof c === 'object');

  const sortedFlights = [...flightList].sort((a, b) => {
    if (sortBy === 'price') {
      return (a.price || 0) - (b.price || 0);
    }
    if (sortBy === 'duration') {
      const getMins = (item) => {
        if (typeof item.durationMinutes === 'number') return item.durationMinutes;
        const durStr = String(item.duration || '');
        const hMatch = durStr.match(/(\d+)\s*h/);
        const mMatch = durStr.match(/(\d+)\s*m/);
        const h = hMatch ? parseInt(hMatch[1], 10) : 0;
        const m = mMatch ? parseInt(mMatch[1], 10) : 0;
        return h * 60 + m;
      };
      return getMins(a) - getMins(b);
    }
    if (sortBy === 'departure') {
      return String(a.depart || '').localeCompare(String(b.depart || ''));
    }
    return 0; // 'recommended' uses natural API rank
  });

  // Category switch handlers
  const handleSelectCategory = (cat) => {
    if (cat === 'flight') {
      setActiveMode('flight');
    } else if (cat === 'road') {
      setActiveMode('own');
    } else if (cat === 'ground') {
      setActiveMode(groundSubTab);
    }
  };

  const handleSelectGroundSubTab = (sub) => {
    setGroundSubTab(sub);
    setActiveMode(sub);
  };

  // ── Render: Flight Tab ──────────────────────────────────────────────────────────
  const renderFlightTab = () => {
    // 1. Loading State (Skeleton cards)
    if (flightLoading) {
      return (
        <div className="space-y-4 animate-fade-in" aria-busy="true" aria-label="Searching flights">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 py-1">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span>Searching live airline offers via Google Flights...</span>
          </div>

          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-5 border-slate-200 shadow-xs bg-white space-y-4">
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
    }

    // 2. Empty State (No flights found)
    if (flightList.length === 0) {
      return (
        <Card className="p-8 text-center border-slate-200 shadow-xs bg-white space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Plane className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="font-semibold text-base text-slate-900">No flights found</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn't find commercial flight options for this corridor and date. The distance may be a driving corridor (&lt;200 km), or scheduled passenger flights may not operate on this date.
            </p>
          </div>
          {flightError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-center gap-2 max-w-md mx-auto">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Provider notice: {flightError}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveMode('own')}
            >
              Explore Road Trip
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGroundSubTab('train');
                setActiveMode('train');
              }}
            >
              View Trains & Buses
            </Button>
          </div>
        </Card>
      );
    }

    // 3. Populated Flight Offers List
    return (
      <div className="space-y-4">
        
        {/* Provider Notice if search experienced fallback or partial failure */}
        {flightError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Live search notice: {flightError}. Displaying available flight options below.</span>
            </div>
          </div>
        )}

        {/* Toolbar: Count & Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100 text-xs">
          <div className="text-slate-600 font-medium">
            Showing <strong className="text-slate-900">{sortedFlights.length}</strong> {sortedFlights.length === 1 ? 'flight offer' : 'flight offers'}
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Sort by:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="radiogroup" aria-label="Sort flights">
              {[
                { id: 'recommended', label: 'Best' },
                { id: 'price', label: 'Price' },
                { id: 'duration', label: 'Fastest' },
                { id: 'departure', label: 'Earliest' }
              ].map((sortOption) => (
                <button
                  key={sortOption.id}
                  type="button"
                  onClick={() => setSortBy(sortOption.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    sortBy === sortOption.id
                      ? 'bg-white text-blue-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sortOption.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Flight Cards */}
        <div className="space-y-3">
          {sortedFlights.map((flight, idx) => {
            const isLive = !flight.isEstimated && (
              String(flight.provider || '').toLowerCase() === 'serpapi' ||
              String(flight.source || '').toLowerCase() === 'serpapi' ||
              String(flight.source || '').toLowerCase() === 'live'
            );

            const originCode = flight.origin?.code || 'ORIG';
            const destCode = flight.destination?.code || 'DEST';
            const originCity = typeof from === 'string' ? from.split(',')[0] : 'Origin';
            const destCity = typeof to === 'string' ? to.split(',')[0] : 'Destination';

            return (
              <Card
                key={flight.id || idx}
                className="p-5 border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all duration-150 bg-white"
              >
                {/* Header: Airline info & Provenance Badge */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    {flight.airlineLogo ? (
                      <img
                        src={flight.airlineLogo}
                        alt={flight.airline}
                        className="w-8 h-8 rounded-lg object-contain bg-slate-50 p-1 border border-slate-200/80"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center font-mono">
                        {(flight.airlineCode || flight.airline || 'FL').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 leading-tight">
                        {flight.airline || 'Commercial Airline'}
                      </h4>
                      {flight.flightNumber && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {flight.flightNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Explicit Provenance Badge */}
                  {isLive ? (
                    <Badge variant="success" size="sm" className="font-mono">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Google Flights · Live</span>
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm" className="font-mono">
                      <Info className="w-3 h-3 text-amber-600" />
                      <span>Estimated Fare</span>
                    </Badge>
                  )}
                </div>

                {/* Schedule & Transit Flight Path */}
                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Departure */}
                  <div className="min-w-[100px]">
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight block">
                      {flight.depart || '--:--'}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 block">
                      {originCity}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {originCode}
                    </span>
                  </div>

                  {/* Flight Path Graphic */}
                  <div className="flex flex-col items-center px-2 flex-1 max-w-[200px] mx-auto text-center">
                    <span className="text-xs font-medium text-slate-500 mb-1 font-mono">
                      {flight.duration || 'N/A'}
                    </span>
                    <div className="w-full flex items-center gap-1.5">
                      <div className="h-px bg-slate-300 flex-1" />
                      <Plane className="w-3.5 h-3.5 text-blue-600 rotate-90 shrink-0" />
                      <div className="h-px bg-slate-300 flex-1" />
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-1">
                      {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop`}
                    </span>
                  </div>

                  {/* Arrival */}
                  <div className="min-w-[100px] text-left sm:text-right">
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight block">
                      {flight.arrive || '--:--'}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 block">
                      {destCity}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {destCode}
                    </span>
                  </div>

                </div>

                {/* Footer: Cabin, Fare & Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {flight.cabin && (
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md capitalize">
                        {flight.cabin.replace('_', ' ')}
                      </span>
                    )}
                    {flight.baggage && (
                      <span className="text-[11px] text-slate-500">
                        Cabin & Check-in included
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-lg sm:text-xl font-bold text-slate-900 font-mono block leading-tight">
                        {formatPrice(flight.price, flight.currency)}
                      </span>
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                        {isLive ? 'Live Fare' : 'Estimated Fare'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={activeMode === 'flight' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setActiveMode('flight')}
                        className="cursor-pointer font-medium"
                      >
                        {activeMode === 'flight' ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Selected
                          </>
                        ) : (
                          'Select'
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
          })}
        </div>

      </div>
    );
  };

  // ── Render: Other Ground Options Tab (Trains, Buses, Cabs) ──────────────────────
  const renderGroundTab = () => {
    return (
      <div className="space-y-4">
        {/* Sub-selector for ground options */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => handleSelectGroundSubTab('train')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              groundSubTab === 'train'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Train className="w-3.5 h-3.5" />
            <span>Trains ({trainList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectGroundSubTab('bus')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              groundSubTab === 'bus'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            <span>Buses ({busList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectGroundSubTab('cab')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              groundSubTab === 'cab'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Cabs ({cabList.length})</span>
          </button>
        </div>

        {/* Subtab 1: Trains */}
        {groundSubTab === 'train' && (
          <div className="space-y-3 animate-fade-in">
            {trainList.length === 0 ? (
              <Card className="p-8 text-center text-slate-500 border-slate-200">
                No direct trains scheduled for this corridor.
              </Card>
            ) : (
              trainList.map((train, idx) => (
                <Card
                  key={train.id || idx}
                  className="p-5 border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Train className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-sm text-slate-900">
                        {train.name || 'Express Train'}{' '}
                        {train.number && (
                          <span className="font-mono text-xs text-slate-400 font-normal">
                            #{train.number}
                          </span>
                        )}
                      </h4>
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

                    <a
                      href={getConfirmTktUrl(train.number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                    >
                      <span>Book on ConfirmTkt</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Subtab 2: Buses */}
        {groundSubTab === 'bus' && (
          <div className="space-y-3 animate-fade-in">
            {busList.length === 0 ? (
              <Card className="p-8 text-center text-slate-500 border-slate-200">
                No buses scheduled for this corridor.
              </Card>
            ) : (
              busList.map((bus, idx) => (
                <Card
                  key={bus.id || idx}
                  className="p-5 border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
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

                    <a
                      href={getRedBusUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                    >
                      <span>Book on redBus</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Subtab 3: Cabs */}
        {groundSubTab === 'cab' && (
          <div className="space-y-3 animate-fade-in">
            {cabList.length === 0 ? (
              <Card className="p-8 text-center text-slate-500 border-slate-200">
                No cab estimates available.
              </Card>
            ) : (
              cabList.map((cab, idx) => (
                <Card
                  key={cab.id || idx}
                  className="p-5 border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Car className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-sm text-slate-900">
                        {cab.name || 'Cab Service'}
                      </h4>
                      <Badge variant="warning" size="sm">Estimated</Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Est. drive: {cab.time || 'N/A'}
                      </span>
                      {cab.type && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                          {cab.type}
                        </span>
                      )}
                      {cab.distance && (
                        <span className="text-slate-500 text-[11px]">
                          Distance: {cab.distance}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-none pt-3 md:pt-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900 font-mono block">
                        {formatPrice(cab.price)}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">Estimated Total</span>
                    </div>

                    <a
                      href={getCabUrl(typeof cab.name === 'string' && cab.name.includes('Uber') ? 'Uber' : 'Ola')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                    >
                      <span>Check Availability</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="w-full space-y-5">
      
      {/* 3 Core Transport Categories Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none" role="tablist">
        
        {/* 1. Flights Category */}
        <button
          type="button"
          role="tab"
          aria-selected={isFlightActive}
          onClick={() => handleSelectCategory('flight')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
            isFlightActive
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Plane className="w-4 h-4" />
          <span>Flights</span>
          {!flightLoading && flightList.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              isFlightActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {flightList.length}
            </span>
          )}
        </button>

        {/* 2. Road Trip Category */}
        <button
          type="button"
          role="tab"
          aria-selected={isRoadActive}
          onClick={() => handleSelectCategory('road')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
            isRoadActive
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Road Trip</span>
        </button>

        {/* 3. Other Ground Options Category */}
        <button
          type="button"
          role="tab"
          aria-selected={isGroundActive}
          onClick={() => handleSelectCategory('ground')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
            isGroundActive
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Train className="w-4 h-4" />
          <span>Other Ground Options</span>
        </button>

      </div>

      {/* Transport Content Panels */}
      <div className="pt-1 animate-fade-in">
        {isFlightActive && renderFlightTab()}
        {isRoadActive && children}
        {isGroundActive && renderGroundTab()}
      </div>

    </div>
  );
}
