import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Search, MapPin, Calendar, Users, DollarSign, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

export default function HeroSearch({ onSearch, loading = false }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [budget, setBudget] = useState(25000);
  const [preferredMode, setPreferredMode] = useState('any'); // 'any' | 'flight' | 'train' | 'bus' | 'cab' | 'own'
  const [validationError, setValidationError] = useState(null);
  
  // Voice recognition states & ref
  const [listeningField, setListeningField] = useState(null); // 'from' | 'to' | null
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleVoiceSearch = (field) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setValidationError('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (listeningField === field) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      setListeningField(null);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    try {
      setListeningField(field);
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setListeningField(null);
      }
      return;
    }

    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      const speechToText = event.results[0][0].transcript;
      const cleanText = speechToText.replace(/\.$/g, '').trim();
      if (field === 'from') setFrom(cleanText);
      if (field === 'to') setTo(cleanText);
      recognitionRef.current = null;
      setListeningField(null);
      setValidationError(null);
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListeningField(null);
      const errorType = event?.error;
      if (errorType === 'not-allowed') {
        setValidationError('Microphone access was denied. Please allow microphone permissions in your browser.');
      } else if (errorType === 'no-speech') {
        setValidationError('No speech was detected. Please try speaking again.');
      } else {
        setValidationError('Voice search was interrupted. Please try again or type manually.');
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
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
      setValidationError('Please fill out Starting Location, Destination, and Departure Date.');
      return;
    }
    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      setValidationError('Starting location and Destination must be different.');
      return;
    }
    if (date < todayLocalStr) {
      setValidationError('Departure date cannot be in the past.');
      return;
    }
    if (returnDate && returnDate < date) {
      setValidationError('Return date cannot be earlier than departure date.');
      return;
    }
    setValidationError(null);
    const cleanTravelers = Math.min(50, Math.max(1, parseInt(travelers, 10) || 1));
    const cleanBudget = Math.max(100, Math.min(10000000, parseInt(budget, 10) || 25000));
    onSearch({ from: from.trim(), to: to.trim(), date, returnDate: returnDate || null, travelers: cleanTravelers, budget: cleanBudget, preferredMode });
  };

  const budgetPresets = [
    { label: '₹10,000', value: 10000 },
    { label: '₹25,000', value: 25000 },
    { label: '₹50,000', value: 50000 },
    { label: '₹1,00,000', value: 100000 }
  ];

  return (
    <div className="w-full">
      
      {/* Dynamic Title Hero */}
      <div className="text-center mb-8">
        <h1 className="font-semibold text-3xl sm:text-5xl text-slate-900 tracking-tight leading-tight">
          Plan Your Next Journey with{' '}
          <span className="text-blue-600 font-bold">
            Intelligent AI
          </span>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
          Compare live flights, trains, buses, cabs, and road trips. Generate tailored itineraries and real-time budget insights.
        </p>
      </div>

      {/* Main Search Panel */}
      <form 
        noValidate
        onSubmit={handleSubmit} 
        className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-md p-6 sm:p-8 space-y-5 text-slate-800"
      >
        {/* In-form Validation Alert */}
        {validationError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between gap-2 animate-fade-in"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{validationError}</span>
            </div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-0.5 rounded hover:bg-red-100/60 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
        {/* From & To inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Starting Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Starting Location
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-blue-600">
                <MapPin className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="e.g. Bengaluru, IN"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 placeholder:text-slate-400 transition-all"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => handleVoiceSearch('from')}
                className={`absolute right-3 top-2.5 p-1 rounded-lg transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed text-slate-400' :
                  listeningField === 'from' 
                    ? 'bg-red-50 text-red-600 animate-pulse' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Voice Search"
                aria-label="Voice search for starting location"
              >
                {listeningField === 'from' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Destination
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-indigo-600">
                <Navigation className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="e.g. Hyderabad, IN"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 placeholder:text-slate-400 transition-all"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => handleVoiceSearch('to')}
                className={`absolute right-3 top-2.5 p-1 rounded-lg transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed text-slate-400' :
                  listeningField === 'to' 
                    ? 'bg-red-50 text-red-600 animate-pulse' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Voice Search"
                aria-label="Voice search for destination"
              >
                {listeningField === 'to' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Dates, Travelers, Preferred Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Departure Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Departure Date
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Calendar className="w-4 h-4" />
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
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs text-slate-900 transition-all"
              />
            </div>
          </div>

          {/* Return Date (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Return Date (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                min={date || todayLocalStr}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs text-slate-900 transition-all"
              />
            </div>
          </div>

          {/* Number of Travelers */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Travelers
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Users className="w-4 h-4" />
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
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs text-slate-900 transition-all"
              />
            </div>
          </div>

          {/* Preferred Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Travel Mode
            </label>
            <select
              value={preferredMode}
              onChange={(e) => setPreferredMode(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs text-slate-900 transition-all cursor-pointer"
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
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Estimated Budget
            </label>
            <span className="text-xs font-bold text-emerald-700 font-mono bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
              ₹{Number(budget || 0).toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min="5000"
            max="150000"
            step="2500"
            value={budget}
            onChange={(e) => setBudget(parseInt(e.target.value, 10) || 5000)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
            <span className="text-[11px] text-slate-500 font-medium">Quick Presets:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {budgetPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setBudget(preset.value)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    budget === preset.value
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-2">
          <Button
            type="submit"
            size="lg"
            variant="primary"
            isLoading={loading}
            leftIcon={!loading && <Search className="w-4 h-4" />}
            className="w-full md:w-auto px-8 py-3 text-sm font-semibold rounded-xl shadow-xs"
          >
            {loading ? 'Planning Trip...' : 'Plan Trip →'}
          </Button>
        </div>

      </form>
    </div>
  );
}
