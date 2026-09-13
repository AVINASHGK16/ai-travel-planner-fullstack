import React from 'react';
import { Check, Sparkles } from 'lucide-react';

/**
 * TravelFeatureStrip Component — Roamly UI-3.1
 * Visually restrained supporting proof-point section with four evenly distributed items.
 */
export function TravelFeatureStrip({ className = '' }) {
  const features = [
    {
      id: 'flights',
      icon: <Check className="w-4 h-4 text-blue-600" />,
      text: 'Live flight data'
    },
    {
      id: 'itineraries',
      icon: <Check className="w-4 h-4 text-blue-600" />,
      text: 'Curated itineraries'
    },
    {
      id: 'maps',
      icon: <Check className="w-4 h-4 text-blue-600" />,
      text: 'Maps & navigation'
    },
    {
      id: 'ai',
      icon: <Sparkles className="w-4 h-4 text-purple-600" />,
      text: 'AI recommendations'
    }
  ];

  return (
    <div className={`w-full max-w-[1180px] mx-auto py-3 px-5 sm:px-8 bg-slate-50/75 rounded-xl border border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600 ${className}`}>
      {features.map((f) => (
        <div key={f.id} className="flex items-center justify-center gap-2 font-medium py-1">
          <span className="shrink-0">{f.icon}</span>
          <span className="tracking-tight text-slate-700 font-semibold">{f.text}</span>
        </div>
      ))}
    </div>
  );
}

export default TravelFeatureStrip;
