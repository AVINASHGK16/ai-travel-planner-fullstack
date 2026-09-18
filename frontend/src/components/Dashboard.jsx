import React, { useState, useMemo, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Download, Share2, Trash2, Calendar, Users, Compass, ArrowRight, Loader2, Plus, Check } from 'lucide-react';
import { Button, Badge, Modal } from './ui';

export default function Dashboard({
  savedTrips = [],
  onDeleteTrip,
  onSelectTrip,
  setView,
  deletingTripId = null,
  loadingTrips = false
}) {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'saved'
  const [copiedTripId, setCopiedTripId] = useState(null);
  const [shareErrorTripId, setShareErrorTripId] = useState(null);
  const [tripToDelete, setTripToDelete] = useState(null);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Timezone-safe local today string (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (!year || !month || !day) return dateStr;
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Categorize trips into upcoming, past, saved
  const categorizedTrips = useMemo(() => {
    const list = Array.isArray(savedTrips) ? savedTrips.filter(Boolean) : [];
    const upcoming = [];
    const past = [];

    list.forEach(trip => {
      const compareDate = trip?.returnDate || trip?.date;
      if (!compareDate || compareDate >= todayStr) {
        upcoming.push(trip);
      } else {
        past.push(trip);
      }
    });

    return {
      upcoming,
      past,
      saved: list
    };
  }, [savedTrips, todayStr]);

  const displayedTrips = activeTab === 'upcoming'
    ? categorizedTrips.upcoming
    : activeTab === 'past'
    ? categorizedTrips.past
    : categorizedTrips.saved;

  // Download Trip plan as PDF using jsPDF
  const handleDownloadPDF = (e, trip) => {
    e.stopPropagation();

    try {
      const doc = new jsPDF();

      // Theme colors
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');

      // Header
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text("ROAMLY TRAVEL ITINERARY", 20, 26);

      // Route Details Banner
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Document generated on: ${new Date().toLocaleDateString()}`, 20, 48);

      // Trip Overview Segment
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 52, 190, 52);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("1. TRIP SUMMARY OVERVIEW", 20, 62);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Starting Point: ${trip?.from || 'Origin'}`, 20, 72);
      doc.text(`Destination: ${trip?.to || 'Destination'}`, 20, 79);
      const dateDisplay = trip?.returnDate ? `${trip?.date || 'N/A'} to ${trip.returnDate}` : (trip?.date || 'N/A');
      doc.text(`Travel Dates: ${dateDisplay}`, 20, 86);
      doc.text(`No. of Travelers: ${trip?.travelers || 1}`, 20, 93);
      doc.text(`Approx. Distance: ${trip?.distance || 'N/A'} km`, 20, 100);
      doc.text(`Budget Tier Level: INR ${Number(trip?.budget || 0).toLocaleString()}`, 20, 107);

      // Cost Breakdown Section
      doc.line(20, 114, 190, 114);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("2. ESTIMATED COST LOGISTICS", 20, 124);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      const budget = trip?.budgetDetails;
      if (budget) {
        doc.text(`- Transportation Tickets: INR ${Number(budget.tickets || 0).toLocaleString()}`, 25, 134);
        doc.text(`- Road Fuel / Energy Charges: INR ${Number(budget.fuel || 0).toLocaleString()}`, 25, 141);
        doc.text(`- Hotel / Lodging Stays: INR ${Number(budget.hotel || 0).toLocaleString()}`, 25, 148);
        doc.text(`- Fooding & Daily Meals: INR ${Number(budget.food || 0).toLocaleString()}`, 25, 155);
        doc.text(`- Highway Tolls / Passes: INR ${Number(budget.toll || 0).toLocaleString()}`, 25, 162);
        doc.text(`- Miscellaneous Buffers: INR ${Number(budget.misc || 0).toLocaleString()}`, 25, 169);

        doc.setFont('Helvetica', 'bold');
        doc.text(`TOTAL ESTIMATED BUDGET: INR ${Number(budget.total || 0).toLocaleString()}`, 20, 180);
      } else {
        doc.text(`- Total Allocated Budget Cap: INR ${Number(trip?.budget || 0).toLocaleString()}`, 25, 134);
      }

      // Add a page for the detailed Itinerary
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text("DETAILED TRAVEL ITINERARY SCHEDULE", 20, 16);

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(12);
      let yOffset = 40;

      if (Array.isArray(trip?.itinerary) && trip.itinerary.length > 0) {
        trip.itinerary.filter(Boolean).forEach((dayPlan) => {
          if (yOffset > 250) {
            doc.addPage();
            yOffset = 30;
          }
          doc.setFont('Helvetica', 'bold');
          doc.text(`DAY ${dayPlan.day ?? 1} - ${dayPlan.title || 'Plan'}`, 20, yOffset);
          yOffset += 8;

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(10);
          (dayPlan.activities || []).filter(act => act && typeof act === 'object').forEach((act) => {
            if (yOffset > 270) {
              doc.addPage();
              yOffset = 30;
            }
            doc.text(`[${act.time || 'Schedule'}] ${act.title || 'Activity'}: ${act.desc || ''}`, 25, yOffset, { maxWidth: 160 });
            yOffset += 11;
          });
          yOffset += 6;
          doc.setFontSize(12);
        });
      } else {
        doc.text("No specific day schedule generated.", 20, 40);
      }

      // Save
      const fromCity = (typeof trip?.from === 'string' ? trip.from : 'Origin').split(',')[0].trim().replace(/[^\w\s-]/g, '');
      const toCity = (typeof trip?.to === 'string' ? trip.to : 'Destination').split(',')[0].trim().replace(/[^\w\s-]/g, '');
      doc.save(`Trip_${fromCity || 'Origin'}_to_${toCity || 'Destination'}.pdf`);

    } catch (err) {
      console.error("PDF generation failed:", err?.message || err);
    }
  };

  // Share or copy link with inline visual feedback
  const handleShareTrip = async (e, trip) => {
    e.stopPropagation();
    const tripId = trip?._id || trip?.id;
    const shareFrom = typeof trip?.from === 'string' ? trip.from : 'Origin';
    const shareTo = typeof trip?.to === 'string' ? trip.to : 'Destination';
    const shareDate = trip?.date || 'upcoming date';
    const shareText = `Check out my travel plan from ${shareFrom} to ${shareTo} on ${shareDate}! Planned using Roamly.`;

    if (navigator?.share) {
      try {
        await navigator.share({
          title: `Trip to ${shareTo}`,
          text: shareText,
          url: window.location.href
        });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
        // If navigator.share fails or is denied, fall back to clipboard
      }
    }

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        setShareErrorTripId(null);
        setCopiedTripId(tripId);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedTripId(null), 2500);
      } catch (err) {
        console.warn('Could not copy trip details to clipboard:', err?.message || err);
        setCopiedTripId(null);
        setShareErrorTripId(tripId);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setShareErrorTripId(null), 3000);
      }
    } else {
      setCopiedTripId(null);
      setShareErrorTripId(tripId);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setShareErrorTripId(null), 3000);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-6 mb-6 border-b border-slate-200/80 gap-4">
        <div>
          <h1 className="font-semibold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            My Trips
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your upcoming and saved journeys
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setView ? setView('plan') : null}
          className="self-start sm:self-auto gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>+ Plan New Trip</span>
        </Button>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1.5 mb-6 p-1 bg-slate-100 rounded-lg border border-slate-200/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 border border-transparent'
          }`}
        >
          <span>Upcoming</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-600'
          }`}>
            {categorizedTrips.upcoming.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === 'past'
              ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 border border-transparent'
          }`}
        >
          <span>Past</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'past' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-600'
          }`}>
            {categorizedTrips.past.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === 'saved'
              ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 border border-transparent'
          }`}
        >
          <span>Saved</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'saved' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-600'
          }`}>
            {categorizedTrips.saved.length}
          </span>
        </button>
      </div>

      {/* Loading State */}
      {loadingTrips ? (
        <div className="py-20 bg-white rounded-xl border border-slate-200/90 shadow-xs text-center max-w-md mx-auto flex flex-col items-center gap-3 p-8">
          <div className="p-3.5 rounded-full bg-blue-50 text-blue-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900">Loading Trips...</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
              Retrieving your saved journeys and itineraries.
            </p>
          </div>
        </div>
      ) : displayedTrips.length === 0 ? (
        /* Empty State */
        <div className="py-16 bg-white rounded-xl border border-slate-200/90 shadow-xs text-center max-w-md mx-auto flex flex-col items-center px-6 p-8">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-lg text-slate-900">
            {activeTab === 'upcoming' ? 'No upcoming trips' : activeTab === 'past' ? 'No past trips' : 'No saved trips yet'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-[320px]">
            {activeTab === 'upcoming'
              ? 'You have no scheduled trips coming up. Plan your next adventure now with live routes and fares.'
              : activeTab === 'past'
              ? 'Trips you take in the future will automatically appear here once completed.'
              : 'You do not have any trips saved. Start exploring routes and create your first itinerary.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-5 gap-1.5 shadow-sm"
            onClick={() => setView ? setView('plan') : null}
          >
            <Plus className="w-4 h-4" />
            <span>+ Plan a Trip</span>
          </Button>
        </div>
      ) : (
        /* Trips Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedTrips.map((trip, idx) => {
            const tripId = trip._id || trip.id || `trip_${idx}`;
            const fromCity = typeof trip.from === 'string' ? trip.from.split(',')[0].trim() : 'Origin';
            const toCity = typeof trip.to === 'string' ? trip.to.split(',')[0].trim() : 'Destination';
            const totalCost = trip.budgetDetails?.total ? Number(trip.budgetDetails.total) : Number(trip.budget || 0);
            const safeTotalStr = !Number.isNaN(totalCost) ? totalCost.toLocaleString() : '0';

            const compareDate = trip.returnDate || trip.date;
            const isUpcoming = !compareDate || compareDate >= todayStr;

            const formattedStart = formatDate(trip.date);
            const formattedReturn = formatDate(trip.returnDate);
            const dateDisplay = formattedStart && formattedReturn
              ? `${formattedStart} – ${formattedReturn}`
              : formattedStart || trip.date || 'Flexible dates';

            return (
              <div
                key={tripId}
                role="button"
                tabIndex={0}
                aria-label={`View itinerary for ${fromCity} to ${toCity}`}
                onClick={() => {
                  if (deletingTripId) return;
                  onSelectTrip(trip);
                }}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    if (!deletingTripId) onSelectTrip(trip);
                  }
                }}
                className="group bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden text-left"
              >
                {/* Card Content */}
                <div className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={isUpcoming ? 'success' : 'default'} size="sm">
                      {isUpcoming ? 'Upcoming' : 'Completed'}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-900 font-mono">
                      ₹{safeTotalStr}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-semibold text-base sm:text-lg text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                      <span className="truncate">{fromCity}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{toCity}</span>
                    </h2>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{dateDisplay}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {trip.travelers || 1} {trip.travelers === 1 ? 'traveler' : 'travelers'}
                          {trip.distance ? ` • ${trip.distance} km` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTrip(trip);
                    }}
                  >
                    <span>View Trip</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleDownloadPDF(e, trip)}
                      title="Download PDF"
                      aria-label="Download trip PDF"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleShareTrip(e, trip)}
                      title={
                        shareErrorTripId === tripId
                          ? 'Failed to share or copy'
                          : copiedTripId === tripId
                          ? 'Copied to clipboard!'
                          : 'Share Itinerary'
                      }
                      aria-label="Share trip itinerary"
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        shareErrorTripId === tripId
                          ? 'text-red-700 bg-red-50 border-red-200'
                          : copiedTripId === tripId
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white border-transparent hover:border-slate-200'
                      }`}
                    >
                      {shareErrorTripId === tripId ? (
                        <span className="text-[10px] font-bold text-red-600 px-0.5">Failed</span>
                      ) : copiedTripId === tripId ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={deletingTripId === tripId}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (deletingTripId) return;
                        setTripToDelete({ id: tripId, title: `${fromCity} → ${toCity}` });
                      }}
                      title="Delete Trip"
                      aria-label="Delete saved trip"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      {deletingTripId === tripId ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Accessible In-App Delete Confirmation Modal */}
      <Modal
        isOpen={tripToDelete !== null}
        onClose={() => setTripToDelete(null)}
        title="Delete Trip Itinerary"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete your trip to{' '}
            <strong className="text-slate-900 font-semibold">{tripToDelete?.title || 'this destination'}</strong>?
            This action will remove the saved itinerary and cannot be undone.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTripToDelete(null)}
              disabled={deletingTripId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deletingTripId === tripToDelete?.id}
              onClick={async () => {
                const id = tripToDelete?.id;
                if (id) {
                  await onDeleteTrip(id);
                  setTripToDelete(null);
                }
              }}
            >
              Delete Trip
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
