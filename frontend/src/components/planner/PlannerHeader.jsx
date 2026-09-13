import React from 'react';

/**
 * Roamly PlannerHeader Component — UI-3
 * Page introduction featuring prominent "Adventure with AI" branding
 * and clear value proposition.
 */
export function PlannerHeader({ className = '' }) {
  return (
    <div className={`text-center space-y-2.5 max-w-2xl mx-auto ${className}`}>
      <h1
        aria-label="Plan Your Trip - Plan Your Next Adventure with AI"
        className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight"
      >
        Plan Your Next{' '}
        <span className="text-blue-600 inline-block">
          Adventure with AI
        </span>
      </h1>
      <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl mx-auto">
        Tell us where you're going and we'll help you build the perfect itinerary with live routes, fares, and AI insights.
      </p>
    </div>
  );
}

export default PlannerHeader;

