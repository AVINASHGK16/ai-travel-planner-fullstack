import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  User, 
  ShieldCheck, 
  Sliders, 
  Bell, 
  Sparkles, 
  Plane, 
  CloudSun, 
  Lock, 
  Check 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { storage } from '../utils/storage';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, token, openAuthModal } = useAuth();

  // User preferences stored in local storage
  const [currency, setCurrency] = useState(() => storage.get('pref_currency', 'INR'));
  const [travelers, setTravelers] = useState(() => parseInt(storage.get('pref_travelers', '1'), 10) || 1);
  const [preferredMode, setPreferredMode] = useState(() => storage.get('pref_mode', 'any'));

  // Notification preferences
  const [notifications, setNotifications] = useState(() => ({
    tripUpdates: storage.get('notify_trip_updates', 'true') === 'true',
    priceAlerts: storage.get('notify_price_alerts', 'true') === 'true',
    weatherAlerts: storage.get('notify_weather_alerts', 'true') === 'true'
  }));

  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      storage.set(`notify_${key.replace(/([A-Z])/g, '_$1').toLowerCase()}`, String(updated[key]));
      return updated;
    });
  };

  const { preferences, updatePreferences } = usePreferences();

  useEffect(() => {
    if (preferences) {
      if (preferences.currency) setCurrency(preferences.currency);
      if (preferences.travelers) setTravelers(parseInt(preferences.travelers, 10) || 1);
      if (preferences.preferredMode) setPreferredMode(preferences.preferredMode);
    }
  }, [preferences]);

  const handleSavePreferences = (e) => {
    e.preventDefault();
    storage.set('pref_currency', currency);
    storage.set('pref_travelers', String(travelers));
    storage.set('pref_mode', preferredMode);
    updatePreferences({ currency, travelers: String(travelers), preferredMode });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Back to previous route link */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Plan</span>
      </button>

      {/* Page Heading & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account and Roamly preferences.</p>
      </div>

      <div className="space-y-6">
        
        {/* Section 1: Account */}
        <Card className="p-6 bg-white border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-slate-900">Account</h2>
                <p className="text-xs text-slate-500">Your profile credentials and authentication status</p>
              </div>
            </div>
            {!token && (
              <Button
                variant="outline"
                size="sm"
                onClick={openAuthModal}
                className="text-xs font-semibold"
              >
                Sign In
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
                Your Name
              </span>
              <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                {user?.name || (token ? 'Authenticated User' : 'Explorer (Guest)')}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
                Email Address
              </span>
              <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                {user?.email || (token ? 'account@roamly.com' : 'guest@roamly.com')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-600">Authentication</span>
            {token ? (
              <Badge variant="success" size="sm">
                <ShieldCheck className="w-3 h-3" />
                <span>JWT Authenticated</span>
              </Badge>
            ) : (
              <Badge variant="default" size="sm">
                <span>Guest Session (Local Storage)</span>
              </Badge>
            )}
          </div>
        </Card>

        {/* Section 2: Travel Preferences */}
        <Card className="p-6 bg-white border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-slate-900">Preferences</h2>
                <p className="text-xs text-slate-500">Travel Preferences: Configure your default currencies, party size, and transport mode</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div>
                <label htmlFor="settings-currency" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default Currency
                </label>
                <select
                  id="settings-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="INR">INR ₹ (Indian Rupee)</option>
                  <option value="USD">USD $ (US Dollar)</option>
                  <option value="EUR">EUR € (Euro)</option>
                  <option value="GBP">GBP £ (British Pound)</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-travelers" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default Travelers
                </label>
                <select
                  id="settings-travelers"
                  value={travelers}
                  onChange={(e) => setTravelers(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="1">1 Traveler (Solo)</option>
                  <option value="2">2 Travelers (Couple)</option>
                  <option value="3">3 Travelers</option>
                  <option value="4">4 Travelers (Family)</option>
                  <option value="5">5+ Travelers</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-mode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Preferred Travel Mode
                </label>
                <select
                  id="settings-mode"
                  value={preferredMode}
                  onChange={(e) => setPreferredMode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="any">Compare All Modes</option>
                  <option value="flight">Flights First</option>
                  <option value="train">Trains First</option>
                  <option value="bus">Buses First</option>
                  <option value="own">Road Trip</option>
                </select>
              </div>

            </div>

            <div className="flex items-center justify-between pt-2">
              {savedSuccess ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Preferences updated
                </span>
              ) : <span />}

              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="cursor-pointer font-semibold"
              >
                Save Preferences
              </Button>
            </div>
          </form>
        </Card>

        {/* Section 3: Notifications */}
        <Card className="p-6 bg-white border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-900">Notifications</h2>
              <p className="text-xs text-slate-500">Alert preferences for your active journeys</p>
            </div>
          </div>

          <div className="space-y-3 divide-y divide-slate-100 text-xs">
            
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="font-medium text-slate-900 block">Trip updates</span>
                <span className="text-slate-500">Schedule changes, itinerary reminders, and booking notifications</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.tripUpdates}
                aria-label="Toggle trip updates notifications"
                onClick={() => toggleNotification('tripUpdates')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                  notifications.tripUpdates ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notifications.tripUpdates ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="font-medium text-slate-900 block">Price alerts</span>
                <span className="text-slate-500">Notifications for major flight fare dips and saver seat openings</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.priceAlerts}
                aria-label="Toggle price alert notifications"
                onClick={() => toggleNotification('priceAlerts')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                  notifications.priceAlerts ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notifications.priceAlerts ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="font-medium text-slate-900 block">Weather alerts</span>
                <span className="text-slate-500">Severe rain alerts and temperature shifts on your transit corridor</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.weatherAlerts}
                aria-label="Toggle weather alert notifications"
                onClick={() => toggleNotification('weatherAlerts')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                  notifications.weatherAlerts ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notifications.weatherAlerts ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

          </div>
        </Card>

        {/* Section 4: Application / Services Status */}
        <Card className="p-6 bg-white border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-900">Application & Services</h2>
              <p className="text-xs text-slate-500">Real-time status of connected intelligence and transit services</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-slate-900">AI itinerary generation</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Enabled
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Plane className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-900">Live flight search</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Enabled
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CloudSun className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-slate-900">Weather information</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Enabled
              </span>
            </div>

          </div>

          <p className="text-[11px] text-slate-500 pt-1">
            These services are securely configured by Roamly.
          </p>
        </Card>

        {/* Section 5: Security */}
        <Card className="p-6 bg-white border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-900">Security</h2>
              <p className="text-xs text-slate-500">Security protocols and session guarantees</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-700 font-medium">JWT authentication</span>
              {token ? (
                <Badge variant="success" size="sm">Active</Badge>
              ) : (
                <Badge variant="neutral" size="sm">Inactive (Guest)</Badge>
              )}
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-700 font-medium">Server-side API protection</span>
              <Badge variant="success" size="sm">Active</Badge>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
