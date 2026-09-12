import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, ShieldAlert, CloudSun, Map, Save } from 'lucide-react';
import { storage } from '../utils/storage';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [googleMapsKey, setGoogleMapsKey] = useState(() => storage.get('googleMapsKey', ''));
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    storage.set('googleMapsKey', (googleMapsKey || '').trim());
    storage.remove('geminiKey');
    storage.remove('openWeatherKey');
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      {/* Main card */}
      <div className="rounded-2xl glass border border-white/15 p-8 shadow-2xl space-y-6 text-slate-200">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-2xl text-white">Application Settings</h2>
            <p className="text-xs text-slate-400">Configure client options and view system architecture details</p>
          </div>
        </div>

        {/* Security Notice Callout */}
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-200/90 leading-relaxed">
            <span className="font-semibold block text-emerald-400 mb-1">Zero-Exposure Server Architecture</span>
            Production API keys (<code className="bg-black/30 px-1 py-0.5 rounded text-emerald-300">GEMINI_API_KEY</code> and <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-300">WEATHER_API_KEY</code>) are securely managed on the backend server. They are never entered, stored, or exposed in your browser.
          </div>
        </div>

        {/* Server Service Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <p className="font-medium text-white">Gemini AI</p>
              <p className="text-[11px] text-slate-400">Secure server-side proxy</p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3">
            <CloudSun className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-medium text-white">OpenWeather</p>
              <p className="text-[11px] text-slate-400">Secure server-side proxy</p>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
              <Map className="w-4 h-4 text-emerald-400" />
              Google Maps API Key (Optional)
            </label>
            <input
              type="password"
              value={googleMapsKey}
              onChange={(e) => setGoogleMapsKey(e.target.value)}
              placeholder="Interactive Google Maps fallback..."
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Used only for optional Google Maps tile rendering fallback. Leaflet OpenStreetMap is used by default.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedNotice ? (
              <span className="text-xs font-semibold text-emerald-400 animate-pulse">
                ✓ Settings successfully saved!
              </span>
            ) : <span />}

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
