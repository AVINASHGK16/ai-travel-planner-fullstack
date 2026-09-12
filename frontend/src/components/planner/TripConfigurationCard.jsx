import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  ArrowLeftRight, 
  Calendar, 
  IndianRupee, 
  Sparkles, 
  Mic, 
  MicOff, 
  AlertCircle 
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

/**
 * Roamly TripConfigurationCard Component
 * Structured travel planning form implementing the 6-step information architecture:
 * Where -> When -> Who -> Preferences -> Budget -> Generate
 */
export function TripConfigurationCard({
  onSearch,
  loading = false,
  initialValues = null,
  className = ''
}) {
  const [tripType, setTripType] = useState('roundTrip'); // 'roundTrip' | 'oneWay'
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState(50000);
  const [preferredMode, setPreferredMode] = useState('any');
  const [validationError, setValidationError] = useState(null);

  // Voice recognition states
  const [listeningField, setListeningField] = useState(null); // 'from' | 'to' | null

  // Local date helper (YYYY-MM-DD)
  const now = new Date();
  const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Synchronize when initialValues changes (e.g. from QuickStart suggestions)
  useEffect(() => {
    if (initialValues) {
      if (initialValues.from !== undefined) setFrom(initialValues.from);
      if (initialValues.to !== undefined) setTo(initialValues.to);
      if (initialValues.date !== undefined) setDate(initialValues.date);
      if (initialValues.returnDate !== undefined) {
        setReturnDate(initialValues.returnDate || '');
        setTripType(initialValues.returnDate ? 'roundTrip' : 'oneWay');
      }
      if (initialValues.travelers !== undefined) setTravelers(initialValues.travelers);
      if (initialValues.budget !== undefined) setBudget(initialValues.budget);
      if (initialValues.preferredMode !== undefined) setPreferredMode(initialValues.preferredMode);
      setValidationError(null);
    }
  }, [initialValues]);

  // Voice Search Handler
  const handleVoiceSearch = (field) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setValidationError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
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
      const cleanText = speechToText.replace(/\.$/g, '').trim();
      if (field === 'from') setFrom(cleanText);
      if (field === 'to') setTo(cleanText);
      setListeningField(null);
      setValidationError(null);
    };

    recognition.onerror = () => {
      setListeningField(null);
    };

    recognition.onend = () => {
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
    if (tripType === 'roundTrip' && returnDate) {
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

  return (
    <Card className={`max-w-4xl mx-auto shadow-md border-slate-200/90 ${className}`}>
      <CardContent className="p-5 sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* Top Bar: Form Title & Trip Type Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-lg text-slate-900 tracking-tight">
                Plan your journey
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your itinerary parameters for accurate multi-modal options.
              </p>
            </div>

            {/* Trip Type Toggle */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/70 self-start sm:self-auto" role="radiogroup" aria-label="Trip type">
              <button
                type="button"
                role="radio"
                aria-checked={tripType === 'roundTrip'}
                onClick={() => setTripType('roundTrip')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  tripType === 'roundTrip'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Round trip
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
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                One way
              </button>
            </div>
          </div>

          {/* Validation Notice */}
          {validationError && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between gap-2 animate-fade-in"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{validationError}</span>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-0.5 rounded hover:bg-red-100/60"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Section 1: Where are you going? (Destination Inputs with Swap) */}
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Origin / From Input */}
              <Input
                label="From"
                id="planner-from-input"
                required
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. Bengaluru, Karnataka"
                leftIcon={<MapPin className="w-4 h-4 text-blue-600" />}
                rightIcon={
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleVoiceSearch('from')}
                    className={`p-1 rounded-md transition-colors ${
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
                label="To"
                id="planner-to-input"
                required
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. Goa"
                leftIcon={<Navigation className="w-4 h-4 text-purple-600" />}
                rightIcon={
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleVoiceSearch('to')}
                    className={`p-1 rounded-md transition-colors ${
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

            {/* Swap Button (Floating horizontally between inputs on md+, inline on mobile) */}
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
                className="rounded-full w-8 h-8 p-0 bg-white hover:bg-slate-50 border-slate-300 shadow-xs"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-slate-600" />
              </Button>
            </div>
          </div>

          {/* Section 2: When are you going? (Departure and Return Dates) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Departure"
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
              label={`Return ${tripType === 'oneWay' ? '(One way selected)' : ''}`}
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
              helperText={tripType === 'oneWay' ? 'Switch to Round trip to set a return date' : undefined}
            />
          </div>

          {/* Section 3 & 4: Who is traveling & Trip Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Travelers */}
            <Select
              label="Travelers"
              id="planner-travelers-select"
              value={travelers}
              onChange={(e) => setTravelers(parseInt(e.target.value, 10) || 1)}
            >
              <option value="1">1 Traveler (Solo)</option>
              <option value="2">2 Travelers (Couple / Pair)</option>
              <option value="3">3 Travelers (Small Group)</option>
              <option value="4">4 Travelers (Family / Group)</option>
              <option value="5">5 Travelers (Group)</option>
              <option value="6">6 Travelers (Large Group)</option>
              <option value="8">8 Travelers (Group Tour)</option>
              <option value="10">10 Travelers (Excursion)</option>
            </Select>

            {/* Travel Mode / Preferences */}
            <Select
              label="Trip Preferences"
              id="planner-mode-select"
              value={preferredMode}
              onChange={(e) => setPreferredMode(e.target.value)}
              options={travelModes}
            />
          </div>

          {/* Section 5: Budget Configuration */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label
                  htmlFor="planner-budget-input"
                  className="block text-xs font-semibold text-slate-700 tracking-wide"
                >
                  Estimated Trip Budget
                </label>
                <p className="text-[11px] text-slate-500">
                  Approximate total target budget for all travelers
                </p>
              </div>

              {/* Quick Budget Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {budgetPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setBudget(preset.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      budget === preset.value
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Input
                id="planner-budget-input"
                type="number"
                min="500"
                max="10000000"
                step="500"
                value={budget}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setBudget(Number.isNaN(val) ? '' : Math.max(100, val));
                }}
                leftIcon={<IndianRupee className="w-4 h-4 text-slate-400" />}
                helperText={`Equivalent to approx. $${Math.round((budget || 0) / 80)} USD`}
              />
            </div>
          </div>

          {/* Section 6: Primary AI Generation Action CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Button
              id="planner-submit-btn"
              data-testid="planner-submit-btn"
              type="submit"
              variant="ai"
              size="lg"
              isLoading={loading}
              disabled={loading}
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="w-full sm:w-auto px-8 shadow-sm font-semibold cursor-pointer"
            >
              {loading ? 'Generating Itinerary...' : 'Generate AI Trip'}
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}

export default TripConfigurationCard;
