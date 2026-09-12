import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSearch from '../components/HeroSearch';

export default function HomePage() {
  const navigate = useNavigate();

  const handleSearch = (params) => {
    navigate('/plan', { state: { searchParams: params } });
  };

  return (
    <div className="relative min-h-[calc(100vh-72px)] flex flex-col items-center justify-center overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-indigo-500/8 blur-[100px] animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Hero dot-grid background pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.06) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Feature badges */}
      <div className="relative z-10 flex items-center gap-3 mb-6 flex-wrap justify-center px-4">
        {[
          { icon: '✈️', label: 'AI Itineraries' },
          { icon: '🗺️', label: 'Live Route Maps' },
          { icon: '💰', label: 'Budget Optimizer' },
          { icon: '⛽', label: 'Road Trip Guide' },
          { icon: '🌤️', label: 'Weather Alerts' },
        ].map((badge, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-white/10 text-xs font-medium text-slate-300">
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        ))}
      </div>

      {/* Main search form */}
      <div className="relative z-10 w-full">
        <HeroSearch onSearch={handleSearch} loading={false} />
      </div>

      {/* Powered-by strip */}
      <div className="relative z-10 mt-6 text-center text-xs text-slate-500 flex items-center gap-2">
        <div className="h-px w-12 bg-white/10" />
        <span>Powered by Gemini AI · Leaflet OSM · OpenWeather</span>
        <div className="h-px w-12 bg-white/10" />
      </div>
    </div>
  );
}
