import React, { useState } from 'react';
import { Mic, MicOff, Search, MapPin, Calendar, Users, DollarSign, Navigation, Loader2 } from 'lucide-react';

export default function HeroSearch({ onSearch, loading = false }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [budget, setBudget] = useState(2500);
  const [preferredMode, setPreferredMode] = useState('any'); // 'any' | 'flight' | 'train' | 'bus' | 'cab' | 'own'
  
  // Voice recognition states
  const [listeningField, setListeningField] = useState(null); // 'from' | 'to' | null

  const handleVoiceSearch = (field) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    if (listeningField === field) {
      try { recognition.stop(); } catch {}
      setListeningField(null);
      return;
    }

    try {
      setListeningField(field);
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      setListeningField(null);
      return;
    }

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      // Clean up string (e.g. remove trailing periods)
      const cleanText = speechToText.replace(/\.$/g, '');
      if (field === 'from') setFrom(cleanText);
      if (field === 'to') setTo(cleanText);
      setListeningField(null);
    };

    recognition.onerror = () => {
      setListeningField(null);
    };

    recognition.onend = () => {
      setListeningField(null);
    };
  };

  // Timezone-safe local today string (YYYY-MM-DD)
  const now = new Date();
  const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    if (!from.trim() || !to.trim() || !date) {
      alert('Please fill out Starting Location, Destination, and Departure Date.');
      return;
    }
    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      alert('Starting location and Destination must be different.');
      return;
    }
    if (date < todayLocalStr) {
      alert('Departure date cannot be in the past.');
      return;
    }
    if (returnDate && returnDate < date) {
      alert('Return date cannot be earlier than departure date.');
      return;
    }
    const cleanTravelers = Math.min(50, Math.max(1, parseInt(travelers, 10) || 1));
    const cleanBudget = Math.max(100, Math.min(10000000, parseInt(budget, 10) || 2500));
    onSearch({ from: from.trim(), to: to.trim(), date, returnDate: returnDate || null, travelers: cleanTravelers, budget: cleanBudget, preferredMode });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-16">
      
      {/* Dynamic Title Hero */}
      <div className="text-center mb-10">
        <h1 className="font-display font-extrabold text-4xl md:text-6xl text-white tracking-tight leading-none">
          Plan Your Next <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Adventure</span> with AI
        </h1>
        <p className="mt-4 text-base md:text-lg text-slate-400 max-w-xl mx-auto">
          Compare flights, trains, buses, cabs, and road trips. Get tailored itineraries and budget recommendations instantly.
        </p>
      </div>

      {/* Main Search Panel */}
      <form 
        onSubmit={handleSubmit} 
        className="w-full rounded-2xl glass border border-white/10 shadow-2xl p-6 md:p-8 space-y-6 animate-fade-in text-slate-200"
      >
        
        {/* From & To inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Starting Location */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Starting Location
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-blue-400">
                <MapPin className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="e.g. Bangalore, IN"
                className="w-full pl-12 pr-12 py-3 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => handleVoiceSearch('from')}
                className={`absolute right-3.5 top-3 p-1 rounded-lg transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed text-slate-500' :
                  listeningField === 'from' 
                    ? 'bg-red-500/20 text-red-400 animate-pulse' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Voice Search"
              >
                {listeningField === 'from' ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Destination
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-indigo-400">
                <Navigation className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="e.g. Hyderabad, IN"
                className="w-full pl-12 pr-12 py-3 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder-slate-500"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => handleVoiceSearch('to')}
                className={`absolute right-3.5 top-3 p-1 rounded-lg transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed text-slate-500' :
                  listeningField === 'to' 
                    ? 'bg-red-500/20 text-red-400 animate-pulse' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Voice Search"
              >
                {listeningField === 'to' ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Dates, Travelers, Preferred Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Departure Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Departure Date
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Calendar className="w-4.5 h-4.5" />
              </span>
              <input
                type="date"
                required
                min={todayLocalStr}
                value={date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setDate(newDate);
                  if (returnDate && newDate > returnDate) {
                    setReturnDate('');
                  }
                }}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Return Date (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Return Date (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Calendar className="w-4.5 h-4.5" />
              </span>
              <input
                type="date"
                min={date || todayLocalStr}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Number of Travelers */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Travelers
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Users className="w-4.5 h-4.5" />
              </span>
              <input
                type="number"
                min="1"
                max="50"
                value={travelers}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (Number.isNaN(val)) setTravelers('');
                  else setTravelers(Math.min(50, Math.max(1, val)));
                }}
                onBlur={() => {
                  if (!travelers || travelers < 1) setTravelers(1);
                  else if (travelers > 50) setTravelers(50);
                }}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"
              />
            </div>
          </div>

          {/* Preferred Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Travel Mode
            </label>
            <select
              value={preferredMode}
              onChange={(e) => setPreferredMode(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"
            >
              <option value="any">Compare All Modes</option>
              <option value="flight">Flights Only</option>
              <option value="train">Trains Only</option>
              <option value="bus">Buses Only</option>
              <option value="cab">Cabs Only</option>
              <option value="own">Own Vehicle (Road Trip)</option>
            </select>
          </div>
        </div>

        {/* Budget Slider */}
        <div className="p-4 bg-slate-900/35 border border-white/5 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Approximate Budget
            </label>
            <span className="text-sm font-semibold text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              ₹{budget.toLocaleString()} / USD ${(Math.round(budget/80))}
            </span>
          </div>
          <input
            type="range"
            min="500"
            max="15000"
            step="250"
            value={budget}
            onChange={(e) => setBudget(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
            <span>₹500 (Economy)</span>
            <span>₹5,000 (Standard)</span>
            <span>₹15,000+ (Luxury)</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium text-base rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group ${
              loading ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Planning Trip...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5 group-hover:scale-115 transition-transform" />
                <span>Plan Trip</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
