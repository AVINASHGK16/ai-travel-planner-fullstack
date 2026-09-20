import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Star, ExternalLink, AlertTriangle, ShieldCheck, MapPin, Fuel, Zap, Utensils, Camera, Hotel, ShieldAlert, Map } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

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

// Normalizes and sanitizes coordinate tuples, supporting numeric strings and falling back gracefully
export const sanitizeCoord = (coord, fallback = null) => {
  if (!Array.isArray(coord) || coord.length < 2) return fallback;
  const lat = typeof coord[0] === 'number' ? coord[0] : parseFloat(coord[0]);
  const lon = typeof coord[1] === 'number' ? coord[1] : parseFloat(coord[1]);
  if (isValidCoord([lat, lon])) {
    return [lat, lon];
  }
  return fallback;
};

// React Error Boundary specifically isolating the interactive map component
export class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn('Caught map rendering error safely:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <Map className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-sm text-slate-900">Interactive Map Unavailable</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Route coordinates could not be rendered. Detailed itinerary and stops are listed below.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Custom Map center update hook
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (center && isValidCoord(center)) {
      try {
        map.setView(center, 7);
      } catch (e) {
        console.warn('Leaflet setView safely caught:', e?.message || e);
      }
    }
  }, [center, map]);
  return null;
}

// Crisp vector SVG templates for map markers (eliminates blurry platform emojis)
const PIN_SVGS = {
  start: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  destination: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  fuel: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></svg>',
  ev: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  food: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M12 2v19"/><path d="M15 22v-8a3 3 0 0 0-3-3h0a3 3 0 0 0-3 3v8"/></svg>',
  sights: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
  hotel: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="m9 16 3-3 3 3"/><path d="M9 8h.01"/><path d="M15 8h.01"/></svg>',
  hospital: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"/><path d="M6 12h12"/></svg>',
  police: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
};

