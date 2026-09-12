import React from 'react';

/**
 * Roamly PlannerHeader Component
 * Compact, modern SaaS header introducing the planner workflow.
 */
export function PlannerHeader({ className = '' }) {
  return (
    <div className={`text-center space-y-1.5 max-w-2xl mx-auto ${className}`}>
      <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
        Plan Your Trip
      </h1>
      <p className="text-sm text-slate-500 leading-relaxed">
        Tell us where you're going and we'll help you build the perfect itinerary with live routes, fares, and AI insights.
      </p>
    </div>
  );
}

export default PlannerHeader;
