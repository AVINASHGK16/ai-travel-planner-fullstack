import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  ArrowLeftRight, 
  Calendar, 
  Sparkles, 
  Mic, 
  MicOff, 
  AlertCircle,
  Compass,
  Wand2
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

/**
 * Roamly TripConfigurationCard Component — UI-3.1
 * Unified Planning Experience featuring:
 * 1. Mode Selector: [ Structured Search ] [ Ask AI ]
 * 2. 4-column balanced logistics layout (Departure, Return, Travelers, Trip Type)
 * 3. Spacious full-width Budget control with quick presets
 * 4. Single dominant CTA per active mode
 */
export function TripConfigurationCard({
  onSearch,
  onApplyPrompt,
  loading = false,
  initialValues = null,
  className = ''
}) {
  const [planningMode, setPlanningMode] = useState('structured'); // 'structured' | 'ai'
  const [tripType, setTripType] = useState('roundTrip'); // 'roundTrip' | 'oneWay' | 'multiCity'
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState(50000);
  const [preferredMode, setPreferredMode] = useState('any');
  const [validationError, setValidationError] = useState(null);
  const [aiPromptText, setAiPromptText] = useState('');

  // Voice recognition states & instance ref
  const [listeningField, setListeningField] = useState(null); // 'from' | 'to' | null
  const recognitionRef = useRef(null);

  // Local date helper (YYYY-MM-DD)
  const now = new Date();
  const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Clean up active speech recognition instance on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // Synchronize when initialValues change (e.g. from QuickStart suggestions or AI prompt parsing)
  const initialFrom = initialValues?.from;
  const initialTo = initialValues?.to;
  const initialDate = initialValues?.date;
  const initialReturnDate = initialValues?.returnDate;
  const initialTravelers = initialValues?.travelers;
  const initialBudget = initialValues?.budget;
  const initialPreferredMode = initialValues?.preferredMode;

  useEffect(() => {
    if (initialFrom !== undefined) setFrom(initialFrom);
    if (initialTo !== undefined) setTo(initialTo);
    if (initialDate !== undefined) setDate(initialDate);
    if (initialReturnDate !== undefined) {
      setReturnDate(initialReturnDate || '');
      setTripType(initialReturnDate ? 'roundTrip' : 'oneWay');
    }
    if (initialTravelers !== undefined) setTravelers(initialTravelers);
    if (initialBudget !== undefined) setBudget(initialBudget);
    if (initialPreferredMode !== undefined) setPreferredMode(initialPreferredMode);
    setValidationError(null);
    if (initialFrom || initialTo) {
      // Auto-switch to structured view to display loaded parameters
      setPlanningMode('structured');
    }
  }, [initialFrom, initialTo, initialDate, initialReturnDate, initialTravelers, initialBudget, initialPreferredMode]);

  // Voice Search Handler
  const handleVoiceSearch = (field) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setValidationError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
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
      recognitionRef.current = null;
      setListeningField(null);
      return;
    }

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      const cleanText = speechToText.replace(/\.$/g, '').trim();
      if (field === 'from') setFrom(cleanText);
      if (field === 'to') setTo(cleanText);
      recognitionRef.current = null;
      setListeningField(null);
      setValidationError(null);
    };

    recognition.onerror = () => {
      recognitionRef.current = null;
      setListeningField(null);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListeningField(null);
    };
  };

  // Swap From and To
  const handleSwapLocations = () => {
    setFrom(to);
    setTo(from);
    setValidationError(null);
  };

  // Form submission & validation
  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;

    if (!from.trim()) {
      setValidationError('Please enter a starting location (e.g., Bengaluru).');
      return;
    }
    if (!to.trim()) {
      setValidationError('Please enter a destination (e.g., Goa).');
      return;
    }
    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      setValidationError('Starting location and destination must be different cities.');
      return;
    }
    if (!date) {
      setValidationError('Please select a departure date.');
      return;
    }
    if (date < todayLocalStr) {
      setValidationError('Departure date cannot be in the past.');
      return;
    }
    if (tripType === 'roundTrip') {
      if (!returnDate) {
        setValidationError('Please select a return date for round trip travel.');
        return;
      }
      if (returnDate < date) {
        setValidationError('Return date cannot be earlier than departure date.');
        return;
      }
    }

    setValidationError(null);

    const cleanTravelers = Math.min(50, Math.max(1, parseInt(travelers, 10) || 1));
    const cleanBudget = Math.max(100, Math.min(10000000, parseInt(budget, 10) || 50000));

    onSearch({
      from: from.trim(),
      to: to.trim(),
      date,
      returnDate: tripType === 'roundTrip' && returnDate ? returnDate : null,
      travelers: cleanTravelers,
      budget: cleanBudget,
      preferredMode
    });
  };

  const handleApplyAIPrompt = (text) => {
    const promptToUse = text || aiPromptText;
    if (!promptToUse.trim()) return;
    if (onApplyPrompt) {
      onApplyPrompt(promptToUse.trim());
    }
  };

  const travelModes = [
    { value: 'any', label: 'Compare All Modes' },
    { value: 'flight', label: 'Flights' },
    { value: 'train', label: 'Trains' },
    { value: 'bus', label: 'Buses' },
    { value: 'cab', label: 'Cabs / Taxis' },
    { value: 'own', label: 'Road Trip (Own Vehicle)' }
  ];

  const budgetPresets = [
    { label: '₹15,000', value: 15000 },
    { label: '₹30,000', value: 30000 },
    { label: '₹50,000', value: 50000 },
    { label: '₹1,00,000', value: 100000 }
  ];

  const samplePrompts = [
    { label: 'Goa beach holiday', text: 'Plan a 4-day leisure beach vacation in Goa departing next weekend with ₹45,000 budget for 2 travelers' },
    { label: 'Rajasthan heritage trip', text: 'Plan a 3-day royal palace and heritage tour in Jaipur for 2 travelers with ₹30,000 budget' },
    { label: 'Himachal mountain retreat', text: 'Plan a 5-day scenic mountain getaway to Manali for 2 travelers with ₹40,000 budget' }
  ];

  return (
    <Card className={`w-full max-w-[1180px] mx-auto shadow-sm border border-slate-200/90 bg-white rounded-2xl ${className}`}>
      <CardContent className="p-5 sm:p-7 md:p-8">

        {/* Top Header: Mode Selector on Left, Segmented Trip Type on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          
          {/* Mode Selector Tabs: [ Structured Search ] [ Ask AI ] */}
          <div
            className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 self-start sm:self-auto"
            role="tablist"
            aria-label="Planning mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={planningMode === 'structured'}
              onClick={() => setPlanningMode('structured')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                planningMode === 'structured'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Structured Search</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={planningMode === 'ai'}
              onClick={() => setPlanningMode('ai')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                planningMode === 'ai'
                  ? 'bg-white text-purple-700 shadow-xs border border-purple-200'
                  : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Ask AI</span>
              <span className="text-[9px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-mono">
                AI
              </span>
            </button>
          </div>

          {/* Segmented Trip Type Selector (displayed when Structured Search is active) */}
          {planningMode === 'structured' && (
            <div
              className="inline-flex items-center p-1 bg-slate-100/90 rounded-lg border border-slate-200/80 self-start sm:self-auto"
              role="radiogroup"
              aria-label="Trip type"
            >
              <button
                type="button"
                role="radio"
                aria-checked={tripType === 'roundTrip'}
                onClick={() => setTripType('roundTrip')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  tripType === 'roundTrip'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Round Trip
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={tripType === 'oneWay'}
                onClick={() => {
                  setTripType('oneWay');
                  setReturnDate('');
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  tripType === 'oneWay'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                One Way
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={tripType === 'multiCity'}
                onClick={() => {
                  setTripType('multiCity');
                  setReturnDate('');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  tripType === 'multiCity'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Multi-city</span>
                <span className="text-[9px] uppercase tracking-wider bg-blue-50 text-blue-700 px-1 py-0.2 rounded font-mono">
                  Beta
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Validation Notice */}
        {validationError && (
          <div
            role="alert"
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between gap-2 animate-fade-in"
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

        {/* ── MODE 1: STRUCTURED SEARCH ── */}
        {planningMode === 'structured' && (
          <form onSubmit={handleSubmit} className="space-y-6 pt-4 animate-fade-in" noValidate>

            {/* Header & Supporting text */}
            <div>
              <h2 className="font-semibold text-lg text-slate-900 tracking-tight">
                Plan your journey
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your itinerary for accurate multi-modal options.
              </p>
            </div>

            {/* Row 1: Location row (FROM, SWAP, TO) */}
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center">
                {/* Origin / From Input */}
                <Input
                  label="FROM"
                  id="planner-from-input"
                  required
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Bengaluru (BLR)"
                  leftIcon={<MapPin className="w-4 h-4 text-blue-600" />}
                  rightIcon={
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleVoiceSearch('from')}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        listeningField === 'from'
                          ? 'bg-red-50 text-red-600 animate-pulse'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                      title="Voice input for starting location"
                      aria-label="Voice input for starting location"
                    >
                      {listeningField === 'from' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  }
                />

                {/* Destination / To Input */}
                <Input
                  label="TO"
                  id="planner-to-input"
                  required
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Goa (GOI)"
                  leftIcon={<Navigation className="w-4 h-4 text-purple-600" />}
                  rightIcon={
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleVoiceSearch('to')}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        listeningField === 'to'
                          ? 'bg-red-50 text-red-600 animate-pulse'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                      title="Voice input for destination"
                      aria-label="Voice input for destination"
                    >
                      {listeningField === 'to' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              {/* Swap Button with ample hit area and no collision */}
              <div className="flex justify-center md:absolute md:left-1/2 md:top-8 md:-translate-x-1/2 my-2 md:my-0 z-10">
                <Button
                  id="planner-swap-btn"
                  data-testid="planner-swap-btn"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSwapLocations}
                  disabled={loading}
                  aria-label="Swap origin and destination"
                  title="Swap origin and destination"
                  className="rounded-full w-9 h-9 p-0 bg-white hover:bg-slate-50 border-slate-300 shadow-xs cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center"
                >
                  <ArrowLeftRight className="w-4 h-4 text-slate-600" />
                </Button>
              </div>
            </div>

            {/* Row 2: DEPARTURE | RETURN | TRAVELERS | TRIP TYPE (4 balanced columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="DEPARTURE"
                id="planner-departure-date"
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
                  if (validationError) setValidationError(null);
                }}
                leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
              />

              <Input
                label={`RETURN ${tripType === 'oneWay' ? '(One Way)' : (tripType === 'multiCity' ? '(Multi-city)' : '')}`}
                id="planner-return-date"
                type="date"
                disabled={tripType === 'oneWay'}
                min={date || todayLocalStr}
                value={returnDate}
                onChange={(e) => {
                  setReturnDate(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
                helperText={tripType === 'oneWay' ? 'Switch to Round Trip to select a return date' : undefined}
              />

              <Select
                label="TRAVELERS"
                id="planner-travelers-select"
                value={travelers}
                onChange={(e) => setTravelers(parseInt(e.target.value, 10) || 1)}
              >
                <option value="1">1 Traveler (Solo)</option>
                <option value="2">2 Travelers</option>
                <option value="3">3 Travelers</option>
                <option value="4">4 Travelers (Family)</option>
                <option value="5">5 Travelers</option>
                <option value="6">6 Travelers (Group)</option>
                <option value="8">8 Travelers</option>
                <option value="10">10 Travelers</option>
              </Select>

              <Select
                label="TRIP TYPE"
                id="planner-mode-select"
                aria-label="Travel preferences and trip type"
                value={preferredMode}
                onChange={(e) => setPreferredMode(e.target.value)}
                options={travelModes}
              />
            </div>

            {/* Row 3: BUDGET (Dedicated full-width section with generous room) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="planner-budget-slider"
                  className="block text-xs font-semibold text-slate-700 tracking-wide"
                >
                  BUDGET
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Estimated Budget:</span>
                  <span className="text-base font-bold text-slate-900 font-mono bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/80">
                    ₹{Number(budget || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                <input
                  id="planner-budget-slider"
                  type="range"
                  min="5000"
                  max="200000"
                  step="5000"
                  value={typeof budget === 'number' ? budget : 50000}
                  onChange={(e) => setBudget(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-500 font-medium">Quick Presets:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {budgetPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setBudget(preset.value)}
                        className={`text-xs font-mono px-3 py-1 rounded-md transition-all cursor-pointer ${
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
            </div>

            {/* Row 4: Primary CTA [ Search Flights & Plan Trip → ] */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button
                id="planner-submit-btn"
                data-testid="planner-submit-btn"
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 text-base font-bold tracking-tight shadow-sm hover:shadow-md transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Searching Flights & Planning...' : 'Search Flights & Plan Trip →'}</span>
              </Button>
            </div>

          </form>
        )}

        {/* ── MODE 2: ASK AI (NATURAL LANGUAGE ENTRY) ── */}
        {planningMode === 'ai' && (
          <div className="space-y-6 pt-4 animate-fade-in">
            
            {/* Header & Supporting text */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>✨ Plan with AI</span>
              </div>
              <h2 className="font-semibold text-lg text-slate-900 tracking-tight">
                Describe your dream trip in your own words
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Describe your dream trip and let Roamly create a personalized itinerary for you with live fares and routes.
              </p>
            </div>

            {/* Natural Language Prompt Area */}
            <div className="space-y-2">
              <label htmlFor="ai-prompt-input" className="block text-xs font-semibold text-slate-700">
                Your Travel Idea or Prompt
              </label>
              <textarea
                id="ai-prompt-input"
                rows={3}
                value={aiPromptText}
                onChange={(e) => setAiPromptText(e.target.value)}
                placeholder="e.g. Plan a 4-day leisure beach vacation in Goa departing next weekend with ₹45,000 budget for 2 travelers..."
                className="w-full text-sm p-3.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-800 transition-all shadow-2xs"
              />
            </div>

            {/* Quick Inspiration Prompts */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-purple-600" /> Or pick a popular inspiration prompt:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {samplePrompts.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAiPromptText(p.text)}
                    className="text-left p-3.5 rounded-xl bg-purple-50/50 hover:bg-purple-100/70 border border-purple-100 text-purple-950 transition-all group cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-xs font-bold text-purple-900 mb-1">{p.label}</span>
                    <span className="text-[11px] text-purple-800/80 line-clamp-2 leading-relaxed">{p.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dominant AI CTA */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button
                type="button"
                disabled={!aiPromptText.trim() || loading}
                isLoading={loading}
                onClick={() => handleApplyAIPrompt(aiPromptText)}
                className="w-full sm:w-auto px-8 py-3 text-base font-bold tracking-tight shadow-sm hover:shadow-md transition-all cursor-pointer bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>Plan with AI →</span>
              </Button>
            </div>

          </div>
        )}

      </CardContent>
    </Card>
  );
}

export default TripConfigurationCard;
