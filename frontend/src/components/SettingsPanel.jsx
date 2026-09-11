import React, { useState } from 'react';
import { X, ShieldAlert, Sparkles, CloudSun, Map } from 'lucide-react';

export default function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) {
  const [geminiKey, setGeminiKey] = useState(settings.geminiKey || '');
  const [openWeatherKey, setOpenWeatherKey] = useState(settings.openWeatherKey || '');
  const [googleMapsKey, setGoogleMapsKey] = useState(settings.googleMapsKey || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings({ geminiKey, openWeatherKey, googleMapsKey });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl glass border border-white/15 shadow-2xl p-6 text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="font-display font-bold text-lg text-white">Developer Settings</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice Callout */}
        <div className="mt-4 p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-200/90 leading-normal">
            <span className="font-semibold block text-blue-400 mb-0.5">Secure Backend Proxy</span>
            Keys configured here are saved locally and proxied securely through your backend server — never exposed directly to client-side network calls. Alternatively, keys can be set in the backend <code className="bg-black/30 px-1 py-0.5 rounded text-blue-300">.env</code> file.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          
          {/* Gemini API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Gemini API Key (Generative AI)
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AI itinerary and chat generator key..."
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Optional if GEMINI_API_KEY is configured on the backend server. Leave blank for simulated mode.
            </p>
          </div>

          {/* OpenWeather Key */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-blue-400" />
              OpenWeather API Key
            </label>
            <input
              type="password"
              value={openWeatherKey}
              onChange={(e) => setOpenWeatherKey(e.target.value)}
              placeholder="Managed securely on server (WEATHER_API_KEY)..."
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Managed securely on the backend server via WEATHER_API_KEY.
            </p>
          </div>

          {/* Google Maps Key */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
              <Map className="w-4 h-4 text-emerald-400" />
              Google Maps API Key
            </label>
            <input
              type="password"
              value={googleMapsKey}
              onChange={(e) => setGoogleMapsKey(e.target.value)}
              placeholder="Interactive Google Maps fallback..."
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              If left blank, the app will render the beautiful Leaflet OSM interface.
            </p>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-white/5 border border-white/10 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4.5 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all shadow-md shadow-blue-500/20"
            >
              Save Credentials
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
