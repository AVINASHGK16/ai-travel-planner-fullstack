import React from 'react';
import { DollarSign, Zap, Armchair, BadgePercent, Leaf, ArrowRight } from 'lucide-react';

export default function SmartSuggestions({ suggestions, onSelectMode }) {
  if (!suggestions) return null;

  const cardConfig = {
    cheapest: {
      icon: DollarSign,
      color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
      glow: 'shadow-emerald-500/5 hover:border-emerald-500/40',
      tag: 'bg-emerald-500/10 text-emerald-400',
      actionKey: 'train'
    },
    fastest: {
      icon: Zap,
      color: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
      glow: 'shadow-blue-500/5 hover:border-blue-500/40',
      tag: 'bg-blue-500/10 text-blue-400',
      actionKey: 'flight'
    },
    comfort: {
      icon: Armchair,
      color: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
      glow: 'shadow-purple-500/5 hover:border-purple-500/40',
      tag: 'bg-purple-500/10 text-purple-400',
      actionKey: 'flight'
    },
    value: {
      icon: BadgePercent,
      color: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
      glow: 'shadow-orange-500/5 hover:border-orange-500/40',
      tag: 'bg-orange-500/10 text-orange-400',
      actionKey: 'train'
    },
    eco: {
      icon: Leaf,
      color: 'text-teal-400 border-teal-500/20 bg-teal-500/5',
      glow: 'shadow-teal-500/5 hover:border-teal-500/40',
      tag: 'bg-teal-500/10 text-teal-400',
      actionKey: 'own'
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="p-1 rounded bg-blue-500/10 text-blue-400 text-xs font-bold uppercase">AI</span>
        <h3 className="font-display font-bold text-lg text-white">Smart Recommendations</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(suggestions).map(([key, item]) => {
          const config = cardConfig[key] || cardConfig.value;
          const IconComponent = config.icon;

          return (
            <div
              key={key}
              onClick={() => onSelectMode(config.actionKey)}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between group shadow-sm ${config.color} ${config.glow}`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-white/5 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${config.tag}`}>
                    {item.badge}
                  </span>
                </div>

                {/* Title */}
                <h4 className="font-display font-semibold text-sm text-slate-300">{item.title}</h4>
                <p className="text-xs font-bold text-white font-mono mt-1">₹{item.price?.toLocaleString() || 'N/A'}</p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{item.desc}</p>
              </div>

              {/* Action Link */}
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mt-4 group-hover:text-white transition-colors self-end">
                <span>Select</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
