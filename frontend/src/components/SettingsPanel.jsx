import React, { useState, useRef, useEffect } from 'react';
import { 
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
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';

export default function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) {
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
  const saveTimerRef = useRef(null);

  // Synchronize state when opening or when external settings change
  useEffect(() => {
    if (isOpen) {
      if (settings?.currency) setCurrency(settings.currency);
      if (settings?.travelers) setTravelers(parseInt(settings.travelers, 10) || 1);
      if (settings?.preferredMode) setPreferredMode(settings.preferredMode);
    }
  }, [isOpen, settings]);

  // Clear timer when modal is closed or on unmount
  useEffect(() => {
    if (!isOpen && saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      setSavedSuccess(false);
    }
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [isOpen]);

  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      storage.set(`notify_${key.replace(/([A-Z])/g, '_$1').toLowerCase()}`, String(updated[key]));
      return updated;
    });
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    storage.set('pref_currency', currency);
    storage.set('pref_travelers', String(travelers));
    storage.set('pref_mode', preferredMode);
    if (onSaveSettings) {
      onSaveSettings({ currency, travelers: String(travelers), preferredMode });
    }
    setSavedSuccess(true);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      description="Manage your account and Roamly preferences."
      maxWidth="lg"
    >
      <div className="space-y-6 text-slate-800">
        
        {/* Section 1: Account */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">Account</h4>
            </div>
            {!token && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAuthModal();
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Your Name</span>
              <span className="font-medium text-slate-900 mt-0.5 block">
                {user?.name || (token ? 'Authenticated User' : 'Explorer (Guest)')}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Email</span>
              <span className="font-medium text-slate-900 mt-0.5 block">
                {user?.email || (token ? 'account@roamly.com' : 'guest@roamly.com')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-500">Authentication</span>
            {token ? (
              <Badge variant="success" size="sm">
                <ShieldCheck className="w-3 h-3" />
                <span>Active (JWT)</span>
              </Badge>
            ) : (
              <Badge variant="default" size="sm">Guest Session</Badge>
            )}
          </div>
        </div>

        {/* Section 2: Preferences Form */}
        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-700" />
                <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">Preferences</h4>
              </div>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Travel Preferences</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="modal-pref-currency" className="block text-xs font-medium text-slate-700 mb-1">
                  Default Currency
                </label>
                <select
                  id="modal-pref-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="INR">INR ₹ (Rupee)</option>
                  <option value="USD">USD $ (Dollar)</option>
                  <option value="EUR">EUR € (Euro)</option>
                  <option value="GBP">GBP £ (Pound)</option>
                </select>
              </div>

              <div>
                <label htmlFor="modal-pref-travelers" className="block text-xs font-medium text-slate-700 mb-1">
                  Default Travelers
                </label>
                <select
                  id="modal-pref-travelers"
                  value={travelers}
                  onChange={(e) => setTravelers(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="1">1 Traveler</option>
                  <option value="2">2 Travelers</option>
                  <option value="3">3 Travelers</option>
                  <option value="4">4 Travelers</option>
                  <option value="5">5+ Travelers</option>
                </select>
              </div>

              <div>
                <label htmlFor="modal-pref-mode" className="block text-xs font-medium text-slate-700 mb-1">
                  Preferred Mode
                </label>
                <select
                  id="modal-pref-mode"
                  value={preferredMode}
                  onChange={(e) => setPreferredMode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="any">Compare All</option>
                  <option value="flight">Flights</option>
                  <option value="train">Trains</option>
                  <option value="bus">Buses</option>
                  <option value="own">Road Trip</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Notifications */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
              <Bell className="w-4 h-4 text-amber-600" />
              <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">Notifications</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="font-medium text-slate-900 block">Trip updates</span>
                  <span className="text-[11px] text-slate-500">Schedule changes &amp; reminders</span>
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

              <div className="flex items-center justify-between py-1 border-t border-slate-200/60">
                <div>
                  <span className="font-medium text-slate-900 block">Price alerts</span>
                  <span className="text-[11px] text-slate-500">Significant fare drops</span>
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

              <div className="flex items-center justify-between py-1 border-t border-slate-200/60">
                <div>
                  <span className="font-medium text-slate-900 block">Weather alerts</span>
                  <span className="text-[11px] text-slate-500">Severe climate shifts</span>
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
          </div>

          {/* Section 4: Application / Services */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">Application & Services</h4>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-slate-800">AI itinerary generation</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Enabled
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Plane className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-slate-800">Live flight search</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Enabled
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-200/60">
                <div className="flex items-center gap-2">
                  <CloudSun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-slate-800">Weather information</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Enabled
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 pt-1">
              These services are securely configured by Roamly.
            </p>
          </div>

          {/* Section 5: Security */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
              <Lock className="w-4 h-4 text-emerald-600" />
              <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">Security</h4>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-700">JWT authentication</span>
              {token ? (
                <Badge variant="success" size="sm">Active</Badge>
              ) : (
                <Badge variant="neutral" size="sm">Inactive (Guest)</Badge>
              )}
            </div>
            <div className="flex items-center justify-between py-1 border-t border-slate-200/60">
              <span className="text-slate-700">Server-side API protection</span>
              <Badge variant="success" size="sm">Active</Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {savedSuccess ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Settings saved!
              </span>
            ) : <span />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                Save Preferences
              </Button>
            </div>
          </div>

        </form>

      </div>
    </Modal>
  );
}

