import React from 'react';
import { DollarSign, Zap, Armchair, BadgePercent, Leaf, ArrowRight } from 'lucide-react';

export default function SmartSuggestions({ suggestions, onSelectMode, isAIGenerated = false }) {
  if (!suggestions || typeof suggestions !== 'object') return null;

  const cardConfig = {
    cheapest: {
      icon: DollarSign,
      color: 'text-emerald-700 border-emerald-200/80 bg-white hover:border-emerald-400 hover:shadow-xs',
      glow: 'shadow-xs',
      tag: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      actionKey: 'train'
    },
    fastest: {
      icon: Zap,
      color: 'text-blue-700 border-blue-200/80 bg-white hover:border-blue-400 hover:shadow-xs',
      glow: 'shadow-xs',
      tag: 'bg-blue-50 text-blue-700 border border-blue-200',
      actionKey: 'flight'
    },
    comfort: {
      icon: Armchair,
      color: 'text-purple-700 border-purple-200/80 bg-white hover:border-purple-400 hover:shadow-xs',
      glow: 'shadow-xs',
      tag: 'bg-purple-50 text-purple-700 border border-purple-200',
      actionKey: 'flight'
    },
    value: {
      icon: BadgePercent,
      color: 'text-amber-800 border-amber-200/80 bg-white hover:border-amber-400 hover:shadow-xs',
      glow: 'shadow-xs',
      tag: 'bg-amber-50 text-amber-800 border border-amber-200',
      actionKey: 'train'
    },
    eco: {
      icon: Leaf,
      color: 'text-teal-700 border-teal-200/80 bg-white hover:border-teal-400 hover:shadow-xs',
      glow: 'shadow-xs',
      tag: 'bg-teal-50 text-teal-700 border border-teal-200',
      actionKey: 'own'
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${
          isAIGenerated 
            ? 'bg-purple-50 text-purple-700 border border-purple-200' 
            : 'bg-slate-100 text-slate-700 border border-slate-200'
        }`}>
          {isAIGenerated ? 'AI Insights' : 'Curated Plan'}
        </span>
        <h3 className="font-semibold text-lg text-slate-900 tracking-tight">
          {isAIGenerated ? 'Smart Recommendations' : 'Curated Route Recommendations'}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {Object.entries(suggestions)
          .filter(([, item]) => item && typeof item === 'object')
          .map(([key, item]) => {
            const config = cardConfig[key] || cardConfig.value;
            const IconComponent = config.icon;
            const priceText = typeof item.price === 'number' && !Number.isNaN(item.price)
              ? `₹${item.price.toLocaleString()}`
              : (item.price ? (String(item.price).startsWith('₹') ? item.price : `₹${item.price}`) : 'N/A');

            return (
              <div
                key={key}
                onClick={() => onSelectMode(config.actionKey)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${config.color}`}
              >
                <div>
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${config.tag}`}>
                      {item.badge || 'Recommended'}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-semibold text-sm text-slate-900 leading-snug">{item.title || item.mode || 'Route Option'}</h4>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-1">{priceText}</p>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{item.desc || item.description || ''}</p>
                </div>

                {/* Action Link */}
                <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 mt-3.5 group-hover:text-blue-700 self-end">
                  <span>Select</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
