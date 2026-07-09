import React, { useState, useEffect } from 'react';
import { Compass, Sparkles, ChevronLeft, Save } from 'lucide-react';
import Navbar from './components/Navbar';
import HeroSearch from './components/HeroSearch';
import SmartSuggestions from './components/SmartSuggestions';
import TravelOptions from './components/TravelOptions';
import RoadTripDetails from './components/RoadTripDetails';
import WeatherInfo from './components/WeatherInfo';
import BudgetCalculator from './components/BudgetCalculator';
import ItineraryGenerator from './components/ItineraryGenerator';
import ChatAssistant from './components/ChatAssistant';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import SettingsPanel from './components/SettingsPanel';
import { generateMockData, getAIGeneration, buildTripAIPrompt } from './utils/planner';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [view, setView] = useState('home'); // 'home' | 'search' | 'dashboard'
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState(null);
  
  // Trip details state
  const [activeTrip, setActiveTrip] = useState(null);
  const [activeMode, setActiveMode] = useState('flight'); // 'flight' | 'train' | 'bus' | 'cab' | 'own'
  
  // Settings/API Keys state
  const [settings, setSettings] = useState({
    geminiKey: localStorage.getItem('geminiKey') || '',
    openWeatherKey: localStorage.getItem('openWeatherKey') || '',
    googleMapsKey: localStorage.getItem('googleMapsKey') || ''
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Authentication State
  const [auth, setAuth] = useState({
    user: JSON.parse(localStorage.getItem('user')) || null,
    modalOpen: false
  });

  // Saved Trips History
  const [savedTrips, setSavedTrips] = useState([]);

  // Load saved trips when user logs in or components mount
  useEffect(() => {
    const fetchTrips = async () => {
      if (auth.user?.email) {
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
          const response = await fetch(`${backendUrl}/api/trips?email=${encodeURIComponent(auth.user.email)}`);
          if (response.ok) {
            const data = await response.json();
            setSavedTrips(data);
          } else {
            throw new Error('Server returned error status');
          }
        } catch (error) {
          console.warn('Backend offline, loading trips from localStorage fallback:', error.message);
          const localTrips = JSON.parse(localStorage.getItem('savedTrips')) || [];
          const userTrips = localTrips.filter(t => t.userEmail === auth.user.email);
          setSavedTrips(userTrips);
        }
      } else {
        setSavedTrips([]);
      }
    };

    fetchTrips();
  }, [auth.user]);

  const handleLoginSuccess = (user) => {
    setAuth({ user, modalOpen: false });
    localStorage.setItem('user', JSON.stringify(user));
  };

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('geminiKey', newSettings.geminiKey);
    localStorage.setItem('openWeatherKey', newSettings.openWeatherKey);
    localStorage.setItem('googleMapsKey', newSettings.googleMapsKey);
    alert('Developer keys successfully configured!');
  };

  // Perform search and fetch AI travel plans
  const handleSearch = async (params) => {
    setSearchParams(params);
    setLoading(true);
    setView('search');

    // Default to flight tab or own vehicle depending on selection
    if (params.preferredMode && params.preferredMode !== 'any') {
      setActiveMode(params.preferredMode);
    } else {
      setActiveMode('flight');
    }

    try {
      if (settings.geminiKey) {
        // Run using live Gemini AI API
        const prompt = buildTripAIPrompt(
          params.from,
          params.to,
          params.date,
          params.returnDate,
          params.travelers,
          params.budget,
          params.preferredMode
        );
        
        const responseData = await getAIGeneration(settings.geminiKey, prompt);
        
        // Formulate coordinates
        const fromCoords = generateMockData(params.from, params.to).coordinates.from;
        const toCoords = generateMockData(params.from, params.to).coordinates.to;
        const midCoords = [(fromCoords[0] + toCoords[0]) / 2, (fromCoords[1] + toCoords[1]) / 2];

        // Format transport options based on distances
        const options = generateMockData(params.from, params.to, params.date, params.returnDate, params.travelers, params.budget).options;

        const completeTripData = {
          ...responseData,
          from: params.from,
          to: params.to,
          date: params.date,
          returnDate: params.returnDate || null,
          travelers: parseInt(params.travelers) || 1,
          budget: parseFloat(params.budget) || 2500,
          distance: generateMockData(params.from, params.to).distance,
          coordinates: { from: fromCoords, to: toCoords, mid: midCoords },
          options
        };

        setActiveTrip(completeTripData);
      } else {
        // Run in premium mock mode
        const mockData = generateMockData(
          params.from,
          params.to,
          params.date,
          params.returnDate,
          params.travelers,
          params.budget
        );
        
        // Emulate network latency
        await new Promise(resolve => setTimeout(resolve, 1500));
        setActiveTrip(mockData);
      }
    } catch (err) {
      console.error(err);
      alert('AI itinerary request failed. Falling back to local data generation engine.');
      const fallbackData = generateMockData(
        params.from,
        params.to,
        params.date,
        params.returnDate,
        params.travelers,
        params.budget
      );
      setActiveTrip(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  // Save current active plan to dashboard
  const handleSaveActiveTrip = async () => {
    if (!auth.user) {
      alert('Please Sign In first to save your trip itinerary!');
      setAuth(prev => ({ ...prev, modalOpen: true }));
      return;
    }

    // Verify if already saved to avoid duplicates
    const alreadySaved = savedTrips.some(
      t => t.from === activeTrip.from && t.to === activeTrip.to && t.date === activeTrip.date
    );

    if (alreadySaved) {
      alert('This trip plan is already saved in your dashboard history.');
      return;
    }

    const tripToSave = {
      ...activeTrip,
      userEmail: auth.user.email
    };

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tripToSave)
      });

      if (!response.ok) {
        throw new Error('Failed to save trip to backend');
      }

      const savedData = await response.json();
      setSavedTrips(prev => [savedData, ...prev]);
      
      // Also sync to local storage for offline redundancy
      const localTrips = JSON.parse(localStorage.getItem('savedTrips')) || [];
      localStorage.setItem('savedTrips', JSON.stringify([savedData, ...localTrips]));
      
      alert('Trip itinerary successfully saved to your dashboard!');
    } catch (err) {
      console.warn('Backend offline, saving trip locally:', err.message);
      // Generate standard mock id for local tracking
      const localSavedTrip = {
        ...tripToSave,
        _id: `local_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      setSavedTrips(prev => [localSavedTrip, ...prev]);

      const localTrips = JSON.parse(localStorage.getItem('savedTrips')) || [];
      localStorage.setItem('savedTrips', JSON.stringify([localSavedTrip, ...localTrips]));

      alert('Trip itinerary saved locally (Offline Mode).');
    }
  };

  // Delete trip from history
  const handleDeleteTrip = async (tripIdOrIndex) => {
    // If it's a string ID, call the API
    if (typeof tripIdOrIndex === 'string') {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/trips/${tripIdOrIndex}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          throw new Error('Failed to delete trip from backend');
        }
        
        // Remove from local state
        setSavedTrips(prev => prev.filter(t => t._id !== tripIdOrIndex));
        
        // Remove from local storage fallback
        const localTrips = JSON.parse(localStorage.getItem('savedTrips')) || [];
        const filteredLocal = localTrips.filter(t => t._id !== tripIdOrIndex);
        localStorage.setItem('savedTrips', JSON.stringify(filteredLocal));
      } catch (err) {
        console.warn('Backend delete failed, performing local removal:', err.message);
        
        // If backend was offline, remove from state and local storage fallback
        setSavedTrips(prev => prev.filter(t => t._id !== tripIdOrIndex));
        
        const localTrips = JSON.parse(localStorage.getItem('savedTrips')) || [];
        const filteredLocal = localTrips.filter(t => t._id !== tripIdOrIndex);
        localStorage.setItem('savedTrips', JSON.stringify(filteredLocal));
      }
    } else {
      // Fallback for index
      const tripToDelete = savedTrips[tripIdOrIndex];
      setSavedTrips(prev => prev.filter((_, i) => i !== tripIdOrIndex));
      if (tripToDelete) {
        const localTrips = JSON.parse(localStorage.getItem('savedTrips')) || [];
        const filteredLocal = localTrips.filter(t => t._id !== tripToDelete._id);
        localStorage.setItem('savedTrips', JSON.stringify(filteredLocal));
      }
    }
  };

  // Select trip from dashboard history to view
  const handleSelectTrip = (trip) => {
    setActiveTrip(trip);
    setView('search');
    if (trip.options?.own) {
      setActiveMode('own');
    } else {
      setActiveMode('flight');
    }
  };

  const handleChangeItinerary = (newItinerary) => {
    setActiveTrip(prev => {
      if (!prev) return prev;
      
      const newMisc = newItinerary.reduce((acc, day) => {
        return acc + day.activities.reduce((sum, act) => sum + (parseFloat(act.cost) || 0), 0);
      }, 0);

      const updatedBudgetDetails = prev.budgetDetails ? {
        ...prev.budgetDetails,
        misc: newMisc,
        total: (prev.budgetDetails.tickets || 0) +
               (prev.budgetDetails.fuel || 0) +
               (prev.budgetDetails.hotel || 0) +
               (prev.budgetDetails.food || 0) +
               (prev.budgetDetails.toll || 0) +
               (prev.budgetDetails.parking || 0) +
               newMisc
      } : null;

      return {
        ...prev,
        itinerary: newItinerary,
        ...(updatedBudgetDetails && { budgetDetails: updatedBudgetDetails })
      };
    });
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between ${theme === 'dark' ? 'bg-[#080b11] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Top Navbar */}
      <Navbar
        theme={theme}
        setTheme={setTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        auth={auth}
        setAuth={setAuth}
        setView={setView}
        view={view}
      />

      {/* Main Container Content */}
      <main className="flex-grow pb-16">
        
        {/* VIEW 1: HOME PAGE */}
        {view === 'home' && (
          <div className="relative min-h-[calc(100vh-72px)] flex flex-col items-center justify-center overflow-hidden">
            {/* Animated background orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" />
              <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] animate-pulse" style={{animationDelay:'1.5s'}} />
              <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-indigo-500/8 blur-[100px] animate-pulse" style={{animationDelay:'3s'}} />
            </div>
            {/* Hero dot-grid background pattern */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.06) 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }} />
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
              <HeroSearch onSearch={handleSearch} />
            </div>
            {/* Powered-by strip */}
            <div className="relative z-10 mt-6 text-center text-xs text-slate-500 flex items-center gap-2">
              <div className="h-px w-12 bg-white/10"/>
              <span>Powered by Gemini AI · Leaflet OSM · OpenWeather</span>
              <div className="h-px w-12 bg-white/10"/>
            </div>
          </div>
        )}

        {/* VIEW 2: LOADING SCREEN */}
        {view === 'search' && loading && (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
            <div className="relative">
              <Compass className="w-16 h-16 text-blue-500 animate-spin-slow" />
              <Sparkles className="w-6 h-6 text-purple-400 absolute -top-1 -right-1 animate-bounce" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-white">Generating Best Travel Plan</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-[280px]">
                Analyzing routing channels, lodging indexes, petrol stations, and coordinates...
              </p>
            </div>
          </div>
        )}

        {/* VIEW 3: SEARCH RESULTS PAGE */}
        {view === 'search' && !loading && activeTrip && (
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            
            {/* Header / Summary panel */}
            <div className="flex flex-col md:flex-row justify-between md:items-center p-5 rounded-2xl glass border border-white/10 gap-4">
              <div>
                <button
                  onClick={() => setView('home')}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold mb-2 group transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back to search</span>
                </button>
                <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
                  {activeTrip.from.split(',')[0]} to {activeTrip.to.split(',')[0]} Plan
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Departing {activeTrip.date} • {activeTrip.travelers} Travelers • Distance: {activeTrip.distance} km
                </p>
              </div>

              {/* Action items */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveActiveTrip}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Plan</span>
                </button>
              </div>
            </div>

            {/* Smart AI suggestions row */}
            <SmartSuggestions 
              suggestions={activeTrip.suggestions} 
              onSelectMode={(mode) => setActiveMode(mode)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Transport options grid (Left 8 cols) */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Core booking tabs */}
                <div className="p-6 rounded-2xl glass border border-white/10">
                  <h3 className="font-display font-bold text-lg text-white mb-4">Compare & Book Transports</h3>
                  <TravelOptions
                    from={activeTrip.from}
                    to={activeTrip.to}
                    date={activeTrip.date}
                    options={activeTrip.options}
                    activeMode={activeMode}
                    setActiveMode={setActiveMode}
                  >
                    <RoadTripDetails tripData={activeTrip} />
                  </TravelOptions>
                </div>

                {/* Day-by-day Itinerary */}
                <div className="p-6 rounded-2xl glass border border-white/10">
                  <ItineraryGenerator 
                    itinerary={activeTrip.itinerary} 
                    onChangeItinerary={handleChangeItinerary}
                  />
                </div>

              </div>

              {/* Weather, Budget details (Right 4 cols) */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* Weather widget */}
                <WeatherInfo 
                  weather={activeTrip.weather} 
                  destination={activeTrip.to}
                  openWeatherKey={settings.openWeatherKey}
                />

                {/* Budget Calculator */}
                <BudgetCalculator 
                  budgetDetails={activeTrip.budgetDetails} 
                  travelers={activeTrip.travelers}
                />

              </div>

            </div>

            {/* Floating Chat Assistant */}
            <ChatAssistant tripData={activeTrip} settings={settings} />

          </div>
        )}

        {/* VIEW 4: USER DASHBOARD SAVED TRIPS */}
        {view === 'dashboard' && (
          <>
            <Dashboard
              savedTrips={savedTrips}
              onDeleteTrip={handleDeleteTrip}
              onSelectTrip={handleSelectTrip}
              setView={setView}
            />
            {/* Show Chatbot even on dashboard with last active trip info */}
            {savedTrips.length > 0 && (
              <ChatAssistant tripData={savedTrips[0]} settings={settings} />
            )}
          </>
        )}

      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={auth.modalOpen}
        onClose={() => setAuth(prev => ({ ...prev, modalOpen: false }))}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Settings Modal */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Bottom Footer */}
      <footer className="py-6 border-t border-white/5 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} AI Travel Planner Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="cursor-pointer hover:text-slate-400">Privacy Policy</span>
            <span>•</span>
            <span className="cursor-pointer hover:text-slate-400">Terms of Use</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
