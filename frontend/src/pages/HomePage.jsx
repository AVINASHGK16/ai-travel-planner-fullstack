import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSearch from '../components/HeroSearch';
import { QuickStartSuggestions } from '../components/planner';

export default function HomePage() {
  const navigate = useNavigate();

  const handleSearch = (params) => {
    navigate('/plan', { state: { searchParams: params } });
  };

  const handleSelectSuggestion = (params) => {
    navigate('/plan', { state: { searchParams: params } });
  };

  return (
    <div className="relative min-h-[calc(100vh-60px)] flex flex-col items-center justify-start overflow-hidden py-10 px-4">
      {/* Animated subtle background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Hero dot-grid background pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.12) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Feature badges */}
      <div className="relative z-10 flex items-center gap-2.5 mb-6 flex-wrap justify-center max-w-2xl">
        {[
          { icon: '✈️', label: 'AI Itineraries' },
          { icon: '🗺️', label: 'Live Route Maps' },
          { icon: '💰', label: 'Budget Optimizer' },
          { icon: '⛽', label: 'Road Trip Guide' },
          { icon: '🌤️', label: 'Weather Alerts' },
        ].map((badge, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-slate-200 shadow-xs text-xs font-medium text-slate-700">
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        ))}
      </div>

      {/* Main search form */}
      <div className="relative z-10 w-full max-w-4xl">
        <HeroSearch onSearch={handleSearch} loading={false} />
      </div>

      {/* Destination Inspiration */}
      <div className="relative z-10 w-full max-w-4xl mt-12">
        <QuickStartSuggestions onSelectSuggestion={handleSelectSuggestion} />
      </div>

      {/* Powered-by strip */}
      <div className="relative z-10 mt-10 mb-6 text-center text-xs text-slate-400 flex items-center justify-center gap-3">
        <div className="h-px w-12 bg-slate-200" />
        <span>Powered by Gemini AI · Leaflet OSM · OpenWeather</span>
        <div className="h-px w-12 bg-slate-200" />
      </div>
    </div>
  );
}
