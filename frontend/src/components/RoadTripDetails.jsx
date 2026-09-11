import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Star, HeartPulse, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';

// Module-level in-memory cache to eliminate duplicate Nominatim network calls
const geocodeCache = new Map();

// Strict coordinate validator: prevents Leaflet unrecoverable NaN / invalid coordinate crashes
export const isValidCoord = (coord) => {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  const [lat, lon] = coord;
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
};

const DEFAULT_FROM = [12.9716, 77.5946];
const DEFAULT_TO = [17.3850, 78.4867];
const DEFAULT_MID = [15.1783, 78.0406];

// Custom Map center update hook
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && isValidCoord(center)) {
      map.setView(center, 7);
    }
  }, [center, map]);
  return null;
}

// Generate custom SVG DivIcon for Leaflet markers
const createCustomIcon = (iconHtml, color) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); font-size: 16px;">${iconHtml}</div>`,
    className: 'custom-leaflet-icon',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34]
  });
};

export default function RoadTripDetails({ tripData }) {
  // ── ALL HOOKS BEFORE ANY CONDITIONAL RETURNS ──────────────────
  const [activeRoute, setActiveRoute] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState('all');
  const [markers, setMarkers] = useState([]);

  // Derive values (safe even if tripData is null — hooks must always run)
  const own = tripData?.options?.own;
  const roadDetails = tripData?.roadTripDetails;

  const [fromCoords, setFromCoords] = useState(() =>
    isValidCoord(tripData?.coordinates?.from) ? tripData.coordinates.from : DEFAULT_FROM
  );
  const [toCoords, setToCoords] = useState(() =>
    isValidCoord(tripData?.coordinates?.to) ? tripData.coordinates.to : DEFAULT_TO
  );
  const [midCoords, setMidCoords] = useState(() =>
    isValidCoord(tripData?.coordinates?.mid) ? tripData.coordinates.mid : DEFAULT_MID
  );
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);

  useEffect(() => {
    // Reset to verified default values first
    const initFrom = isValidCoord(tripData?.coordinates?.from) ? tripData.coordinates.from : DEFAULT_FROM;
    const initTo = isValidCoord(tripData?.coordinates?.to) ? tripData.coordinates.to : DEFAULT_TO;
    const initMid = isValidCoord(tripData?.coordinates?.mid) ? tripData.coordinates.mid : DEFAULT_MID;
    
    setFromCoords(initFrom);
    setToCoords(initTo);
    setMidCoords(initMid);
    setGeocodeError(null);

    if (!tripData?.from || !tripData?.to) return;

    let active = true;
    const controller = new AbortController();

    const geocode = async () => {
      setLoadingCoords(true);
      try {
        const geocodeAddress = async (query) => {
          if (!query || typeof query !== 'string') return null;
          const cacheKey = query.trim().toLowerCase();
          if (geocodeCache.has(cacheKey)) {
            return geocodeCache.get(cacheKey);
          }

          try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}`;
            const res = await fetch(url, {
              signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : controller.signal,
              headers: {
                'User-Agent': 'AITravelPlanner/1.0'
              }
            });
            if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              if (isValidCoord([lat, lon])) {
                geocodeCache.set(cacheKey, [lat, lon]);
                return [lat, lon];
              }
            }
            return null;
          } catch (fetchErr) {
            if (fetchErr.name !== 'AbortError') {
              console.warn(`Geocoding failed for "${query}":`, fetchErr.message);
            }
            return null;
          }
        };

        const [resolvedFrom, resolvedTo] = await Promise.all([
          geocodeAddress(tripData.from),
          geocodeAddress(tripData.to)
        ]);

        if (!active) return;

        let hadIssue = false;
        let finalFrom = initFrom;
        if (resolvedFrom && isValidCoord(resolvedFrom)) {
          finalFrom = resolvedFrom;
        } else if (!isValidCoord(tripData?.coordinates?.from)) {
          hadIssue = true;
        }

        let finalTo = initTo;
        if (resolvedTo && isValidCoord(resolvedTo)) {
          finalTo = resolvedTo;
        } else if (!isValidCoord(tripData?.coordinates?.to)) {
          hadIssue = true;
        }

        let finalMid = isValidCoord([
          (finalFrom[0] + finalTo[0]) / 2,
          (finalFrom[1] + finalTo[1]) / 2
        ]) ? [
          (finalFrom[0] + finalTo[0]) / 2,
          (finalFrom[1] + finalTo[1]) / 2
        ] : DEFAULT_MID;

        setFromCoords(finalFrom);
        setToCoords(finalTo);
        setMidCoords(finalMid);

        if (hadIssue) {
          setGeocodeError('Could not resolve exact GPS coordinates. Showing estimated route.');
        } else {
          setGeocodeError(null);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Error geocoding map coordinates:', err);
          if (active) {
            setGeocodeError('Could not resolve route GPS coordinates. Showing estimated route.');
          }
        }
      } finally {
        if (active) {
          setLoadingCoords(false);
        }
      }
    };

    geocode();

    return () => {
      active = false;
      controller.abort();
    };
  }, [tripData?.from, tripData?.to]);

  useEffect(() => {
    if (!roadDetails) return; // bail early inside effect (allowed)

    const pins = [];

    // Start / End markers
    pins.push({ position: fromCoords, label: `Starting: ${tripData?.from || ''}`, iconHtml: '📍', color: '#3b82f6' });
    pins.push({ position: toCoords,   label: `Destination: ${tripData?.to || ''}`, iconHtml: '🏁', color: '#ef4444' });

    // Petrol stations
    if (selectedLayer === 'all' || selectedLayer === 'fuel') {
      roadDetails.petrolPumps?.forEach((pump, idx) => {
        const ratio = (idx + 1) / ((roadDetails.petrolPumps.length || 1) + 1);
        pins.push({
          position: [
            fromCoords[0] + (toCoords[0] - fromCoords[0]) * ratio + (((idx * 13) % 7) - 3) * 0.02,
            fromCoords[1] + (toCoords[1] - fromCoords[1]) * ratio + (((idx * 17) % 5) - 2) * 0.02
          ],
          label: `${pump} (Petrol Pump)`, iconHtml: '⛽', color: '#f59e0b'
        });
      });
    }

    // EV Stations
    if (selectedLayer === 'all' || selectedLayer === 'ev') {
      roadDetails.evStations?.forEach((ev, idx) => {
        const ratio = (idx + 0.5) / ((roadDetails.evStations.length || 1) + 1);
        pins.push({
          position: [
            fromCoords[0] + (toCoords[0] - fromCoords[0]) * ratio + (((idx * 11) % 6) - 3) * 0.02,
            fromCoords[1] + (toCoords[1] - fromCoords[1]) * ratio + (((idx * 19) % 4) - 2) * 0.02
          ],
          label: `${ev} (EV Station)`, iconHtml: '⚡', color: '#10b981'
        });
      });
    }

    // Restaurants
    if (selectedLayer === 'all' || selectedLayer === 'restaurants') {
      roadDetails.restaurants?.forEach((rest, idx) => {
        const ratio = (idx + 0.3) / ((roadDetails.restaurants.length || 1) + 1);
        pins.push({
          position: [
            fromCoords[0] + (toCoords[0] - fromCoords[0]) * ratio + (((idx * 7) % 9) - 4) * 0.025,
            fromCoords[1] + (toCoords[1] - fromCoords[1]) * ratio + (((idx * 3) % 7) - 3) * 0.025
          ],
          label: `${rest.name} (${rest.cuisine})`, iconHtml: '🍽️', color: '#ea580c'
        });
      });
    }

    // Attractions
    if (selectedLayer === 'all' || selectedLayer === 'attractions') {
      roadDetails.attractions?.forEach((att, idx) => {
        const ratio = (idx + 0.7) / ((roadDetails.attractions.length || 1) + 1);
        pins.push({
          position: [
            fromCoords[0] + (toCoords[0] - fromCoords[0]) * ratio + (((idx * 5) % 11) - 5) * 0.03,
            fromCoords[1] + (toCoords[1] - fromCoords[1]) * ratio + (((idx * 13) % 9) - 4) * 0.03
          ],
          label: `${att.name} ★ ${att.rating}`, iconHtml: '🎡', color: '#8b5cf6'
        });
      });
    }

    // Hotels
    if (selectedLayer === 'all' || selectedLayer === 'hotels') {
      roadDetails.hotels?.forEach((hotel, idx) => {
        const ratio = (idx + 0.85) / ((roadDetails.hotels.length || 1) + 1);
        pins.push({
          position: [
            fromCoords[0] + (toCoords[0] - fromCoords[0]) * ratio + (((idx * 2) % 5) - 2) * 0.015,
            fromCoords[1] + (toCoords[1] - fromCoords[1]) * ratio + (((idx * 8) % 3) - 1) * 0.015
          ],
          label: `${hotel.name} — ₹${hotel.price}`, iconHtml: '🏨', color: '#db2777'
        });
      });
    }

    // Emergency services
    if (selectedLayer === 'all' || selectedLayer === 'emergencies') {
      roadDetails.emergencies?.hospitals?.forEach((hosp, idx) => {
        pins.push({
          position: [midCoords[0] + (idx * 0.04 - 0.02), midCoords[1] + (idx * 0.05 - 0.02)],
          label: `${hosp} (Hospital)`, iconHtml: '🏥', color: '#dc2626'
        });
      });
      roadDetails.emergencies?.police?.forEach((pol, idx) => {
        pins.push({
          position: [toCoords[0] - 0.1 + idx * 0.05, toCoords[1] - 0.08 + idx * 0.03],
          label: `${pol} (Police)`, iconHtml: '👮', color: '#1e3a8a'
        });
      });
    }

    const validPins = pins.filter(pin => isValidCoord(pin?.position));
    setMarkers(validPins);
  }, [selectedLayer, fromCoords[0], fromCoords[1], toCoords[0], toCoords[1], roadDetails]);

  // ── NOW safe to return null if data missing ────────────────────
  if (!own || !roadDetails) return null;

  // Route polylines with verified valid coordinates
  const safeMid = isValidCoord(midCoords) ? midCoords : DEFAULT_MID;
  const safeFrom = isValidCoord(fromCoords) ? fromCoords : DEFAULT_FROM;
  const safeTo = isValidCoord(toCoords) ? toCoords : DEFAULT_TO;
  const altMid = isValidCoord([safeMid[0] + 0.2, safeMid[1] - 0.3])
    ? [safeMid[0] + 0.2, safeMid[1] - 0.3]
    : safeMid;

  const routePoints = [
    [safeFrom, safeMid, safeTo],
    [safeFrom, altMid, safeTo]
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-300">

      {/* ── Left pane: route selector + layer toggles ────────────── */}
      <div className="lg:col-span-5 space-y-6">

        {/* Distance & Time summary */}
        <div className="p-4 rounded-xl border border-white/10 bg-slate-900/30 grid grid-cols-2 gap-4">
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block font-medium">Distance</span>
            <span className="text-lg font-bold text-white font-mono">{own.distance}</span>
          </div>
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block font-medium">Est. Drive Time</span>
            <span className="text-lg font-bold text-white font-mono">{own.time}</span>
          </div>
        </div>

        {/* Route selectors */}
        <div className="space-y-3">
          <h4 className="font-display font-semibold text-sm text-slate-200">Select Route</h4>
          <div className="space-y-2">
            {own.routes?.map((route, idx) => (
              <div
                key={idx}
                onClick={() => setActiveRoute(idx)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  activeRoute === idx
                    ? 'border-blue-500/50 bg-blue-500/5 text-white'
                    : 'border-white/10 bg-slate-900/20 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm">{route.name}</span>
                  <span className="text-xs font-mono text-blue-400 font-bold">{route.distance}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Drive: {route.time}</span>
                  <span>Tolls: ₹{route.tolls}</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">{route.roadCondition}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Layer toggles */}
        <div className="space-y-3">
          <h4 className="font-display font-semibold text-sm text-slate-200">Toggle Map Pins</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all',          label: 'All',          icon: '📍' },
              { id: 'fuel',         label: 'Petrol',       icon: '⛽' },
              { id: 'ev',           label: 'EV Charge',    icon: '⚡' },
              { id: 'restaurants',  label: 'Restaurants',  icon: '🍽️' },
              { id: 'attractions',  label: 'Attractions',  icon: '🎡' },
              { id: 'hotels',       label: 'Hotels',       icon: '🏨' },
              { id: 'emergencies',  label: 'Emergency',    icon: '🏥' }
            ].map((layer) => (
              <button
                key={layer.id}
                onClick={() => setSelectedLayer(layer.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  selectedLayer === layer.id
                    ? 'bg-blue-600 text-white border-transparent shadow'
                    : 'bg-slate-900/40 text-slate-400 border-white/5 hover:bg-slate-900/60'
                }`}
              >
                <span className="mr-1">{layer.icon}</span>
                {layer.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right pane: interactive Leaflet map ──────────────────── */}
      <div className="lg:col-span-7 h-[380px] lg:h-[480px] rounded-xl overflow-hidden border border-white/10 relative">
        <MapContainer
          center={safeMid}
          zoom={7}
          className="w-full h-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeMapView center={safeMid} />

          {/* Route polyline */}
          <Polyline
            positions={routePoints[activeRoute]}
            color={activeRoute === 0 ? '#3b82f6' : '#a855f7'}
            weight={5}
            opacity={0.8}
          />

          {/* Markers */}
          {markers.map((marker, index) => (
            <Marker
              key={index}
              position={marker.position}
              icon={createCustomIcon(marker.iconHtml, marker.color)}
            >
              <Popup>
                <div className="text-xs font-medium">{marker.label}</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {loadingCoords && (
          <div className="absolute top-3 right-3 z-[1000] glass px-3 py-1.5 rounded-lg text-xs text-blue-300 font-medium flex items-center gap-1.5 shadow-lg border border-blue-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Resolving map coordinates...</span>
          </div>
        )}

        {geocodeError && !loadingCoords && (
          <div className="absolute top-3 left-3 z-[1000] glass px-3 py-1.5 rounded-lg text-xs text-amber-300 font-medium flex items-center gap-1.5 shadow-lg border border-amber-500/20 bg-amber-950/60 max-w-[85%]">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{geocodeError}</span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 z-[1000] glass px-3 py-1.5 rounded-lg text-[10px] text-slate-300 font-mono pointer-events-none">
          OpenStreetMap · Leaflet
        </div>
      </div>

      {/* ── Full-width POI cards ─────────────────────────────────── */}
      <div className="lg:col-span-12 space-y-8 pt-4 border-t border-white/5">

        {/* Restaurants */}
        {roadDetails.restaurants?.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-display font-bold text-lg text-white flex items-center gap-2">
              🍽️ Dine Spots Along Route
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {roadDetails.restaurants.map((rest, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-white/15 bg-slate-900/30 hover:border-orange-500/20 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h5 className="font-semibold text-white text-sm">{rest.name}</h5>
                      <span className="flex items-center gap-0.5 text-xs text-yellow-400 shrink-0 font-bold font-mono">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {rest.rating}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Cuisine: {rest.cuisine}</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">{rest.openingHours}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-400">
                    <span className="font-mono">{rest.distance}</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rest.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1"
                    >
                      Navigate <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tourist Attractions */}
        {roadDetails.attractions?.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-display font-bold text-lg text-white flex items-center gap-2">
              🎡 Sightseeing Attractions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadDetails.attractions.map((att, idx) => (
                <div key={idx} className="rounded-xl border border-white/15 bg-slate-900/30 overflow-hidden hover:border-purple-500/20 transition-all flex flex-col sm:flex-row">
                  {att.image && (
                    <img
                      src={att.image}
                      alt={att.name}
                      className="w-full sm:w-40 h-36 object-cover bg-slate-800 shrink-0"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div className="p-4 flex flex-col justify-between flex-grow">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h5 className="font-semibold text-white text-sm">{att.name}</h5>
                        <span className="flex items-center gap-0.5 text-xs text-yellow-400 shrink-0 font-bold font-mono">
                          <Star className="w-3.5 h-3.5 fill-current" /> {att.rating}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-normal line-clamp-2">{att.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-white/5 font-mono">
                      <span>Dist: {att.distance}</span>
                      <span>Visit: {att.visitTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotels */}
        {roadDetails.hotels?.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-display font-bold text-lg text-white flex items-center gap-2">
              🏨 Hotels &amp; Stays
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadDetails.hotels.map((hotel, idx) => (
                <div key={idx} className="rounded-xl border border-white/15 bg-slate-900/30 overflow-hidden hover:border-pink-500/20 transition-all flex flex-col sm:flex-row">
                  {hotel.image && (
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      className="w-full sm:w-40 h-40 object-cover bg-slate-800 shrink-0"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div className="p-4 flex flex-col justify-between flex-grow">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h5 className="font-semibold text-white text-sm">{hotel.name}</h5>
                        <span className="flex items-center gap-0.5 text-xs text-yellow-400 shrink-0 font-bold font-mono">
                          <Star className="w-3.5 h-3.5 fill-current" /> {hotel.rating}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {hotel.amenities?.map((amenity, amIdx) => (
                          <span key={amIdx} className="bg-slate-800 text-[10px] text-slate-300 px-2 py-0.5 rounded border border-white/5">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-4 pt-2.5 border-t border-white/5">
                      <div className="font-mono">
                        <span className="text-[10px] text-slate-500 block">Per Night</span>
                        <span className="text-sm font-bold text-emerald-400">₹{hotel.price?.toLocaleString()}</span>
                      </div>
                      <a
                        href="https://www.booking.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-medium text-xs rounded-lg transition-all"
                      >
                        Book Hotel
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emergency services */}
        <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5">
          <h4 className="font-display font-bold text-sm text-red-400 flex items-center gap-2 mb-3">
            <HeartPulse className="w-4.5 h-4.5" />
            Emergency Support Along the Route
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-semibold text-slate-300 uppercase block mb-1">Hospitals</span>
              <ul className="space-y-1 text-slate-400 list-disc pl-4">
                {roadDetails.emergencies?.hospitals?.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
            <div>
              <span className="font-semibold text-slate-300 uppercase block mb-1">Police Units</span>
              <ul className="space-y-1 text-slate-400 list-disc pl-4">
                {roadDetails.emergencies?.police?.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
            <div>
              <span className="font-semibold text-slate-300 uppercase block mb-1">Mechanics</span>
              <ul className="space-y-1 text-slate-400 list-disc pl-4">
                {roadDetails.emergencies?.mechanics?.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
