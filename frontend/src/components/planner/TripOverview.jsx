import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit3, 
  Save, 
  Check, 
  MoreVertical, 
  Share2, 
  Download, 
  Clock, 
  MapPin, 
  Sparkles, 
  Sun, 
  ChevronLeft, 
  ChevronRight, 
  Plane, 
  Car, 
  Train, 
  Bus, 
  Maximize2, 
  AlertCircle, 
  Compass,
  Utensils,
  Coffee,
  ShoppingBag,
  Camera,
  Eye,
  Moon,
  Home,
  Navigation,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  GripVertical
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { jsPDF } from 'jspdf';
import { Card, Button, Skeleton, Modal, Dropdown, Input, Select } from '../ui';
import { isValidCoord, sanitizeCoord, MapErrorBoundary } from '../RoadTripDetails';

// Custom SVG DivIcon generator for itinerary markers
const createTimelineMarkerIcon = (number, color = '#2563eb') => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.25); color: white; font-weight: bold; font-size: 12px; font-family: monospace;">${number}</div>`,
    className: 'timeline-leaflet-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

// Component to dynamically fit bounds of active markers
function MapBoundsUpdater({ coordinates }) {
  const map = useMap();
  React.useEffect(() => {
    if (!map || !Array.isArray(coordinates) || coordinates.length === 0) return;
    const validCoords = coordinates.filter(isValidCoord);
    if (validCoords.length === 0) return;
    if (validCoords.length === 1) {
      map.setView(validCoords[0], 13);
    } else {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [map, coordinates]);
  return null;
}

const iconComponentMap = {
  Utensils,
  Navigation,
  MapPin,
  Eye,
  Moon,
  Home,
  Coffee,
  ShoppingBag,
  Camera,
  Compass,
  Plane,
  Car,
  Train,
  Bus
};

/**
 * Format Date: e.g. "Nov 15, 2026"
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Format Day Date: e.g. "Nov 15"
 */
function getDayDate(startDateStr, dayNumber) {
  if (!startDateStr) return `Day ${dayNumber}`;
  try {
    const parts = String(startDateStr).split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + (dayNumber - 1));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch {
    // fallback
  }
  return `Day ${dayNumber}`;
}

/**
 * Shared cost formatter: returns '—' for undefined/null/invalid, preserves ₹0 for legitimate 0
 */
function formatCost(val) {
  if (typeof val === 'number' && !isNaN(val)) {
    return `₹${val.toLocaleString()}`;
  }
  return '—';
}

/**
 * Extract valid coordinates from an activity object or null
 */
function getActivityCoordinates(act) {
  if (!act) return null;
  if (Array.isArray(act.coordinates)) {
    return sanitizeCoord(act.coordinates, null);
  }
  if (Array.isArray(act.position)) {
    return sanitizeCoord(act.position, null);
  }
  if (typeof act.lat === 'number' && typeof act.lon === 'number') {
    return sanitizeCoord([act.lat, act.lon], null);
  }
  if (typeof act.lat === 'number' && typeof act.lng === 'number') {
    return sanitizeCoord([act.lat, act.lng], null);
  }
  return null;
}

const activityCategoryOptions = [
  { value: 'MapPin', label: 'Sightseeing / Attraction' },
  { value: 'Utensils', label: 'Restaurant / Dining' },
  { value: 'Coffee', label: 'Café / Breakfast' },
  { value: 'ShoppingBag', label: 'Shopping / Market' },
  { value: 'Camera', label: 'Scenic View / Photography' },
  { value: 'Compass', label: 'Nature / Adventure' },
  { value: 'Navigation', label: 'Local Transit / Walk' },
  { value: 'Moon', label: 'Nightlife / Leisure' }
];

export default function TripOverview({
  trip,
  onEditTrip,
  onSaveTrip,
  savingTrip = false,
  isSaved = false,
  onViewTransport,
  onBackToTrips,
  onRetry,
  loading = false,
  error = null,
  onChangeItinerary
}) {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(1);
  const [fullMapOpen, setFullMapOpen] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // UI-3.4 Itinerary Customization state
  const [localItinerary, setLocalItinerary] = useState(() => Array.isArray(trip?.itinerary) ? trip.itinerary : []);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingIndex, setEditingIndex] = useState(null);
  const [activityForm, setActivityForm] = useState({
    title: '',
    time: '10:00 AM',
    duration: '1h 30m',
    cost: 0,
    icon: 'MapPin',
    desc: ''
  });
  const [formError, setFormError] = useState('');
  const [isItineraryCustomized, setIsItineraryCustomized] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const lastEmittedItineraryRef = useRef(null);

  // Keep local itinerary synchronized when trip prop changes externally
  React.useEffect(() => {
    if (Array.isArray(trip?.itinerary)) {
      if (lastEmittedItineraryRef.current && trip.itinerary === lastEmittedItineraryRef.current) {
        return;
      }
      setLocalItinerary(trip.itinerary);
      setIsItineraryCustomized(false);
    }
  }, [trip?.itinerary]);

  const notifyItineraryChange = (updatedItinerary) => {
    lastEmittedItineraryRef.current = updatedItinerary;
    setIsItineraryCustomized(true);
    setLocalItinerary(updatedItinerary);
    if (typeof onChangeItinerary === 'function') {
      onChangeItinerary(updatedItinerary);
    }
  };

  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingIndex(null);
    setFormError('');
    setActivityForm({
      title: '',
      time: '11:30 AM',
      duration: '1h 30m',
      cost: 0,
      icon: 'MapPin',
      desc: ''
    });
    setActivityModalOpen(true);
  };

  const handleOpenEditModal = (act, idx) => {
    setModalMode('edit');
    setEditingIndex(idx);
    setFormError('');
    setActivityForm({
      title: act.title || '',
      time: act.time || '10:00 AM',
      duration: act.duration || '1h 30m',
      cost: typeof act.cost === 'number' ? act.cost : 0,
      icon: act.icon || 'MapPin',
      desc: act.desc || ''
    });
    setActivityModalOpen(true);
  };

  const handleSaveActivityModal = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activityForm.title.trim()) {
      setFormError('Activity title is required');
      return;
    }

    const updated = localItinerary.map((dayItem, dIdx) => {
      const dayNum = dayItem.day ?? (dIdx + 1);
      if (dayNum !== selectedDay) return dayItem;

      const activities = [...(dayItem.activities || [])];
      const newAct = {
        ...(modalMode === 'edit' && editingIndex !== null ? activities[editingIndex] : {}),
        title: activityForm.title.trim(),
        time: activityForm.time.trim() || '10:00 AM',
        duration: activityForm.duration.trim() || '1h',
        cost: Math.max(0, Number(activityForm.cost) || 0),
        icon: activityForm.icon || 'MapPin',
        desc: activityForm.desc.trim(),
        isCustom: true
      };

      if (modalMode === 'edit' && editingIndex !== null) {
        activities[editingIndex] = newAct;
      } else {
        activities.push(newAct);
      }

      return {
        ...dayItem,
        activities
      };
    });

    notifyItineraryChange(updated);
    setActivityModalOpen(false);
  };

  const handleMoveActivityUp = (idx) => {
    if (idx <= 0) return;
    const updated = localItinerary.map((dayItem, dIdx) => {
      const dayNum = dayItem.day ?? (dIdx + 1);
      if (dayNum !== selectedDay) return dayItem;
      const activities = [...(dayItem.activities || [])];
      const temp = activities[idx - 1];
      activities[idx - 1] = activities[idx];
      activities[idx] = temp;
      return { ...dayItem, activities };
    });
    notifyItineraryChange(updated);
  };

  const handleMoveActivityDown = (idx) => {
    const currentActivities = currentDayPlan?.activities || [];
    if (idx >= currentActivities.length - 1) return;
    const updated = localItinerary.map((dayItem, dIdx) => {
      const dayNum = dayItem.day ?? (dIdx + 1);
      if (dayNum !== selectedDay) return dayItem;
      const activities = [...(dayItem.activities || [])];
      const temp = activities[idx + 1];
      activities[idx + 1] = activities[idx];
      activities[idx] = temp;
      return { ...dayItem, activities };
    });
    notifyItineraryChange(updated);
  };

  const handleRemoveActivity = (idx) => {
    const updated = localItinerary.map((dayItem, dIdx) => {
      const dayNum = dayItem.day ?? (dIdx + 1);
      if (dayNum !== selectedDay) return dayItem;
      const activities = (dayItem.activities || []).filter((_, i) => i !== idx);
      return { ...dayItem, activities };
    });
    notifyItineraryChange(updated);
  };

  // Safe trip normalization
  const originName = typeof trip?.from === 'string' ? trip.from.split(',')[0].trim() : 'Origin';
  const destinationName = typeof trip?.to === 'string' ? trip.to.split(',')[0].trim() : 'Destination';
  const travelersCount = parseInt(trip?.travelers, 10) || 1;
  const rawItinerary = localItinerary;
  const totalDays = rawItinerary.length > 0 ? rawItinerary.length : (parseInt(trip?.tripDays, 10) || 1);
  const daysLabel = totalDays === 1 ? '1 day' : `${totalDays} days`;
  const travelersLabel = travelersCount === 1 ? '1 Traveler' : `${travelersCount} Travelers`;

  // Travel Dates
  const startDateFormatted = formatDate(trip?.date);
  const endDateFormatted = trip?.returnDate ? formatDate(trip?.returnDate) : null;
  const dateRangeStr = endDateFormatted
    ? `${startDateFormatted} – ${endDateFormatted}`
    : startDateFormatted || 'Upcoming dates';

  // Budget calculations
  const budgetDetails = trip?.budgetDetails || {};
  const costComponents = trip?.costComponents || {};
  const transportMode = trip?.transportMode || 'flight';

  // Calculate sum of activity costs across days
  const activitiesSum = useMemo(() => {
    let sum = 0;
    let hasAuthoritativeCosts = false;

    localItinerary.forEach(day => {
      (day.activities || []).forEach(act => {
        if (typeof act.cost === 'number' || act.isCustom) {
          hasAuthoritativeCosts = true;
          if (typeof act.cost === 'number' && act.cost > 0) {
            sum += act.cost;
          }
        }
      });
    });

    // Return zero when all activity costs are zero or activities were removed/customized,
    // ensuring the budget does not restore the original food and miscellaneous costs;
    // retain undefined only when no authoritative itinerary cost data exists.
    if (hasAuthoritativeCosts || isItineraryCustomized) {
      return sum;
    }

    return undefined;
  }, [localItinerary, isItineraryCustomized]);

  const foodPart = typeof budgetDetails.food === 'number'
    ? budgetDetails.food
    : (typeof costComponents.foodCost === 'number' ? costComponents.foodCost : undefined);

  const miscPart = typeof budgetDetails.misc === 'number'
    ? budgetDetails.misc
    : (typeof costComponents.miscCost === 'number' ? costComponents.miscCost : undefined);

  const initialActivitiesCost = (foodPart ?? 0) + (miscPart ?? 0);

  const baseTotalCost = typeof budgetDetails.total === 'number'
    ? budgetDetails.total
    : (typeof costComponents.total === 'number'
        ? costComponents.total
        : (typeof trip?.budget === 'number' && trip.budget > 0
            ? trip.budget
            : (typeof Number(trip?.budget) === 'number' && !isNaN(Number(trip?.budget)) && Number(trip?.budget) > 0 ? Number(trip?.budget) : undefined)));

  const totalEstimatedCost = typeof baseTotalCost === 'number'
    ? (activitiesSum !== undefined ? Math.max(0, baseTotalCost - initialActivitiesCost + activitiesSum) : baseTotalCost)
    : undefined;

  const plannedBudget = (typeof trip?.budget === 'number' && trip.budget > 0)
    ? trip.budget
    : (typeof totalEstimatedCost === 'number' && totalEstimatedCost > 0
        ? Math.round(totalEstimatedCost * 1.25)
        : undefined);

  const remainingBudget = (typeof plannedBudget === 'number' && typeof totalEstimatedCost === 'number')
    ? plannedBudget - totalEstimatedCost
    : undefined;

  const budgetPercent = (typeof plannedBudget === 'number' && plannedBudget > 0 && typeof totalEstimatedCost === 'number')
    ? Math.min(100, Math.round((totalEstimatedCost / plannedBudget) * 100))
    : 100;

  // Breakdown metrics with explicit numeric checks preserving legitimate 0 and returning undefined for absent
  const flightsCost = typeof budgetDetails.tickets === 'number'
    ? budgetDetails.tickets
    : (typeof costComponents.flightCost === 'number' ? costComponents.flightCost : undefined);

  const staysCost = typeof budgetDetails.hotel === 'number'
    ? budgetDetails.hotel
    : (typeof costComponents.hotelCost === 'number' ? costComponents.hotelCost : undefined);

  const activitiesCost = activitiesSum !== undefined
    ? activitiesSum
    : ((foodPart !== undefined || miscPart !== undefined)
        ? ((foodPart ?? 0) + (miscPart ?? 0))
        : undefined);

  const fuelPart = typeof budgetDetails.fuel === 'number'
    ? budgetDetails.fuel
    : (typeof costComponents.fuelCost === 'number' ? costComponents.fuelCost : undefined);

  const tollPart = typeof budgetDetails.toll === 'number'
    ? budgetDetails.toll
    : (typeof costComponents.tollCost === 'number' ? costComponents.tollCost : undefined);

  const ownRoadCost = (fuelPart !== undefined || tollPart !== undefined)
    ? ((fuelPart ?? 0) + (tollPart ?? 0))
    : undefined;

  const localTransportCost = transportMode === 'own'
    ? (ownRoadCost !== undefined ? `₹${ownRoadCost.toLocaleString()}` : '—')
    : 'included';

  // Active day plan
  const currentDayPlan = useMemo(() => {
    if (rawItinerary.length === 0) return null;
    return rawItinerary.find((d, i) => (d.day ?? (i + 1)) === selectedDay) || rawItinerary[0];
  }, [rawItinerary, selectedDay]);

  // Destination coordinates for supporting map
  const destCoords = useMemo(() => {
    const coords = sanitizeCoord(trip?.coordinates?.to, null);
    if (isValidCoord(coords)) return coords;
    // Default fallback coordinates: New Delhi
    return [28.6139, 77.2090];
  }, [trip?.coordinates?.to]);

  // Real day waypoint coordinates mapped from activities, falling back to destination marker if none have valid coordinates
  const dayWaypoints = useMemo(() => {
    const rawActivities = Array.isArray(currentDayPlan?.activities) ? currentDayPlan.activities : [];
    const validWaypoints = [];

    rawActivities.forEach((act) => {
      const coord = getActivityCoordinates(act);
      if (isValidCoord(coord)) {
        validWaypoints.push({
          position: coord,
          title: act.title || 'Activity',
          time: act.time || '10:00 AM',
          desc: act.desc || '',
          idx: validWaypoints.length + 1,
          isDestination: false
        });
      }
    });

    if (validWaypoints.length === 0) {
      return [{ position: destCoords, title: destinationName, time: '10:00 AM', idx: 1, isDestination: true }];
    }

    return validWaypoints;
  }, [currentDayPlan, destCoords, destinationName]);

  // Weather data
  const weather = trip?.weather || {};
  const dayWeatherCondition = weather.condition || 'Clear skies';
  const dayWeatherTemp = weather.temp || '24°C';

  // AI suggestions for active day
  const dayAiSuggestion = useMemo(() => {
    if (selectedDay === 1) {
      return `Start sightseeing before 10 AM to avoid peak afternoon crowds at ${currentDayPlan?.activities?.[1]?.title || 'popular monuments'}.`;
    }
    if (selectedDay === totalDays) {
      return `Allow 2 hours extra for transit to airport / station during evening departure traffic.`;
    }
    return `Carry light hydration and check local bazaar hours for evening exploration.`;
  }, [selectedDay, totalDays, currentDayPlan]);

  // PDF Export
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text("ROAMLY TRAVEL ITINERARY", 20, 26);

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 48);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`${originName} -> ${destinationName}`, 20, 58);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Dates: ${dateRangeStr} | Travelers: ${travelersCount} | Duration: ${daysLabel}`, 20, 65);
      doc.text(`Estimated Total Budget: ${totalEstimatedCost !== undefined ? `INR ${totalEstimatedCost.toLocaleString()}` : 'N/A'}`, 20, 72);

      let yPos = 85;
      rawItinerary.forEach((d) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(37, 99, 235);
        doc.text(`Day ${d.day || 1}: ${d.title || 'Sightseeing'}`, 20, yPos);
        yPos += 7;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        (d.activities || []).forEach((act) => {
          doc.text(`* ${act.time || '10:00 AM'} - ${act.title || 'Activity'}: ${act.desc || ''}`, 25, yPos);
          yPos += 6;
        });
        yPos += 5;
      });

      doc.save(`Roamly_${originName}_to_${destinationName}_Itinerary.pdf`);
    } catch (err) {
      console.warn('Could not generate PDF:', err?.message || err);
    }
  };

  // Share handler
  const handleShare = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 3000);
        })
        .catch((err) => {
          console.warn('Could not copy link to clipboard:', err?.message || err);
          setShareSuccess(false);
        });
    }
  };

  // ── State 1: Loading State (Skeleton primitive) ──────────────────────────────
  if (loading) {
    return (
      <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-fade-in" aria-busy="true">
        {/* Header Skeleton */}
        <Card className="p-6 bg-white border border-slate-200 shadow-xs space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </Card>

        {/* Summary Metric Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(n => (
            <Card key={n} className="p-4 bg-white border border-slate-200 shadow-xs space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </Card>
          ))}
        </div>

        {/* 2-Column Main Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            {[1, 2, 3].map(n => (
              <Card key={n} className="p-4 bg-white border border-slate-200 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </Card>
            ))}
          </div>
          <div className="lg:col-span-5 space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── State 2: Error State (Sanitized, zero secret leakage) ────────────────────
  if (error) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 text-center animate-fade-in">
        <Card className="p-8 border border-slate-200/90 shadow-xs bg-white space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-lg text-slate-900">We couldn't load this trip.</h3>
            <p className="text-xs sm:text-sm text-slate-500">Please try again.</p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            {onRetry && (
              <Button variant="primary" size="md" onClick={onRetry} className="cursor-pointer font-semibold px-6">
                Try Again
              </Button>
            )}
            <Button variant="outline" size="md" onClick={() => navigate('/dashboard')} className="cursor-pointer font-semibold px-5">
              Back to Trips
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── State 3: Empty Itinerary State ──────────────────────────────────────────
  if (!trip || rawItinerary.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 text-center animate-fade-in">
        <Card className="p-8 border border-slate-200/90 shadow-xs bg-white space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-lg text-slate-900">No itinerary available yet</h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Generate an itinerary to start planning your trip.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => (onEditTrip ? onEditTrip() : navigate('/plan'))}
              className="cursor-pointer font-semibold px-6"
            >
              Plan Trip
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── State 4: Loaded Trip Overview Dashboard ──────────────────────────────────
  return (
    <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-fade-in">
      
      {/* 1. Trip Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        
        {/* Top breadcrumb & Actions row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="space-y-1">
            {/* Back to Trips Link */}
            <button
              type="button"
              onClick={onBackToTrips || (() => navigate('/dashboard'))}
              aria-label="← Back to Trips"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Trips</span>
            </button>

            {/* Primary Route Title */}
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight flex items-center gap-2.5 pt-1">
              <span>{originName}</span>
              <span className="text-slate-400 font-normal">→</span>
              <span>{destinationName}</span>
            </h1>

            {/* Metadata line: Nov 15 – Nov 20, 2026 · 2 Travelers · 6 days */}
            <p className="text-xs sm:text-sm text-slate-500 font-medium flex items-center gap-2 flex-wrap pt-0.5">
              <span>{dateRangeStr}</span>
              <span className="text-slate-300">·</span>
              <span>{travelersLabel}</span>
              <span className="text-slate-300">·</span>
              <span>{daysLabel}</span>
            </p>
          </div>

          {/* Action buttons: Edit Trip, Save, overflow menu */}
          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            {onEditTrip && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditTrip}
                className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Trip</span>
              </Button>
            )}

            {onSaveTrip && (
              <Button
                type="button"
                variant={isSaved ? 'outline' : 'primary'}
                size="sm"
                onClick={onSaveTrip}
                isLoading={savingTrip}
                disabled={savingTrip}
                leftIcon={isSaved ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Save className="w-3.5 h-3.5" />}
                className={`cursor-pointer font-bold shadow-xs ${
                  isSaved
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {savingTrip ? 'Saving...' : isSaved ? 'Saved' : 'Save Plan'}
              </Button>
            )}

            {/* Overflow menu [...] */}
            <div className="relative">
              <Dropdown
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
                    aria-label="Trip actions overflow menu"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                }
              >
                <div className="w-48 py-1 bg-white rounded-lg shadow-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download PDF Itinerary</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{shareSuccess ? 'Link Copied!' : 'Share Trip'}</span>
                  </button>
                  {onViewTransport && (
                    <button
                      type="button"
                      onClick={onViewTransport}
                      className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                    >
                      <Plane className="w-3.5 h-3.5 text-blue-600" />
                      <span>View Transport Options</span>
                    </button>
                  )}
                </div>
              </Dropdown>
            </div>

          </div>

        </div>

      </div>

      {/* 2. Trip Summary Section (Immediately underneath) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
              Total Estimated Cost
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
              {formatCost(totalEstimatedCost)}
            </div>
          </div>
          <span className="text-xs text-slate-500">
            For {travelersCount} {travelersCount === 1 ? 'traveler' : 'travelers'} · {daysLabel}
          </span>
        </div>

        {/* 4 Compact Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          
          {/* Card 1: Flights / Transit */}
          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
              Flights
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-900 font-mono block mt-0.5">
              {formatCost(flightsCost)}
            </span>
          </div>

          {/* Card 2: Stays */}
          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
              Stays
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-900 font-mono block mt-0.5">
              {formatCost(staysCost)}
            </span>
          </div>

          {/* Card 3: Activities */}
          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
              Activities
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-900 font-mono block mt-0.5">
              {formatCost(activitiesCost)}
            </span>
          </div>

          {/* Card 4: Transport */}
          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
              Transport
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-900 font-mono block mt-0.5">
              {localTransportCost}
            </span>
          </div>

        </div>

      </div>

      {/* 3. Main Two-Column Content: [ ITINERARY (Left) ] [ MAP & BUDGET (Right) ] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: ITINERARY (Primary Content) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
            
            {/* Itinerary Header & Day Navigation */}
            <div className="space-y-3 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                  ITINERARY
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  {totalDays} days planned
                </span>
              </div>

              {/* Day Navigation: ‹ Day 1   Day 2   Day 3 ... › */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedDay(prev => Math.max(1, prev - 1))}
                  disabled={selectedDay <= 1}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 flex-1">
                  {rawItinerary.map((d, i) => {
                    const dayNum = d.day ?? (i + 1);
                    const isActive = selectedDay === dayNum;
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => setSelectedDay(dayNum)}
                        className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Day {dayNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDay(prev => Math.min(totalDays, prev + 1))}
                  disabled={selectedDay >= totalDays}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Selected Day Header & Attached Compact Weather */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <div>
                <span className="text-xs font-bold text-blue-600 font-mono uppercase tracking-wider block">
                  DAY {selectedDay} · {getDayDate(trip?.date, selectedDay)}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-0.5">
                  {currentDayPlan?.title || 'Daily Sightseeing & Activities'}
                </h3>
              </div>

              {/* Compact Attached Weather */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-medium self-start sm:self-auto">
                <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{dayWeatherTemp}</span>
                <span className="text-amber-300">·</span>
                <span className="text-amber-800">{dayWeatherCondition}</span>
              </div>
            </div>

            {/* Reserved AI Suggestion */}
            {dayAiSuggestion && (
              <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200 text-xs flex items-start gap-2 text-purple-900">
                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-purple-950 font-mono text-[11px] uppercase tracking-wide">
                    ✨ AI Suggestion
                  </strong>
                  <span className="text-purple-800 mt-0.5 block leading-relaxed">
                    {dayAiSuggestion}
                  </span>
                </div>
              </div>
            )}

            {/* Visual Timeline Progression */}
            <div className="relative pl-6 sm:pl-8 pt-2 space-y-6">
              
              {/* Vertical Progression Line */}
              <div className="absolute left-2.5 sm:left-3.5 top-3 bottom-3 w-0.5 bg-slate-200" />

              {/* Step 1: Transit Arrival (Day 1) or Morning Start */}
              {selectedDay === 1 ? (
                <div className="relative">
                  {/* Timeline Node Icon */}
                  <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full bg-blue-600 border-2 border-white text-white flex items-center justify-center shadow-xs">
                    <Plane className="w-3 h-3" />
                  </div>

                  <Card className="p-4 bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">
                          10:30 AM
                        </span>
                        <span className="text-xs font-semibold text-slate-900">
                          ✈ Arrive in {destinationName}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {originName} → {destinationName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Touchdown and baggage claim. Proceed to hotel check-in or local transit.
                    </p>
                  </Card>
                </div>
              ) : null}

              {/* Day Activities */}
              {(currentDayPlan?.activities || []).map((activity, idx) => {
                const IconComp = iconComponentMap[activity.icon] || MapPin;
                const activityTime = activity.time || '11:00 AM';
                const activityDuration = activity.duration || '1h 30m';
                const currentActivities = currentDayPlan?.activities || [];
                const isFirst = idx === 0;
                const isLast = idx === currentActivities.length - 1;

                return (
                  <div key={idx} className="relative group">
                    {/* Timeline Node */}
                    <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-slate-100 border-2 border-white text-slate-700 flex items-center justify-center shadow-xs">
                      <span className="text-[10px] font-bold font-mono">{idx + 1}</span>
                    </div>

                    <Card className="p-4 bg-white border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        
                        {/* Dominant Title & Time with Grip Icon */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0 flex-1">
                          <span className="text-slate-300 group-hover:text-slate-500 transition-colors cursor-grab shrink-0" title="Activity position">
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono shrink-0 border border-blue-100/60">
                            {activity.time || activityTime}
                          </span>
                          <span className="text-slate-300 shrink-0">·</span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <IconComp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {activity.title}
                            </h4>
                            {activity.isCustom && (
                              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono shrink-0">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Metadata & Actions */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 self-end sm:self-auto shrink-0">
                          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{activityDuration}</span>
                          </span>
                          {activity.cost > 0 && (
                            <span className="font-mono font-medium text-slate-700 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                              ₹{activity.cost.toLocaleString()}
                            </span>
                          )}

                          {/* Action Controls: Move Up, Move Down, Edit, Delete */}
                          <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 pl-2">
                            <button
                              type="button"
                              onClick={() => handleMoveActivityUp(idx)}
                              disabled={isFirst}
                              aria-label="Move activity up"
                              title="Move up"
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveActivityDown(idx)}
                              disabled={isLast}
                              aria-label="Move activity down"
                              title="Move down"
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(activity, idx)}
                              aria-label="Edit activity"
                              title="Edit activity"
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivityToDelete({ index: idx, title: activity.title || `Activity #${idx + 1}` })}
                              aria-label="Remove activity"
                              title="Remove activity"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>

                      {activity.desc && (
                        <p className="text-xs text-slate-600 leading-relaxed pt-0.5 pl-6 sm:pl-7">
                          {activity.desc}
                        </p>
                      )}
                    </Card>
                  </div>
                );
              })}

              {/* Timeline insertion node: + Add Activity */}
              <div className="relative pt-1">
                <div className="absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 rounded-full bg-blue-50 border-2 border-white text-blue-600 flex items-center justify-center shadow-xs">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 text-blue-700 hover:bg-blue-50 hover:border-blue-500 font-semibold text-xs tracking-wide transition-all cursor-pointer group shadow-2xs"
                >
                  <Plus className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span>+ Add Activity to Day {selectedDay}</span>
                </button>
              </div>

              {/* Step Last: Final Day Return Journey */}
              {selectedDay === totalDays && totalDays > 1 ? (
                <div className="relative">
                  <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full bg-blue-600 border-2 border-white text-white flex items-center justify-center shadow-xs">
                    <Navigation className="w-3 h-3" />
                  </div>

                  <Card className="p-4 bg-white border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">
                          04:00 PM
                        </span>
                        <span className="text-xs font-semibold text-slate-900">
                          Return Journey to {originName}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Check out and transfer to airport or highway corridor for smooth return.
                    </p>
                  </Card>
                </div>
              ) : null}

            </div>

            {/* Itinerary Completion & Next Action Strip */}
            <div className="mt-6 p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Your trip itinerary is ready!</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save this plan to your dashboard or export as a PDF to share with travel companions.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPDF}
                  className="font-semibold text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export PDF</span>
                </Button>
                {onSaveTrip && (
                  <Button
                    type="button"
                    variant={isSaved ? 'outline' : 'primary'}
                    size="sm"
                    onClick={onSaveTrip}
                    isLoading={savingTrip}
                    disabled={savingTrip}
                    leftIcon={isSaved ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Save className="w-3.5 h-3.5" />}
                    className={`font-bold text-xs shadow-xs ${
                      isSaved
                        ? 'border-emerald-200 text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {savingTrip ? 'Saving...' : isSaved ? 'Saved to Trips' : 'Save to Dashboard'}
                  </Button>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: TRIP MAP (Supporting Context) & BUDGET */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* 1. Trip Map Card */}
          <Card className="bg-white border border-slate-200/90 shadow-xs overflow-hidden">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 tracking-tight uppercase font-mono">
                  TRIP MAP
                </h3>
                <span className="text-[11px] text-slate-500">
                  Day {selectedDay} Waypoints in {destinationName}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setFullMapOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>[ View Full Map ]</span>
              </button>
            </div>

            {/* Interactive Leaflet Map Container */}
            <div className="h-[320px] sm:h-[350px] w-full relative z-0">
              <MapErrorBoundary>
                <MapContainer
                  center={destCoords}
                  zoom={12}
                  scrollWheelZoom={false}
                  className="w-full h-full"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />

                  {/* Day activity markers */}
                  {dayWaypoints.map((pt, i) => (
                    <Marker
                      key={i}
                      position={pt.position}
                      icon={createTimelineMarkerIcon(pt.idx, pt.isDestination ? '#dc2626' : '#2563eb')}
                    >
                      <Popup>
                        <div className="text-xs p-1">
                          <strong className="block text-slate-900 font-bold">{pt.title}</strong>
                          <span className="text-slate-500 font-mono text-[10px]">{pt.time}</span>
                          {pt.desc && <p className="text-slate-600 mt-1">{pt.desc}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Connecting polyline */}
                  {dayWaypoints.length >= 2 && !dayWaypoints[0]?.isDestination && (
                    <Polyline
                      positions={dayWaypoints.map(p => p.position)}
                      color="#2563eb"
                      weight={3}
                      opacity={0.7}
                      dashArray="4, 6"
                    />
                  )}

                  <MapBoundsUpdater coordinates={dayWaypoints.map(p => p.position)} />
                </MapContainer>
              </MapErrorBoundary>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                <span>
                  {dayWaypoints[0]?.isDestination
                    ? `Destination stop in ${destinationName}`
                    : `${dayWaypoints.length} stops on Day ${selectedDay}`}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">Leaflet OpenStreetMap</span>
            </div>

          </Card>

          {/* 2. Compact Budget Card */}
          <Card className="p-5 bg-white border border-slate-200/90 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 tracking-tight uppercase font-mono">
                Budget
              </h3>
              <span className="text-xs text-slate-500 font-medium font-mono">
                {totalEstimatedCost !== undefined ? `₹${totalEstimatedCost.toLocaleString()} estimated` : '—'}
              </span>
            </div>

            {/* Estimated vs Planned Figures */}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight block">
                  {formatCost(totalEstimatedCost)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {plannedBudget !== undefined ? `of ₹${plannedBudget.toLocaleString()} planned` : 'Planned budget not set'}
                </span>
              </div>
              
              <div className="text-right">
                <span className={`text-sm font-bold font-mono ${
                  remainingBudget === undefined
                    ? 'text-slate-500'
                    : remainingBudget >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {remainingBudget === undefined
                    ? '—'
                    : remainingBudget >= 0 
                      ? `₹${remainingBudget.toLocaleString()} remaining`
                      : `₹${Math.abs(remainingBudget).toLocaleString()} over budget`
                  }
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {budgetPercent}% allocated
                </span>
              </div>
            </div>

            {/* Visual Progress Bar: ████████████░░░░░ 65% */}
            <div className="space-y-1">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  style={{ width: `${budgetPercent}%` }}
                  className={`h-full rounded-full transition-all ${
                    budgetPercent > 95 ? 'bg-rose-500' : (budgetPercent > 80 ? 'bg-amber-500' : 'bg-blue-600')
                  }`}
                  role="progressbar"
                  aria-valuenow={budgetPercent}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
            </div>

            {/* Category Breakdown list */}
            <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
              
              <div className="flex items-center justify-between text-slate-600">
                <span>Flights &amp; Transit</span>
                <span className="font-mono font-bold text-slate-900">{formatCost(flightsCost)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Hotels &amp; Stays</span>
                <span className="font-mono font-bold text-slate-900">{formatCost(staysCost)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Food &amp; Activities</span>
                <span className="font-mono font-bold text-slate-900">{formatCost(activitiesCost)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Local Transport &amp; Misc</span>
                <span className="font-mono font-bold text-slate-900">{localTransportCost}</span>
              </div>

            </div>

          </Card>

        </div>

      </div>

      {/* 4. Full Map Modal Sheet */}
      <Modal
        isOpen={fullMapOpen}
        onClose={() => setFullMapOpen(false)}
        title={`Full Trip Route: ${originName} → ${destinationName}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="h-[450px] w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
            <MapErrorBoundary>
              <MapContainer
                center={destCoords}
                zoom={11}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* Destination pin */}
                <Marker position={destCoords} icon={createTimelineMarkerIcon('★', '#dc2626')}>
                  <Popup>
                    <div className="text-xs">
                      <strong>{destinationName}</strong> (Main Destination)
                    </div>
                  </Popup>
                </Marker>

                {/* Day Waypoints */}
                {dayWaypoints.filter(pt => !pt.isDestination).map((pt, i) => (
                  <Marker
                    key={i}
                    position={pt.position}
                    icon={createTimelineMarkerIcon(pt.idx, '#2563eb')}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong>Day {selectedDay}: {pt.title}</strong>
                        <div>{pt.time}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                <MapBoundsUpdater coordinates={[destCoords, ...dayWaypoints.filter(pt => !pt.isDestination).map(p => p.position)]} />
              </MapContainer>
            </MapErrorBoundary>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Interactive map with full stop navigation.
            </span>
            <Button
              variant="outline"
              size="md"
              onClick={() => setFullMapOpen(false)}
              className="cursor-pointer"
            >
              Close Map
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. Add / Edit Activity Modal */}
      <Modal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title={modalMode === 'edit' ? `Edit Activity (Day ${selectedDay})` : `Add Activity to Day ${selectedDay}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveActivityModal} className="space-y-4 text-left">
          {formError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Activity Title"
            placeholder="e.g. Visit Meenakshi Temple, Dinner at Karim's"
            value={activityForm.title}
            onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Time"
              placeholder="e.g. 10:00 AM, 04:30 PM"
              value={activityForm.time}
              onChange={(e) => setActivityForm(prev => ({ ...prev, time: e.target.value }))}
              leftIcon={<Clock className="w-4 h-4" />}
            />

            <Input
              label="Duration"
              placeholder="e.g. 1h 30m, 2h"
              value={activityForm.duration}
              onChange={(e) => setActivityForm(prev => ({ ...prev, duration: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Estimated Cost (₹)"
              type="number"
              min="0"
              step="50"
              placeholder="0"
              value={activityForm.cost}
              onChange={(e) => setActivityForm(prev => ({ ...prev, cost: e.target.value }))}
            />

            <Select
              label="Category & Icon"
              value={activityForm.icon}
              onChange={(e) => setActivityForm(prev => ({ ...prev, icon: e.target.value }))}
              options={activityCategoryOptions}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="activity-description-input" className="block text-xs font-semibold text-slate-700 tracking-wide">
              Description & Notes (Optional)
            </label>
            <textarea
              id="activity-description-input"
              rows={3}
              className="w-full bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-lg border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 p-3 transition-all"
              placeholder="Key details, ticket instructions, landmark directions..."
              value={activityForm.desc}
              onChange={(e) => setActivityForm(prev => ({ ...prev, desc: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setActivityModalOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
            >
              {modalMode === 'edit' ? 'Save Changes' : 'Add Activity'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Activity Deletion Confirmation Modal */}
      <Modal
        isOpen={activityToDelete !== null}
        onClose={() => setActivityToDelete(null)}
        title="Delete Activity"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to remove <strong className="text-slate-900 font-semibold">{activityToDelete?.title}</strong> from Day {selectedDay}?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActivityToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (activityToDelete !== null) {
                  handleRemoveActivity(activityToDelete.index);
                  setActivityToDelete(null);
                }
              }}
            >
              Remove Activity
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
