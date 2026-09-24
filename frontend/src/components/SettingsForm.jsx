import React, { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { storage } from '../utils/storage';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Switch } from './ui/Switch';

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR ₹ (Indian Rupee)' },
  { value: 'USD', label: 'USD $ (US Dollar)' },
  { value: 'EUR', label: 'EUR € (Euro)' },
  { value: 'GBP', label: 'GBP £ (British Pound)' }
];

const TRAVELER_OPTIONS = [
  { value: '1', label: '1 Traveler (Solo)' },
  { value: '2', label: '2 Travelers (Couple)' },
  { value: '3', label: '3 Travelers' },
  { value: '4', label: '4 Travelers (Family)' },
  { value: '5', label: '5+ Travelers' }
];

const MODE_OPTIONS = [
  { value: 'any', label: 'Compare All Modes' },
  { value: 'flight', label: 'Flights First' },
  { value: 'train', label: 'Trains First' },
  { value: 'bus', label: 'Buses First' },
  { value: 'own', label: 'Road Trip' }
];

/**
 * Reusable SettingsForm component used by both SettingsPage and SettingsPanel.
 *
 * @param {Object} props
 * @param {boolean} [props.isModal=false] - Whether the form is embedded in a modal dialog
 * @param {() => void} [props.onClose] - Modal close callback
 * @param {Object} [props.settings] - External settings object (e.g. from AppShell/Modal)
 * @param {(settings: Object) => void} [props.onSaveSettings] - Optional external save handler
 */
