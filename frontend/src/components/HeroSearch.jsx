import React, { useState } from 'react';
import { Mic, MicOff, Search, MapPin, Calendar, Users, DollarSign, Navigation } from 'lucide-react';

export default function HeroSearch({ onSearch }) {
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
      recognition.stop();
      setListeningField(null);
      return;
    }

    setListeningField(field);
    recognition.start();

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!from || !to || !date) {
      alert('Please fill out Starting Location, Destination, and Departure Date.');
      return;
    }
    onSearch({ from, to, date, returnDate, travelers, budget, preferredMode });
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
                onClick={() => handleVoiceSearch('from')}
                className={`absolute right-3.5 top-3 p-1 rounded-lg transition-colors ${
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
                onClick={() => handleVoiceSearch('to')}
                className={`absolute right-3.5 top-3 p-1 rounded-lg transition-colors ${
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
                onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
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
            className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium text-base rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            <Search className="w-5 h-5 group-hover:scale-115 transition-transform" />
            Plan Trip
          </button>
        </div>

      </form>
    </div>
  );
}
