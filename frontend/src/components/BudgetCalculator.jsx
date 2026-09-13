import React, { useState } from 'react';
import { PiggyBank, Sparkles, TrendingDown, ArrowRight, Lightbulb, Plane, Train, Bus, Car, Navigation } from 'lucide-react';

const MODE_LABELS = {
  flight: { label: 'Flight', icon: Plane, ticketLabel: 'Flight Airfare' },
  train: { label: 'Train', icon: Train, ticketLabel: 'Train Ticket' },
  bus: { label: 'Bus', icon: Bus, ticketLabel: 'Bus Ticket' },
  cab: { label: 'Cab', icon: Car, ticketLabel: 'Cab Fare' },
  own: { label: 'Own Vehicle', icon: Navigation, ticketLabel: 'Vehicle Transit' }
};

export default function BudgetCalculator({ budgetDetails, travelers, activeMode = 'flight', onOptimize }) {
  const [optimized, setOptimized] = useState(false);

  if (!budgetDetails) return null;

  const currentMode = (activeMode || budgetDetails.mode || 'flight').toLowerCase();
  const travelersCount = travelers || 1;
  const modeMeta = MODE_LABELS[currentMode] || MODE_LABELS.flight;
  const ModeIcon = modeMeta.icon;

  // Base raw components
  const rawTickets = Number(budgetDetails.tickets) || 0;
  const rawFuel = Number(budgetDetails.fuel) || 0;
  const rawHotel = Number(budgetDetails.hotel) || 0;
  const rawFood = Number(budgetDetails.food) || 0;
  const rawToll = Number(budgetDetails.toll) || 0;
  const rawParking = Number(budgetDetails.parking) || 0;
  const rawMisc = Number(budgetDetails.misc) || 0;

  // Enforce mode-aware mutual exclusivity
  let tickets = 0;
  let fuel = 0;
  let toll = 0;
  let parking = 0;

  if (currentMode === 'flight' || currentMode === 'train' || currentMode === 'bus' || currentMode === 'cab') {
    tickets = rawTickets;
    fuel = 0;
    toll = 0;
    parking = 0;
  } else if (currentMode === 'own') {
    tickets = 0;
    fuel = rawFuel;
    toll = rawToll;
    parking = rawParking;
  }

  const hotel = rawHotel;
  const food = rawFood;
  const misc = rawMisc;

  const computedTotal = tickets + fuel + hotel + food + toll + parking + misc;
  const originalTotal = (budgetDetails.mode === currentMode && typeof budgetDetails.total === 'number')
    ? budgetDetails.total
    : computedTotal;

  // Standard optimizations strictly for active mode
  const optDetails = {
    tickets: Math.round(tickets * 0.75), // Saver class fare
    fuel: fuel, // Fuel price cannot be reduced
    hotel: Math.round(hotel * 0.7), // 3-star lodging instead of luxury
    food: Math.round(food * 0.8), // Regional authentic food joints
    toll: toll, // Highway tolls are fixed
    parking: Math.round(parking * 0.7), // Prebook spots or public lots
    misc: Math.round(misc * 0.6) // Cut unnecessary expenses
  };

  const optSum = optDetails.tickets + optDetails.fuel + optDetails.hotel + optDetails.food + optDetails.toll + optDetails.parking + optDetails.misc;
  optDetails.total = optSum;

  const activeDetails = optimized ? optDetails : {
    tickets, fuel, hotel, food, toll, parking, misc, total: originalTotal
  };
  const savings = Math.max(0, originalTotal - optDetails.total);

  // Items to display in the chart (only relevant non-zero categories for this mode)
  const costItems = [
    { label: modeMeta.ticketLabel, value: activeDetails.tickets, color: 'bg-blue-500' },
    { label: 'Vehicle Fuel', value: activeDetails.fuel, color: 'bg-emerald-500' },
    { label: 'Hotel stay', value: activeDetails.hotel, color: 'bg-pink-500' },
    { label: 'Food & Meals', value: activeDetails.food, color: 'bg-orange-500' },
    { label: 'Highway Tolls', value: activeDetails.toll, color: 'bg-yellow-500' },
    { label: 'Parking fees', value: activeDetails.parking, color: 'bg-teal-500' },
    { label: 'Miscellaneous', value: activeDetails.misc, color: 'bg-purple-500' }
  ].filter(item => item.value > 0);

  const maxVal = costItems.length > 0 ? Math.max(...costItems.map(i => i.value)) : 0;

  return (
    <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs text-slate-800">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-5 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-base text-slate-900 tracking-tight flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
              Trip Budget Breakdown
            </h4>
            <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
              <ModeIcon className="w-3 h-3" />
              {modeMeta.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Mode-specific cost tracking ({travelersCount} travelers)</p>
        </div>
        
        {/* Toggle optimizer */}
        <button
          onClick={() => setOptimized(!optimized)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            optimized
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{optimized ? 'Optimized Mode Active' : 'AI Budget Optimizer'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Cost items bar chart (Left) */}
        <div className="lg:col-span-7 space-y-3.5">
          {costItems.map((item, idx) => {
            const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700">{item.label}</span>
                  <span className="font-mono font-bold text-slate-900">₹{item.value.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals & Suggestions summary card (Right) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-xl border border-slate-200/80 bg-slate-50/70">
          
          {/* Price details */}
          <div className="text-center py-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Total Estimated Cost</span>
            <span className="text-3xl font-extrabold text-slate-900 font-mono block my-1">
              ₹{(Number(activeDetails.total) || 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ~ USD ${Math.round((Number(activeDetails.total) || 0) / 80)} total
            </span>
          </div>

          {/* Optimizer recommendations box */}
          <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5 uppercase">
              <Lightbulb className="w-3.5 h-3.5 shrink-0" />
              Recommendations
            </span>
            
            {optimized ? (
              <div className="space-y-1">
                <p className="text-xs text-slate-600 leading-normal">
                  Applied saver fares, local authentic dining and 3-star lodging rates.
                </p>
                <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-1 font-mono">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Saved ₹{(Number(savings) || 0).toLocaleString()}!
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 leading-normal">
                  Toggle optimizer to apply saver accommodation rates and travel fare discounts.
                </p>
                <button
                  onClick={() => setOptimized(true)}
                  className="text-xs text-blue-600 font-semibold hover:text-blue-700 transition-colors flex items-center gap-1 mt-1 hover:underline cursor-pointer group"
                >
                  <span>Optimize Budget</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
