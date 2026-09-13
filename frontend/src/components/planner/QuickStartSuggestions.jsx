import React from 'react';
import { Compass, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

/**
 * QuickStartSuggestions Component — Roamly UI-3.1
 * Curated inspiration corridors with larger photography cards,
 * clear typography hierarchy, duration, route, and budget.
 */
export function QuickStartSuggestions({ onSelectSuggestion, className = '' }) {
  // Compute safe future dates (e.g., departing in 7 days, returning in 10-11 days)
  const now = new Date();
  const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const departureDateObj = new Date(now);
  departureDateObj.setDate(now.getDate() + 7);
  const defaultDeparture = formatYMD(departureDateObj);

  const getReturnDate = (days) => {
    const retObj = new Date(departureDateObj);
    retObj.setDate(departureDateObj.getDate() + days);
    return formatYMD(retObj);
  };

  const suggestions = [
    {
      id: 'goa-weekend',
      title: 'Goa Weekend',
      tagline: 'Coastal beaches & sunset cruises',
      image: '/images/destinations/goa.jpg',
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
      image: '/images/destinations/rajasthan.jpg',
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
      image: '/images/destinations/himalayas.jpg',
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
      image: '/images/destinations/kerala.jpg',
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
    <div className={`w-full max-w-[1180px] mx-auto space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-base text-slate-900 tracking-tight">
            Need inspiration?
          </h3>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Popular destinations for your next adventure
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {suggestions.map((item) => (
          <Card
            key={item.id}
            onClick={() => handleCardClick(item)}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-0 flex flex-col bg-white"
          >
            {/* Travel Photography Hero (16:10 aspect ratio, visually focused) */}
            <div className="relative h-48 sm:h-50 w-full overflow-hidden bg-slate-100">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-black/10" />
              
              {/* Category Badge */}
              <div className="absolute top-3 left-3">
                <Badge variant="primary" size="sm" className="bg-white/95 text-blue-700 shadow-xs backdrop-blur-xs font-semibold">
                  {item.category}
                </Badge>
              </div>

              {/* Duration Chip */}
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-900/80 text-white backdrop-blur-xs">
                  {item.days} Days
                </span>
              </div>

              {/* Destination Title */}
              <div className="absolute bottom-3 left-3 right-3">
                <h4 className="font-bold text-base text-white drop-shadow-xs group-hover:text-blue-200 transition-colors">
                  {item.title}
                </h4>
              </div>
            </div>

            {/* Card Details */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <p className="text-xs text-slate-500 line-clamp-1 leading-snug">
                {item.tagline}
              </p>

              {/* Corridor & Budget Line */}
              <div className="text-xs text-slate-600 font-medium flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-500">
                  {item.from} <span className="text-blue-600 font-semibold">→ {item.to}</span>
                </span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  ₹{item.budget.toLocaleString()}
                </span>
              </div>

              {/* Interactive CTA Cue */}
              <div className="pt-1 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
                <span>Configure Trip</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default QuickStartSuggestions;