// Generate custom SVG DivIcon for Leaflet markers
const createCustomIcon = (iconHtml, color) => {
  const safeColor = typeof color === 'string' && color.trim() ? color : '#2563eb';
  const safeHtml = typeof iconHtml === 'string' && iconHtml.trim() ? iconHtml : PIN_SVGS.start;
  return L.divIcon({
    html: `<div style="background-color: ${safeColor}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.25);">${safeHtml}</div>`,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

export default function RoadTripDetails({ tripData, onSelectRoadRoute }) {
  // ── ALL HOOKS BEFORE ANY CONDITIONAL RETURNS ──────────────────
  const [activeRoute, setActiveRoute] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState('all');
  const [markers, setMarkers] = useState([]);

  // Derive values (safe even if tripData is null — hooks must always run)
  const own = tripData?.options?.own;
  const roadDetails = tripData?.roadTripDetails;

  // Authoritative coordinates directly from tripData — zero private geocoder, zero arbitrary city fallback
  const fromCoords = sanitizeCoord(tripData?.coordinates?.from, null);
  const toCoords = sanitizeCoord(tripData?.coordinates?.to, null);
  const hasValidRouteCoords = isValidCoord(fromCoords) && isValidCoord(toCoords);
  const mapCenter = hasValidRouteCoords
    ? [(fromCoords[0] + toCoords[0]) / 2, (fromCoords[1] + toCoords[1]) / 2]
    : null;

  // Real road geometry from OSRM
  const routeGeometry = (tripData?.routeDetails?.geometry && Array.isArray(tripData.routeDetails.geometry))
    ? tripData.routeDetails.geometry.filter(isValidCoord)
    : null;
  const hasRoadGeometry = Array.isArray(routeGeometry) && routeGeometry.length >= 2;
  const isEstimatedRoute = !hasRoadGeometry || tripData?.routeDetails?.isRoadRoute === false || tripData?.routeDetails?.source === 'haversine_estimate';

  useEffect(() => {
    if (!roadDetails || !hasValidRouteCoords) {
      setMarkers([]);
      return;
    }

    const pins = [];

    // Start / End markers strictly using canonical locations
    pins.push({ position: fromCoords, label: `Starting: ${tripData?.from || 'Origin'}`, iconHtml: PIN_SVGS.start, color: '#2563eb' });
    pins.push({ position: toCoords,   label: `Destination: ${tripData?.to || 'Destination'}`, iconHtml: PIN_SVGS.destination, color: '#dc2626' });

    // Petrol stations
    if (selectedLayer === 'all' || selectedLayer === 'fuel') {
      roadDetails.petrolPumps?.forEach((pump, idx) => {
        const pumpName = typeof pump === 'string' ? pump : (pump?.name || 'Fuel Station');
        const ratio = (idx + 1) / ((roadDetails.petrolPumps.length || 1) + 1);
        pins.push({
          position: [
            fromCoords[0] + (toCoords[0] - fromCoords[0]) * ratio + (((idx * 13) % 7) - 3) * 0.02,
            fromCoords[1] + (toCoords[1] - fromCoords[1]) * ratio + (((idx * 17) % 5) - 2) * 0.02
          ],
          label: `${pumpName} (Petrol Pump)`, iconHtml: PIN_SVGS.fuel, color: '#d97706'
        });
      });
    }

    // EV Stations
    if (selectedLayer === 'all' || selectedLayer === 'ev') {
      roadDetails.evStations?.forEach((ev, idx) => {
        const evName = typeof ev === 'string' ? ev : (ev?.name || 'EV Station');
        const ratio = (idx + 0.5) / ((roadDetails.evStations.length || 1) + 1);
        pins.push({
          position: [
            fromCoords[0] + (toCoords[0] - fromCoords[0]) * ratio + (((idx * 11) % 6) - 3) * 0.02,
            fromCoords[1] + (toCoords[1] - fromCoords[1]) * ratio + (((idx * 19) % 4) - 2) * 0.02
          ],
          label: `${evName} (EV Station)`, iconHtml: PIN_SVGS.ev, color: '#10b981'
        });
      });
    }

    // Restaurants
    if (selectedLayer === 'all' || selectedLayer === 'restaurants') {
      (roadDetails.restaurants || []).filter(r => r && typeof r === 'object').forEach((rest, idx) => {
        const ratio = (idx + 0.3) / ((roadDetails.restaurants.length || 1) + 1);
        pins.push({
          position: [
            fromCoords[0] + (toCoords[0] - fromCoords[0]) * ratio + (((idx * 7) % 9) - 4) * 0.025,
            fromCoords[1] + (toCoords[1] - fromCoords[1]) * ratio + (((idx * 3) % 7) - 3) * 0.025
          ],
          label: `${rest.name || 'Dine Spot'} (${rest.cuisine || 'Local Cuisine'})`, iconHtml: PIN_SVGS.food, color: '#ea580c'
        });
      });
    }

    // Attractions
    if (selectedLayer === 'all' || selectedLayer === 'attractions') {
      (roadDetails.attractions || []).filter(a => a && typeof a === 'object').forEach((att, idx) => {
        const ratio = (idx + 0.7) / ((roadDetails.attractions.length || 1) + 1);
        pins.push({
          position: [
            fromCoords[0] + (toCoords[0] - fromCoords[0]) * ratio + (((idx * 5) % 11) - 5) * 0.03,
            fromCoords[1] + (toCoords[1] - fromCoords[1]) * ratio + (((idx * 13) % 9) - 4) * 0.03
          ],
          label: `${att.name || 'Attraction'} ★ ${att.rating ?? 4.0}`, iconHtml: PIN_SVGS.sights, color: '#7c3aed'
        });
      });
    }

    // Hotels
    if (selectedLayer === 'all' || selectedLayer === 'hotels') {
      (roadDetails.hotels || []).filter(h => h && typeof h === 'object').forEach((hotel, idx) => {
        const ratio = (idx + 0.85) / ((roadDetails.hotels.length || 1) + 1);
        const hotelPrice = typeof hotel.price === 'number' ? `₹${hotel.price.toLocaleString()}` : (hotel.price ? `₹${hotel.price}` : 'N/A');
        pins.push({
          position: [
            fromCoords[0] + (toCoords[0] - fromCoords[0]) * ratio + (((idx * 2) % 5) - 2) * 0.015,
            fromCoords[1] + (toCoords[1] - fromCoords[1]) * ratio + (((idx * 8) % 3) - 1) * 0.015
          ],
          label: `${hotel.name || 'Hotel'} — ${hotelPrice}`, iconHtml: PIN_SVGS.hotel, color: '#db2777'
        });
      });
    }

    // Emergency services
    if (selectedLayer === 'all' || selectedLayer === 'emergencies') {
      roadDetails.emergencies?.hospitals?.filter(Boolean).forEach((hosp, idx) => {
        pins.push({
          position: [mapCenter[0] + (idx * 0.04 - 0.02), mapCenter[1] + (idx * 0.05 - 0.02)],
          label: `${hosp} (Hospital)`, iconHtml: PIN_SVGS.hospital, color: '#dc2626'
        });
      });
      roadDetails.emergencies?.police?.filter(Boolean).forEach((pol, idx) => {
        pins.push({
          position: [toCoords[0] - 0.1 + idx * 0.05, toCoords[1] - 0.08 + idx * 0.03],
          label: `${pol} (Police)`, iconHtml: PIN_SVGS.police, color: '#1e3a8a'
        });
      });
    }

    const validPins = pins.filter(pin => isValidCoord(pin?.position));
    setMarkers(validPins);
  }, [selectedLayer, fromCoords, toCoords, roadDetails, hasValidRouteCoords]);

  // ── NOW safe to return null if data missing ────────────────────
  if (!own || !roadDetails) return null;

  return (
    <div className="space-y-6">

      {/* Top Section: Details & Interactive Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left pane: Route summary + Route selector + Layer toggles */}
        <div className="lg:col-span-5 space-y-5">

          {/* Distance & Time summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center border-slate-200 shadow-xs bg-white">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold tracking-wider">
                Road Distance
              </span>
              <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">
                {tripData?.routeDetails?.distanceKm ? `${tripData.routeDetails.distanceKm} km` : (own.distance || 'N/A')}
              </span>
              {tripData?.routeDetails?.source === 'haversine_estimate' ? (
                <Badge variant="warning" size="sm" className="mt-1">Est. Haversine</Badge>
              ) : (
                <Badge variant="success" size="sm" className="mt-1">OSRM Highway</Badge>
              )}
            </Card>

            <Card className="p-4 text-center border-slate-200 shadow-xs bg-white">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold tracking-wider">
                Est. Drive Time
              </span>
              <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">
                {tripData?.routeDetails?.durationMinutes
                  ? (tripData.routeDetails.durationMinutes >= 60
                      ? `${Math.floor(tripData.routeDetails.durationMinutes / 60)}h ${tripData.routeDetails.durationMinutes % 60}m`
                      : `${tripData.routeDetails.durationMinutes}m`)
                  : (own.time || 'N/A')}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Non-stop driving</span>
            </Card>
          </div>

          {/* Route options selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
                Select Route Option
              </h4>
              <span className="text-[11px] text-slate-400">
                {own.routes?.length || 1} available
              </span>
            </div>

            <div className="space-y-2">
              {own.routes?.filter(r => r && typeof r === 'object').map((route, idx) => {
                const isSelected = activeRoute === idx;
                return (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`Select ${route.name || `Route ${idx + 1}`}, distance ${route.distance || 'N/A'}`}
                    onClick={() => setActiveRoute(idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveRoute(idx);
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-left ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-semibold text-sm ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                        {route.name || `Route ${idx + 1}`}
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-600">
                        {route.distance || 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Drive: {route.time || 'N/A'}</span>
                      <span>Tolls: {typeof route.tolls === 'number' ? `₹${route.tolls}` : (route.tolls ? (String(route.tolls).startsWith('₹') ? route.tolls : `₹${route.tolls}`) : '₹0')}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium text-slate-700">
                        {route.roadCondition || 'Standard'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Primary Action: Select Route & Continue */}
            {onSelectRoadRoute && (
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onSelectRoadRoute(activeRoute)}
                  className="w-full font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <span>Select Route &amp; View Itinerary →</span>
                </Button>
              </div>
            )}
          </div>

          {/* Map Pin Layer Toggles */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
              Filter Route Amenities
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all',          label: 'All',          icon: MapPin },
                { id: 'fuel',         label: 'Petrol',       icon: Fuel },
                { id: 'ev',           label: 'EV Charge',    icon: Zap },
                { id: 'restaurants',  label: 'Food',         icon: Utensils },
                { id: 'attractions',  label: 'Sights',       icon: Camera },
                { id: 'hotels',       label: 'Stays',        icon: Hotel },
                { id: 'emergencies',  label: 'Emergency',    icon: ShieldAlert }
              ].map((layer) => {
                const LayerIcon = layer.icon;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setSelectedLayer(layer.id)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none inline-flex items-center gap-1.5 ${
                      selectedLayer === layer.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <LayerIcon className="w-3.5 h-3.5" />
                    <span>{layer.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right pane: Leaflet interactive road route map */}
        <div className="lg:col-span-7 h-[360px] lg:h-[420px] rounded-xl overflow-hidden border border-slate-200 shadow-xs relative bg-slate-100">
          {!hasValidRouteCoords ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50 text-slate-700">
              <AlertTriangle className="w-8 h-8 text-amber-600 mb-2" />
              <h4 className="font-semibold text-sm text-slate-900">Route Map Unavailable</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Authoritative route coordinates are missing or unverified.
              </p>
            </div>
          ) : (
            <MapErrorBoundary>
              <MapContainer
                center={mapCenter}
                zoom={7}
                className="w-full h-full"
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ChangeMapView center={mapCenter} />

                {/* Authentic OSRM road polyline in Roamly primary blue */}
                {hasRoadGeometry && activeRoute === 0 && (
                  <Polyline
                    positions={routeGeometry}
                    color="#2563eb"
                    weight={5}
                    opacity={0.85}
                  />
                )}

                {/* Markers strictly verified against invalid or NaN coordinates */}
                {markers
                  .filter(marker => marker && isValidCoord(marker.position))
                  .map((marker, index) => (
                    <Marker
                      key={index}
                      position={marker.position}
                      icon={createCustomIcon(marker.iconHtml, marker.color)}
                    >
                      <Popup>
                        <div className="text-xs font-semibold text-slate-900">{marker.label}</div>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            </MapErrorBoundary>
          )}

          {/* Informative provenance banner */}
          {hasValidRouteCoords && (
            isEstimatedRoute ? (
              <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg text-xs text-amber-800 font-medium flex items-center gap-1.5 shadow-md border border-amber-200 max-w-[85%]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Route geometry estimated (Highway routing offline)</span>
              </div>
            ) : (
              <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-1.5 shadow-md border border-emerald-200 max-w-[85%]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Authentic OSRM Road Geometry</span>
              </div>
            )
          )}

          <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] text-slate-600 font-mono pointer-events-none border border-slate-200/80 shadow-xs">
            OpenStreetMap · Leaflet
          </div>
        </div>

      </div>

      {/* ── Route Amenities Sections (Restaurants, Attractions, Hotels) ── */}
      <div className="space-y-6 pt-2 border-t border-slate-100">

        {/* Restaurants */}
        {roadDetails.restaurants?.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Recommended Dining Along Route</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {(roadDetails.restaurants || []).filter(r => r && typeof r === 'object').map((rest, idx) => (
                <Card key={idx} className="p-4 border-slate-200 shadow-xs bg-white flex flex-col justify-between hover:border-blue-300 transition-all">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h5 className="font-semibold text-slate-900 text-sm">{rest.name || 'Dine Spot'}</h5>
                      <span className="flex items-center gap-0.5 text-xs text-amber-600 shrink-0 font-bold font-mono">
                        <Star className="w-3 h-3 fill-current" />
                        {rest.rating ?? 4.0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Cuisine: {rest.cuisine || 'Local Cuisine'}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">{rest.openingHours || 'Open Daily'}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="font-mono">{rest.distance || 'En route'}</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rest.name || 'Restaurant')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                    >
                      Navigate <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tourist Attractions */}
        {roadDetails.attractions?.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Sightseeing &amp; Attractions Along Route</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(roadDetails.attractions || []).filter(a => a && typeof a === 'object').map((att, idx) => (
                <Card key={idx} className="border-slate-200 shadow-xs bg-white overflow-hidden hover:border-blue-300 transition-all flex flex-col sm:flex-row">
                  {att.image && (
                    <img
                      src={att.image}
                      alt={att.name || 'Attraction'}
                      className="w-full sm:w-36 h-32 object-cover bg-slate-100 shrink-0"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div className="p-4 flex flex-col justify-between flex-grow">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h5 className="font-semibold text-slate-900 text-sm">{att.name || 'Attraction'}</h5>
                        <span className="flex items-center gap-0.5 text-xs text-amber-600 shrink-0 font-bold font-mono">
                          <Star className="w-3 h-3 fill-current" /> {att.rating ?? 4.2}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-normal line-clamp-2">
                        {att.description || 'Popular sightseeing spot along the highway route.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 font-mono">
                      <span>Dist: {att.distance || 'En route'}</span>
                      <span>Visit: {att.visitTime || '1-2 hrs'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Hotels & Stays */}
        {roadDetails.hotels?.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Hotel className="w-4 h-4 text-pink-600 shrink-0" />
              <span>Hotels &amp; Accommodations</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(roadDetails.hotels || []).filter(h => h && typeof h === 'object').map((hotel, idx) => {
                const hotelPrice = typeof hotel.price === 'number' ? `₹${hotel.price.toLocaleString()}` : (hotel.price ? `₹${hotel.price}` : 'N/A');
                return (
                  <Card key={idx} className="border-slate-200 shadow-xs bg-white overflow-hidden hover:border-blue-300 transition-all flex flex-col sm:flex-row">
                    {hotel.image && (
                      <img
                        src={hotel.image}
                        alt={hotel.name || 'Hotel'}
                        className="w-full sm:w-36 h-32 object-cover bg-slate-100 shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <div className="p-4 flex flex-col justify-between flex-grow">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h5 className="font-semibold text-slate-900 text-sm">{hotel.name || 'Hotel'}</h5>
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {hotelPrice}/night
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {hotel.amenities?.join(' · ') || 'Comfortable stay with modern amenities'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 font-mono">
                        <span>{hotel.distance || 'Near destination'}</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name || 'Hotel')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 font-sans"
                        >
                          Details <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
