import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

/**
 * QuickStartSuggestions Component
 * Curated inspiration corridors for fast 1-click trip configuration.
 */
export function QuickStartSuggestions({ onSelectSuggestion, className = '' }) {
  // Compute safe future dates (e.g., departing in 7 days, returning in 10-11 days)
  const now = new Date();
  const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const departureDateObj = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const defaultDeparture = formatYMD(departureDateObj);

  const getReturnDate = (days) => {
    const retObj = new Date(departureDateObj.getTime() + days * 24 * 60 * 60 * 1000);
    return formatYMD(retObj);
  };

  const suggestions = [
    {
      id: 'goa-weekend',
      title: 'Goa Weekend',
      tagline: 'Coastal beaches & sunset cruises',
      from: 'Bengaluru',
      to: 'Goa',
      days: 3,
      travelers: 2,
      budget: 25000,
      preferredMode: 'flight',
      category: 'Beach & Leisure'
    },
    {
      id: 'rajasthan-explorer',
      title: 'Rajasthan Explorer',
      tagline: 'Historic forts & heritage palaces',
      from: 'Delhi',
      to: 'Jaipur',
      days: 3,
      travelers: 2,
      budget: 18000,
      preferredMode: 'train',
      category: 'Heritage'
    },
    {
      id: 'himalayan-escape',
      title: 'Himalayan Escape',
      tagline: 'Scenic foothills & mountain air',
      from: 'Delhi',
      to: 'Chandigarh',
      days: 4,
      travelers: 2,
      budget: 22000,
      preferredMode: 'own',
      category: 'Nature & Drive'
    },
    {
      id: 'kerala-getaway',
      title: 'Kerala Getaway',
      tagline: 'Backwaters, greenery & coastal serene',
      from: 'Bengaluru',
      to: 'Kochi',
      days: 4,
      travelers: 2,
      budget: 28000,
      preferredMode: 'flight',
      category: 'Wellness'
    }
  ];

  const handleCardClick = (item) => {
    if (onSelectSuggestion) {
      onSelectSuggestion({
        from: item.from,
        to: item.to,
        date: defaultDeparture,
        returnDate: getReturnDate(item.days),
        travelers: item.travelers,
        budget: item.budget,
        preferredMode: item.preferredMode
      });
    }
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-sm text-slate-800 tracking-tight">
            Need inspiration?
          </h3>
        </div>
        <span className="text-xs text-slate-400">Popular travel corridors</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {suggestions.map((item) => (
          <Card
            key={item.id}
            onClick={() => handleCardClick(item)}
            className="group cursor-pointer hover:border-blue-300 hover:shadow-xs transition-all duration-150 p-4 flex flex-col justify-between space-y-3 bg-white"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="primary" size="sm">
                  {item.category}
                </Badge>
                <span className="text-[11px] text-slate-400 font-mono">
                  {item.days} Days
                </span>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {item.tagline}
                </p>
              </div>

              <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 pt-1">
                <span>{item.from}</span>
                <span className="text-slate-400">→</span>
                <span className="text-blue-600 font-semibold">{item.to}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-900 font-mono">
                ₹{item.budget.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 text-blue-600 font-medium group-hover:translate-x-0.5 transition-transform">
                Plan <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default QuickStartSuggestions;
