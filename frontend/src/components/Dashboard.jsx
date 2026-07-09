import React from 'react';
import { jsPDF } from 'jspdf';
import { Download, Share2, Trash2, Calendar, MapPin, DollarSign, Compass, ArrowRight } from 'lucide-react';

export default function Dashboard({ savedTrips, onDeleteTrip, onSelectTrip, setView }) {
  
  // Download Trip plan as PDF using jsPDF
  const handleDownloadPDF = (e, trip) => {
    e.stopPropagation(); // Avoid triggering route select on click
    
    try {
      const doc = new jsPDF();
      
      // Theme colors
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');
      
      // Header
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.text("AI TRAVEL PLANNER ITINERARY", 20, 26);
      
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
      doc.text(`Starting Point: ${trip.from}`, 20, 72);
      doc.text(`Destination: ${trip.to}`, 20, 79);
      doc.text(`Travel Date: ${trip.date}`, 20, 86);
      doc.text(`No. of Travelers: ${trip.travelers}`, 20, 93);
      doc.text(`Approx. Distance: ${trip.distance || 'N/A'} km`, 20, 100);
      doc.text(`Budget Tier Level: ₹${trip.budget.toLocaleString()}`, 20, 107);
      
      // Cost Breakdown Section
      doc.line(20, 114, 190, 114);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("2. ESTIMATED COST LOGISTICS", 20, 124);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      const budget = trip.budgetDetails;
      if (budget) {
        doc.text(`- Transportation Tickets: INR ${budget.tickets.toLocaleString()}`, 25, 134);
        doc.text(`- Road Fuel / Energy Charges: INR ${budget.fuel.toLocaleString()}`, 25, 141);
        doc.text(`- Hotel / Lodging Stays: INR ${budget.hotel.toLocaleString()}`, 25, 148);
        doc.text(`- Fooding & Daily Meals: INR ${budget.food.toLocaleString()}`, 25, 155);
        doc.text(`- Highway Tolls / Passes: INR ${budget.toll.toLocaleString()}`, 25, 162);
        doc.text(`- Miscellaneous Buffers: INR ${budget.misc.toLocaleString()}`, 25, 169);
        
        doc.setFont('Helvetica', 'bold');
        doc.text(`TOTAL ESTIMATED BUDGET: INR ${budget.total.toLocaleString()}`, 20, 180);
      } else {
        doc.text(`- Total Allocated Budget Cap: INR ${trip.budget.toLocaleString()}`, 25, 134);
      }
      
      // Add a page for the detailed Itinerary
      doc.addPage();
      doc.setFillColor(15, 23, 42); // Header
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text("DETAILED TRAVEL ITINERARY SCHEDULE", 20, 16);
      
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(12);
      let yOffset = 40;
      
      if (trip.itinerary && trip.itinerary.length > 0) {
        trip.itinerary.forEach((dayPlan) => {
          if (yOffset > 250) {
            doc.addPage();
            yOffset = 30;
          }
          doc.setFont('Helvetica', 'bold');
          doc.text(`DAY ${dayPlan.day} - ${dayPlan.title}`, 20, yOffset);
          yOffset += 8;
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(10);
          dayPlan.activities.forEach((act) => {
            if (yOffset > 270) {
              doc.addPage();
              yOffset = 30;
            }
            doc.text(`[${act.time}] ${act.title}: ${act.desc}`, 25, yOffset, { maxWidth: 160 });
            yOffset += 11;
          });
          yOffset += 6;
          doc.setFontSize(12);
        });
      } else {
        doc.text("No specific day schedule generated.", 20, 40);
      }
      
      // Save
      doc.save(`Trip_${trip.from.split(',')[0]}_to_${trip.to.split(',')[0]}.pdf`);
      
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Error printing PDF: " + err.message);
    }
  };

  // Share or copy link
  const handleShareTrip = (e, trip) => {
    e.stopPropagation();
    const shareText = `Check out my travel plan from ${trip.from} to ${trip.to} on ${trip.date}! Planned using AI Travel Planner.`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      alert('Trip share text copied to clipboard! Paste it anywhere to share.');
    } else {
      alert(shareText);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-10 text-slate-300">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/10 pb-6 mb-8 gap-4">
        <div>
          <h2 className="font-display font-extrabold text-3xl text-white tracking-tight">Saved Travel History</h2>
          <p className="text-sm text-slate-400">Review, manage and download your custom itineraries</p>
        </div>
        <button
          onClick={() => setView('home')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-[0.98] self-start"
        >
          Plan A New Trip
        </button>
      </div>

      {/* Empty State */}
      {savedTrips.length === 0 ? (
        <div className="py-20 rounded-2xl glass border border-white/5 text-center max-w-md mx-auto flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-blue-500/15 text-blue-400">
            <Compass className="w-10 h-10 animate-bounce" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white">No Trips Logged</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              You don't have any trip itineraries saved. Submit the search bar to generate and save one.
            </p>
          </div>
        </div>
      ) : (
        /* History Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedTrips.map((trip, idx) => (
            <div
              key={idx}
              onClick={() => onSelectTrip(trip)}
              className="group rounded-2xl glass border border-white/10 overflow-hidden hover:border-white/25 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl flex flex-col justify-between"
            >
              
              {/* Card Body */}
              <div className="p-5 space-y-4">
                {/* Header Row */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded-lg">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{trip.date}</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    ₹{trip.budgetDetails?.total?.toLocaleString() || trip.budget.toLocaleString()}
                  </span>
                </div>

                {/* Cities */}
                <div>
                  <h4 className="font-display font-bold text-lg text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                    <span className="truncate max-w-[100px]">{trip.from.split(',')[0]}</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="truncate max-w-[100px]">{trip.to.split(',')[0]}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>Distance: {trip.distance || 'N/A'} km • {trip.travelers} travelers</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 bg-slate-950/20 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  {/* Download */}
                  <button
                    onClick={(e) => handleDownloadPDF(e, trip)}
                    title="Download Trip PDF"
                    className="p-2 bg-slate-900 border border-white/5 hover:border-blue-500/30 text-slate-300 hover:text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  {/* Share */}
                  <button
                    onClick={(e) => handleShareTrip(e, trip)}
                    title="Share Itinerary"
                    className="p-2 bg-slate-900 border border-white/5 hover:border-indigo-500/30 text-slate-300 hover:text-white rounded-lg transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this saved travel plan?')) {
                      onDeleteTrip(trip._id || idx);
                    }
                  }}
                  title="Remove Plan"
                  className="p-2 bg-slate-900 border border-white/5 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
