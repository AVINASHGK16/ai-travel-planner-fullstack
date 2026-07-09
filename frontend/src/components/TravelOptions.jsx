import React from 'react';
import { Plane, Train, Bus, Car, Navigation, ChevronRight, Star, Clock, AlertCircle } from 'lucide-react';

export default function TravelOptions({
  from,
  to,
  date,
  options,
  activeMode,
  setActiveMode,
  children // This will be RoadTripDetails component if Own Vehicle is selected
}) {
  
  // Format city for URL parameters
  const getSearchCity = (name) => {
    return encodeURIComponent(name?.split(',')[0]?.trim() || '');
  };

  const getRedBusUrl = () => {
    return `https://www.redbus.in/bus-tickets/search?fromCityName=${getSearchCity(from)}&toCityName=${getSearchCity(to)}&onDate=${date}`;
  };

  const getGoibiboUrl = () => {
    // Goibibo expects dates in formatting or just landing page
    return `https://www.goibibo.com/flights/air-${getSearchCity(from)}-to-${getSearchCity(to)}/`;
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

  const renderBusTab = () => {
    const busList = options?.bus || [];
    if (busList.length === 0) return <div className="text-center py-8 text-slate-400">No buses available for this route.</div>;

    return (
      <div className="space-y-4">
        {busList.map((bus, idx) => (
          <div key={idx} className="p-5 rounded-xl border border-white/10 bg-slate-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-500/30 transition-all">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bus className="w-5 h-5 text-blue-400" />
                <h4 className="font-display font-semibold text-base text-white">{bus.name}</h4>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Clock className="w-3.5 h-3.5" />
                  {bus.depart} → {bus.arrive} ({bus.duration})
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded font-mono">{bus.seats} seats left</span>
                <span className="flex items-center gap-0.5 text-yellow-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {bus.rating}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0 border-white/5">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Price per ticket</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">₹{bus.price.toLocaleString()}</span>
              </div>
              <a
                href={getRedBusUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span>Book Now</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFlightTab = () => {
    const flightList = options?.flight || [];
    if (flightList.length === 0) {
      return (
        <div className="p-6 rounded-xl border border-white/5 bg-slate-900/20 text-center text-slate-400 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8 text-amber-500" />
          <p className="text-sm">Flights are only recommended for longer travel distances (250km+). Please check Train, Bus or Own Vehicle options!</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {flightList.map((flight, idx) => (
          <div key={idx} className="p-5 rounded-xl border border-white/10 bg-slate-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-500/30 transition-all">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-indigo-400" />
                <h4 className="font-display font-semibold text-base text-white">{flight.airline}</h4>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Clock className="w-3.5 h-3.5" />
                  {flight.depart} → {flight.arrive} ({flight.duration})
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded font-mono">{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop`}</span>
                <span className="flex items-center gap-0.5 text-yellow-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {flight.rating}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0 border-white/5">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Price per ticket</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">₹{flight.price.toLocaleString()}</span>
              </div>
              <a
                href={getGoibiboUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span>Book Now</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTrainTab = () => {
    const trainList = options?.train || [];
    if (trainList.length === 0) return <div className="text-center py-8 text-slate-400">No trains available for this route.</div>;

    return (
      <div className="space-y-4">
        {trainList.map((train, idx) => (
          <div key={idx} className="p-5 rounded-xl border border-white/10 bg-slate-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-500/30 transition-all">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Train className="w-5 h-5 text-purple-400" />
                <h4 className="font-display font-semibold text-base text-white">{train.name} <span className="font-mono text-xs text-slate-400">#{train.number}</span></h4>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Clock className="w-3.5 h-3.5" />
                  {train.depart} → {train.arrive} ({train.duration})
                </span>
                <span className="bg-purple-900/30 text-purple-300 border border-purple-500/15 px-2 py-0.5 rounded font-bold font-mono">{train.tier}</span>
                <span className="bg-emerald-950/30 text-emerald-300 border border-emerald-500/15 px-2 py-0.5 rounded font-mono">Available: {train.avail}</span>
              </div>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0 border-white/5">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Ticket Price</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">₹{train.price.toLocaleString()}</span>
              </div>
              <a
                href={getConfirmTktUrl(train.number)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-purple-500/10 flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span>Book Ticket</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCabTab = () => {
    const cabList = options?.cab || [];
    if (cabList.length === 0) return <div className="text-center py-8 text-slate-400">No cabs available for this route.</div>;

    return (
      <div className="space-y-4">
        {cabList.map((cab, idx) => (
          <div key={idx} className="p-5 rounded-xl border border-white/10 bg-slate-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-500/30 transition-all">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-400" />
                <h4 className="font-display font-semibold text-base text-white">{cab.name}</h4>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Clock className="w-3.5 h-3.5" />
                  Estimated duration: {cab.time}
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded font-mono">{cab.type}</span>
                <span className="text-slate-400 font-mono">Distance: {cab.distance}</span>
              </div>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0 border-white/5">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Estimated Fare</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">₹{cab.price.toLocaleString()}</span>
              </div>
              <a
                href={getCabUrl(cab.name.includes('Uber') ? 'Uber' : 'Ola')}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span>Book Cab</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const modes = [
    { id: 'flight', label: 'Flights', icon: Plane },
    { id: 'train', label: 'Trains', icon: Train },
    { id: 'bus', label: 'Buses', icon: Bus },
    { id: 'cab', label: 'Cabs', icon: Car },
    { id: 'own', label: 'Own Vehicle', icon: Navigation }
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* Mode Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-white/10">
        {modes.map((m) => {
          const IconComponent = m.icon;
          const isActive = activeMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium text-sm transition-all duration-300 border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <IconComponent className="w-4.5 h-4.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs Content */}
      <div className="animate-fade-in">
        {activeMode === 'flight' && renderFlightTab()}
        {activeMode === 'train' && renderTrainTab()}
        {activeMode === 'bus' && renderBusTab()}
        {activeMode === 'cab' && renderCabTab()}
        {activeMode === 'own' && children}
      </div>

    </div>
  );
}
