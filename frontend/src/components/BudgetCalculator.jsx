import React, { useState } from 'react';
import { PiggyBank, Sparkles, TrendingDown, ArrowRight, Lightbulb } from 'lucide-react';

export default function BudgetCalculator({ budgetDetails, travelers, onOptimize }) {
  if (!budgetDetails) return null;

  const [optimized, setOptimized] = useState(false);
  const travelersCount = travelers || 1;

  // Optimizations calculator
  const originalTotal = budgetDetails.total;
  
  // Standard optimizations
  const optDetails = {
    tickets: Math.round(budgetDetails.tickets * 0.75), // Switch to 3AC train or saver flight
    fuel: budgetDetails.fuel, // Can't easily optimize fuel
    hotel: Math.round(budgetDetails.hotel * 0.7), // 3-star instead of 4-star
    food: Math.round(budgetDetails.food * 0.8), // Local authentic food joints
    toll: budgetDetails.toll,
    parking: Math.round(budgetDetails.parking * 0.7), // Prebook parking or public spots
    misc: Math.round(budgetDetails.misc * 0.6) // Cut unnecessary expenses
  };
  
  optDetails.total = Object.values(optDetails).reduce((a, b) => a + b, 0) - optDetails.total; // Calculate total sum correctly
  const optSum = optDetails.tickets + optDetails.fuel + optDetails.hotel + optDetails.food + optDetails.toll + optDetails.parking + optDetails.misc;
  optDetails.total = optSum;

  const activeDetails = optimized ? optDetails : budgetDetails;
  const savings = originalTotal - optDetails.total;

  const costItems = [
    { label: 'Ticket cost', value: activeDetails.tickets, color: 'bg-blue-500' },
    { label: 'Fuel cost', value: activeDetails.fuel, color: 'bg-emerald-500' },
    { label: 'Hotel stay', value: activeDetails.hotel, color: 'bg-pink-500' },
    { label: 'Food & Meals', value: activeDetails.food, color: 'bg-orange-500' },
    { label: 'Tolls & Passes', value: activeDetails.toll, color: 'bg-yellow-500' },
    { label: 'Parking fees', value: activeDetails.parking, color: 'bg-teal-500' },
    { label: 'Miscellaneous', value: activeDetails.misc, color: 'bg-purple-500' }
  ].filter(item => item.value > 0); // Hide zero categories

  const maxVal = Math.max(...costItems.map(i => i.value));

  return (
    <div className="p-5 rounded-2xl glass border border-white/10 text-slate-200">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/5 mb-5 gap-3">
        <div>
          <h4 className="font-display font-semibold text-base text-white flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-400" />
            Trip Budget Breakdown
          </h4>
          <p className="text-xs text-slate-400">Detailed cost tracking ({travelersCount} travelers)</p>
        </div>
        
        {/* Toggle optimizer */}
        <button
          onClick={() => setOptimized(!optimized)}
          className={`flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 ${
            optimized
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
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
                  <span className="text-slate-300">{item.label}</span>
                  <span className="font-mono text-white">₹{item.value.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-slate-900/60 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals & Suggestions summary card (Right) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-xl border border-white/5 bg-slate-900/25">
          
          {/* Price details */}
          <div className="text-center py-2.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Total Estimated Cost</span>
            <span className="text-3xl font-extrabold text-white font-mono block my-1">
              ₹{activeDetails.total.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ~ USD ${(Math.round(activeDetails.total / 80))} total
            </span>
          </div>

          {/* Optimizer recommendations box */}
          <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 space-y-2">
            <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1.5 uppercase">
              <Lightbulb className="w-3.5 h-3.5 shrink-0" />
              AI Recommendations
            </span>
            
            {optimized ? (
              <div className="space-y-1">
                <p className="text-xs text-slate-300 leading-normal">
                  Applied saver fares, local dining spots and 3-star lodging rates.
                </p>
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1 font-mono">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Saved ₹{savings.toLocaleString()}!
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-slate-400 leading-normal">
                  Toggle the optimizer to lower stays by 30% and transportation fares by 25%.
                </p>
                <button
                  onClick={() => setOptimized(true)}
                  className="text-xs text-blue-400 font-semibold hover:text-blue-300 transition-colors flex items-center gap-1.5 mt-1 hover:underline group"
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
