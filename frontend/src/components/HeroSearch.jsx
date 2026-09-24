import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Search, MapPin, Calendar, Users, Coins, Navigation, AlertCircle } from 'lucide-react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Slider } from './ui/Slider';
import { usePreferences } from '../context/PreferencesContext';

const TRAVEL_MODE_OPTIONS = [
  { value: 'any', label: 'Compare All Modes' },
  { value: 'flight', label: 'Flights Only' },
  { value: 'train', label: 'Trains Only' },
  { value: 'bus', label: 'Buses Only' },
  { value: 'cab', label: 'Cabs Only' },
  { value: 'own', label: 'Own Vehicle (Road Trip)' }
];

const BUDGET_PRESETS = [
  { label: '₹10,000', value: 10000 },
  { label: '₹25,000', value: 25000 },
  { label: '₹50,000', value: 50000 },
  { label: '₹1,00,000', value: 100000 }
];

export default function HeroSearch({ onSearch, loading = false }) {
  const { convertAndFormat } = usePreferences();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [budget, setBudget] = useState(25000);
  const [preferredMode, setPreferredMode] = useState('any');
  
  // Field-level errors to eliminate Cumulative Layout Shift (CLS)
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  
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
      setGeneralError('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
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
      if (field === 'from') {
        setFrom(cleanText);
        setFieldErrors((prev) => ({ ...prev, from: null }));
      }
      if (field === 'to') {
        setTo(cleanText);
        setFieldErrors((prev) => ({ ...prev, to: null }));
      }
      recognitionRef.current = null;
      setListeningField(null);
      setGeneralError(null);
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListeningField(null);
      const errorType = event?.error;
      if (errorType === 'not-allowed') {
        setGeneralError('Microphone access was denied. Please allow microphone permissions in your browser.');
      } else if (errorType === 'no-speech') {
        setGeneralError('No speech was detected. Please try speaking again.');
      } else {
        setGeneralError('Voice search was interrupted. Please try again or type manually.');
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

    const errors = {};
    if (!from.trim()) {
      errors.from = 'Starting location is required';
    }
    if (!to.trim()) {
      errors.to = 'Destination is required';
    } else if (from.trim() && from.trim().toLowerCase() === to.trim().toLowerCase()) {
      errors.to = 'Destination must differ from starting location';
    }

    if (!date) {
      errors.date = 'Departure date is required';
    } else if (date < todayLocalStr) {
      errors.date = 'Departure cannot be in the past';
    }

    if (returnDate && returnDate < date) {
      errors.returnDate = 'Return cannot be earlier than departure';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setGeneralError(null);
    const cleanTravelers = Math.min(50, Math.max(1, parseInt(travelers, 10) || 1));
    const cleanBudget = Math.max(100, Math.min(10000000, parseInt(budget, 10) || 25000));
    onSearch({ 
      from: from.trim(), 
      to: to.trim(), 
      date, 
      returnDate: returnDate || null, 
      travelers: cleanTravelers, 
      budget: cleanBudget, 
      preferredMode 
    });
  };

  return (
    <div className="w-full">
      
      {/* Dynamic Title Hero */}
      <div className="text-center mb-8">
        <h1 className="font-display font-bold text-3xl sm:text-5xl text-slate-900 tracking-tight leading-tight">
          Plan Your Next Journey with{' '}
          <span className="text-blue-600 font-extrabold">
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
        {/* From & To inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Starting Location */}
          <Input
            id="hero-search-from"
            label="Starting Location"
            required
            placeholder="e.g. Bengaluru, IN"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              if (fieldErrors.from) {
                setFieldErrors((prev) => ({ ...prev, from: null }));
              }
            }}
            leftIcon={<MapPin className="w-4 h-4 text-blue-600" />}
            rightIcon={
              <button
                type="button"
                disabled={loading}
                onClick={() => handleVoiceSearch('from')}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
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
            }
            error={fieldErrors.from}
          />

          {/* Destination */}
          <Input
            id="hero-search-to"
            label="Destination"
            required
            placeholder="e.g. Hyderabad, IN"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              if (fieldErrors.to) {
                setFieldErrors((prev) => ({ ...prev, to: null }));
              }
            }}
            leftIcon={<Navigation className="w-4 h-4 text-indigo-600" />}
            rightIcon={
              <button
                type="button"
                disabled={loading}
                onClick={() => handleVoiceSearch('to')}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
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
            }
            error={fieldErrors.to}
          />
        </div>

        {/* Dates, Travelers, Preferred Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
          
          {/* Departure Date */}
          <Input
            id="hero-search-date"
            label="Departure Date"
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
              if (fieldErrors.date) {
                setFieldErrors((prev) => ({ ...prev, date: null }));
              }
            }}
            leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
            error={fieldErrors.date}
          />

          {/* Return Date (Optional) */}
          <Input
            id="hero-search-return-date"
            label="Return Date (Optional)"
            type="date"
            min={date || todayLocalStr}
            value={returnDate}
            onChange={(e) => {
              setReturnDate(e.target.value);
              if (fieldErrors.returnDate) {
                setFieldErrors((prev) => ({ ...prev, returnDate: null }));
              }
            }}
            leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
            error={fieldErrors.returnDate}
          />

          {/* Number of Travelers */}
          <Input
            id="hero-search-travelers"
            label="Travelers"
            type="number"
            min="1"
            max="50"
            value={travelers}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (Number.isNaN(val)) setTravelers('');
              else setTravelers(Math.min(50, Math.max(1, val)));
              if (fieldErrors.travelers) {
                setFieldErrors((prev) => ({ ...prev, travelers: null }));
              }
            }}
            onBlur={() => {
              if (!travelers || travelers < 1) setTravelers(1);
              else if (travelers > 50) setTravelers(50);
            }}
            leftIcon={<Users className="w-4 h-4 text-slate-400" />}
            error={fieldErrors.travelers}
          />

          {/* Preferred Mode Selection */}
          <Select
            id="hero-search-mode"
            label="Travel Mode"
            value={preferredMode}
            onChange={(e) => setPreferredMode(e.target.value)}
            options={TRAVEL_MODE_OPTIONS}
          />
        </div>

        {/* Budget Slider */}
        <div className="p-4 bg-[#FAFAF8] border border-[#E7E5DF] rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-[#14171F] flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-[#1E9E6B]" />
              Estimated Budget
            </label>
            <span className="text-xs font-bold text-[#14171F] font-mono tabular-nums bg-white border border-[#E7E5DF] px-2.5 py-1 rounded-lg">
              {convertAndFormat(budget || 0, 'INR')}
            </span>
          </div>
          <Slider
            id="hero-budget-slider"
            min={5000}
            max={150000}
            step={2500}
            value={typeof budget === 'number' ? budget : 25000}
            onChange={(val) => setBudget(val || 5000)}
            formatValue={(val) => convertAndFormat(val || 0, 'INR')}
            showValue={false}
            showMinMax={true}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E7E5DF]">
            <span className="text-[11px] text-[#737885] font-medium">Quick Presets:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {BUDGET_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setBudget(preset.value)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors duration-150 cursor-pointer ${
                    budget === preset.value
                      ? 'bg-[#2453FF] text-white font-bold shadow-xs'
                      : 'bg-white text-[#3E434D] hover:text-[#14171F] hover:bg-[#FAFAF8] border border-[#E7E5DF]'
                  }`}
                >
                  {convertAndFormat(preset.value, 'INR')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button & Reserved Status Slot */}
        <div className="flex flex-col items-center pt-2 space-y-3">
          {/* Reserved Status Feedback Slot to Eliminate Cumulative Layout Shift */}
          <div className="min-h-[26px] flex items-center justify-center">
            {generalError && (
              <div
                role="alert"
                className="text-xs text-red-600 bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-lg flex items-center gap-2 animate-fade-in"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{generalError}</span>
                <button
                  type="button"
                  onClick={() => setGeneralError(null)}
                  className="text-red-500 hover:text-red-700 ml-1.5 text-xs font-semibold cursor-pointer"
                  aria-label="Dismiss error"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            variant="primary"
            isLoading={loading}
            leftIcon={!loading && <Search className="w-4 h-4" />}
            className="w-full md:w-auto px-8 py-3 text-sm font-bold rounded-lg shadow-xs bg-[#2453FF] hover:bg-[#1A3ECC] text-white cursor-pointer"
          >
            {loading ? 'Planning trip...' : 'Plan trip'}
          </Button>
        </div>

      </form>
    </div>
  );
}
