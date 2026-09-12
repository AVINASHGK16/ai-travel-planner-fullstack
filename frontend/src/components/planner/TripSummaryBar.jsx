import React from 'react';
import { ChevronLeft, Save, Sparkles, Compass, Route } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

/**
 * Roamly TripSummaryBar Component
 * Rendered at the top of active trip results with title, metadata chips, and save action.
 */
export function TripSummaryBar({
  activeTrip,
  onBackToSearch,
  onSaveTrip,
  savingTrip = false,
  className = ''
}) {
  if (!activeTrip) return null;

  const originName = typeof activeTrip.from === 'string' ? activeTrip.from.split(',')[0].trim() : 'Origin';
  const destinationName = typeof activeTrip.to === 'string' ? activeTrip.to.split(',')[0].trim() : 'Destination';

  return (
    <Card className={`p-4 sm:p-5 bg-white border-slate-200/90 shadow-xs ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Back Button & Route Details */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onBackToSearch}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors group cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Plan new trip</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 tracking-tight">
              {originName} to {destinationName} Plan
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 pt-0.5">
            <span>
              Departing <strong className="text-slate-700 font-medium">{activeTrip.date || 'N/A'}</strong>
            </span>
            {activeTrip.returnDate && (
              <>
                <span>•</span>
                <span>
                  Returning <strong className="text-slate-700 font-medium">{activeTrip.returnDate}</strong>
                </span>
              </>
            )}
            <span>•</span>
            <span>
              <strong className="text-slate-700 font-medium">{activeTrip.travelers || 1}</strong> {activeTrip.travelers === 1 ? 'Traveler' : 'Travelers'}
            </span>
            {activeTrip.distance && (
              <>
                <span>•</span>
                <span>
                  Distance: <strong className="text-slate-700 font-medium">{activeTrip.distance} km</strong>
                </span>
              </>
            )}
          </div>

          {/* Chips & Badges */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {activeTrip.isAIGenerated ? (
              <Badge variant="ai" size="sm">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>Gemini AI Narrative</span>
              </Badge>
            ) : (
              <Badge variant="warning" size="sm" title={activeTrip.generationNotice || 'Curated standard plan'}>
                <Compass className="w-3 h-3 text-amber-600" />
                <span>Standard Plan (Curated)</span>
              </Badge>
            )}

            {activeTrip.routeDetails?.source && (
              <Badge variant="primary" size="sm">
                <Route className="w-3 h-3 text-blue-600" />
                <span>Route: {String(activeTrip.routeDetails.source).toUpperCase()}</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onSaveTrip}
            isLoading={savingTrip}
            disabled={savingTrip}
            leftIcon={<Save className="w-4 h-4" />}
            className="cursor-pointer"
          >
            {savingTrip ? 'Saving...' : 'Save Plan'}
          </Button>
        </div>

      </div>
    </Card>
  );
}

export default TripSummaryBar;