export function SettingsForm({
  isModal = false,
  onClose,
  settings,
  onSaveSettings
}) {
  const { user, token, openAuthModal } = useAuth();
  const { preferences, updatePreferences } = usePreferences();

  // User preferences stored in local storage and context
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

  // Synchronize state when external settings or preferences change
  useEffect(() => {
    const currentPrefs = settings || preferences;
    if (currentPrefs) {
      if (currentPrefs.currency) setCurrency(currentPrefs.currency);
      if (currentPrefs.travelers) setTravelers(parseInt(currentPrefs.travelers, 10) || 1);
      if (currentPrefs.preferredMode) setPreferredMode(currentPrefs.preferredMode);
    }
  }, [settings, preferences]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

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

    const payload = { currency, travelers: String(travelers), preferredMode };

    if (onSaveSettings) {
      onSaveSettings(payload);
    } else if (updatePreferences) {
      updatePreferences(payload);
    }

    setSavedSuccess(true);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    if (isModal) {
      saveTimerRef.current = setTimeout(() => {
        setSavedSuccess(false);
        if (onClose) onClose();
      }, 1200);
    } else {
      saveTimerRef.current = setTimeout(() => {
        setSavedSuccess(false);
      }, 2500);
    }
  };

  const handleSignInClick = () => {
    if (isModal && onClose) {
      onClose();
    }
    openAuthModal();
  };

  const SectionWrapper = isModal
    ? ({ children, className = '' }) => (
        <div className={`p-4 rounded-xl bg-[#FAFAF8] border border-[#E7E5DF] space-y-3 ${className}`}>
          {children}
        </div>
      )
    : ({ children, className = '' }) => (
        <Card className={`p-6 bg-white border border-[#E7E5DF] rounded-xl shadow-[0_1px_2px_rgba(20,23,31,0.04)] space-y-5 ${className}`}>
          {children}
        </Card>
      );

  return (
    <div className={isModal ? 'space-y-5 text-[#14171F]' : 'space-y-6 text-[#14171F]'}>
      
      {/* Section 1: Account */}
      <SectionWrapper>
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E5DF]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2453FF]/10 text-[#2453FF] flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[#14171F] leading-tight">Account</h2>
              <p className="text-[14px] font-normal text-[#14171F]/65 mt-0.5">Your profile credentials and authentication status</p>
            </div>
          </div>
          {!token && (
            isModal ? (
              <button
                type="button"
                onClick={handleSignInClick}
                className="text-xs font-semibold text-[#2453FF] hover:text-[#1A3ECC] cursor-pointer"
              >
                Sign In
              </button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignInClick}
                className="text-xs font-semibold border-[#E7E5DF] text-[#14171F] hover:bg-[#FAFAF8]"
              >
                Sign In
              </Button>
            )
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#FAFAF8] border border-[#E7E5DF]">
            <span className="text-xs font-medium text-[#737885] block">
              Your name
            </span>
            <span className="text-sm font-semibold text-[#14171F] mt-0.5 block">
              {user?.name || (token ? 'Authenticated User' : 'Explorer (Guest)')}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#FAFAF8] border border-[#E7E5DF]">
            <span className="text-xs font-medium text-[#737885] block">
              Email address
            </span>
            <span className="text-sm font-semibold text-[#14171F] mt-0.5 block">
              {user?.email || (token ? 'account@roamly.com' : 'guest@roamly.com')}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-[#737885]">Authentication</span>
          {token ? (
            <Badge variant="success" size="sm">
              <ShieldCheck className="w-3 h-3 text-[#1E9E6B]" />
              <span>{isModal ? 'Active (JWT)' : 'JWT Authenticated'}</span>
            </Badge>
          ) : (
            <Badge variant="default" size="sm">
              <span>{isModal ? 'Guest Session' : 'Guest Session (Local Storage)'}</span>
            </Badge>
          )}
        </div>
      </SectionWrapper>

      {/* Preferences Form enclosing sections 2 & action */}
      <form onSubmit={handleSavePreferences} className="space-y-6">
        
        {/* Section 2: Travel Preferences */}
        <SectionWrapper>
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E5DF]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FAFAF8] text-[#14171F] flex items-center justify-center border border-[#E7E5DF] shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-[18px] font-semibold text-[#14171F] leading-tight">Preferences</h2>
                <p className="text-[14px] font-normal text-[#14171F]/65 mt-0.5">
                  Travel Preferences: Configure your default currency, party size, and transport mode
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              id={isModal ? 'modal-settings-currency' : 'page-settings-currency'}
              label="Default Currency"
              value={currency}
              onChange={(e) => {
                const newCurr = e.target.value;
                setCurrency(newCurr);
                if (updatePreferences) {
                  updatePreferences({ currency: newCurr });
                }
              }}
              options={CURRENCY_OPTIONS}
            />

            <Select
              id={isModal ? 'modal-settings-travelers' : 'page-settings-travelers'}
              label="Default Travelers"
              value={String(travelers)}
              onChange={(e) => setTravelers(parseInt(e.target.value, 10) || 1)}
              options={TRAVELER_OPTIONS}
            />

            <Select
              id={isModal ? 'modal-settings-mode' : 'page-settings-mode'}
              label="Preferred Travel Mode"
              value={preferredMode}
              onChange={(e) => setPreferredMode(e.target.value)}
              options={MODE_OPTIONS}
            />
          </div>
        </SectionWrapper>

        {/* Section 3: Notifications */}
        <SectionWrapper>
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E7E5DF]">
            <div className="w-8 h-8 rounded-lg bg-[#E8A33D]/10 text-[#E8A33D] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[#14171F] leading-tight">Notifications</h2>
              <p className="text-[14px] font-normal text-[#14171F]/65 mt-0.5">Alert preferences for your active journeys</p>
            </div>
          </div>

          <div className="divide-y divide-[#E7E5DF]">
            <Switch
              label="Trip updates"
              description="Schedule changes, itinerary reminders, and booking notifications"
              checked={notifications.tripUpdates}
              onChange={() => toggleNotification('tripUpdates')}
            />
            <Switch
              label="Price alerts"
              description="Notifications for major flight fare dips and saver seat openings"
              checked={notifications.priceAlerts}
              onChange={() => toggleNotification('priceAlerts')}
            />
            <Switch
              label="Weather alerts"
              description="Severe rain alerts and temperature shifts on your transit corridor"
              checked={notifications.weatherAlerts}
              onChange={() => toggleNotification('weatherAlerts')}
            />
          </div>
        </SectionWrapper>

        {/* Section 4: Application / Services Status */}
        <SectionWrapper>
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E7E5DF]">
            <div className="w-8 h-8 rounded-lg bg-[#2453FF]/10 text-[#2453FF] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[#14171F] leading-tight">Application & Services</h2>
              <p className="text-[14px] font-normal text-[#14171F]/65 mt-0.5">Real-time status of connected intelligence and transit services</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-xs font-semibold text-slate-900">AI itinerary generation</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Enabled
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Plane className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-semibold text-slate-900">Live flight search</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Enabled
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CloudSun className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-900">Weather information</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Enabled
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-1">
            These services are securely configured by Roamly.
          </p>
        </SectionWrapper>

        {/* Section 5: Security */}
        <SectionWrapper>
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/60">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
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
        </SectionWrapper>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>{isModal ? 'Settings saved!' : 'Preferences updated'}</span>
            </span>
          ) : <span />}

          <div className="flex items-center gap-2">
            {isModal && onClose && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="cursor-pointer font-semibold"
            >
              Save Preferences
            </Button>
          </div>
        </div>

      </form>

    </div>
  );
}
