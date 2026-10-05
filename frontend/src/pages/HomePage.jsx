import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, MapPin, Wallet, Fuel, CloudSun } from 'lucide-react';
import { PlannerHeader } from '../components/planner/PlannerHeader';
import { TripConfigurationCard } from '../components/planner/TripConfigurationCard';
import { QuickStartSuggestions } from '../components/planner/QuickStartSuggestions';

export default function HomePage() {
  const navigate = useNavigate();

  const handleSearch = (params) => {
    navigate('/plan', { state: { searchParams: params } });
  };

  const handleApplyAIPrompt = (prompt) => {
    navigate('/plan', { state: { aiPrompt: prompt } });
  };

  const handleSelectSuggestion = (params) => {
    navigate('/plan', { state: { searchParams: params } });
  };

  const featureBadges = [
    { icon: Plane, label: 'AI Itineraries', color: 'text-blue-600' },
    { icon: MapPin, label: 'Live Route Maps', color: 'text-indigo-600' },
    { icon: Wallet, label: 'Budget Optimizer', color: 'text-emerald-600' },
    { icon: Fuel, label: 'Road Trip Guide', color: 'text-amber-600' },
    { icon: CloudSun, label: 'Weather Alerts', color: 'text-sky-600' },
  ];

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

      {/* Feature badges (Quick-link wayfinding pills) */}
      <div className="relative z-10 flex items-center gap-2.5 mb-6 flex-wrap justify-center max-w-2xl">
        {featureBadges.map((badge, i) => {
          const IconComp = badge.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E5DF] shadow-[0_1px_2px_rgba(20,23,31,0.04)] text-xs font-medium text-[#3E434D] hover:border-[#2453FF]/40 hover:-translate-y-[1px] hover:text-[#14171F] transition-all duration-150 select-none cursor-default"
            >
              <IconComp className={`w-3.5 h-3.5 ${badge.color}`} />
              <span>{badge.label}</span>
            </div>
          );
        })}
      </div>

      {/* Hero Heading */}
      <div className="relative z-10 w-full max-w-[1180px] mb-8">
        <PlannerHeader />
      </div>

      {/* Main search form matching reference design */}
      <div className="relative z-10 w-full max-w-[1180px]">
        <TripConfigurationCard 
          onSearch={handleSearch} 
          onApplyAIPrompt={handleApplyAIPrompt}
          loading={false} 
        />
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
