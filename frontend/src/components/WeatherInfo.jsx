import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Wind, AlertTriangle, Thermometer, Loader2 } from 'lucide-react';

export default function WeatherInfo({ weather, destination }) {
  const [liveWeather, setLiveWeather] = useState(weather);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  useEffect(() => {
    // Reset to static generated weather first
    setLiveWeather(weather);
    setWeatherError(null);

    if (!destination || typeof destination !== 'string') return;

    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const fetchLiveWeather = async () => {
      const city = destination.split(',')[0].trim();
      setLoadingWeather(true);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const url = `${backendUrl}/api/weather?city=${encodeURIComponent(city)}`;
        const res = await fetch(url, { signal: controller.signal });
        
        if (!res.ok) {
          let errData = {};
          try { errData = await res.json(); } catch {}
          
          if (res.status === 404) {
            throw new Error(`Weather station not found for "${city}".`);
          }
          if (res.status === 429) {
            throw new Error('Weather update rate limit reached. Please check back later.');
          }
          if (res.status === 503) {
            throw new Error('Live weather service is not configured on the server.');
          }
          throw new Error(errData.error || 'Live weather service is temporarily unavailable.');
        }

        const data = await res.json();
        if (!data || typeof data.temp !== 'string' || !data.temp.trim()) {
          throw new Error('Weather service returned incomplete information.');
        }
        
        if (!active) return;
        
        setWeatherError(null);
        setLiveWeather(prev => ({
          ...prev,
          temp: data.temp,
          condition: data.condition || 'Atmosphere',
          windSpeed: data.windSpeed || 'N/A',
          rainAlert: data.rainAlert || 'No alerts',
          // Retain generated transit stop forecast
          forecast: prev?.forecast || weather?.forecast || []
        }));
      } catch (err) {
        if (!active) return;
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          setWeatherError('Live weather request timed out.');
        } else {
          setWeatherError(err.message || 'Live weather data unavailable.');
        }
      } finally {
        if (active) {
          setLoadingWeather(false);
        }
        clearTimeout(timeoutId);
      }
    };

    fetchLiveWeather();

    return () => {
      active = false;
      setLoadingWeather(false);
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [destination, weather]);

  const hasValidWeather = liveWeather && typeof liveWeather.temp === 'string' && liveWeather.temp.trim() !== '';

  // If completely missing valid weather data, show a safe, styled error card
  if (!hasValidWeather) {
    return (
      <div className="p-5 rounded-2xl glass border border-white/10 text-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-900/60 text-amber-400 border border-amber-500/20 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm text-white">Weather Data Unavailable</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {weatherError || `Live weather information could not be retrieved for ${destination?.split(',')?.[0] || 'destination'}.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getWeatherIcon = (cond) => {
    const norm = cond?.toLowerCase() || '';
    if (norm.includes('rain') || norm.includes('shower')) return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (norm.includes('cloud') || norm.includes('overcast')) return <Cloud className="w-8 h-8 text-slate-400" />;
    return <Sun className="w-8 h-8 text-yellow-400" />;
  };

  return (
    <div className="p-5 rounded-2xl glass border border-white/10 text-slate-200">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 pb-3 border-b border-white/5">
        <div>
          <h4 className="font-display font-semibold text-base text-white">Weather Forecast</h4>
          <div className="mt-0.5">
            {loadingWeather ? (
              <p className="text-xs text-blue-400 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Updating live weather...</span>
              </p>
            ) : weatherError ? (
              <p className="text-xs text-amber-400/90 flex items-center gap-1" title={weatherError}>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Estimated route climate (Live station unavailable)</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400">Conditions at your transit locations</p>
            )}
          </div>
        </div>
        
        {/* Rain Alert flag / Status banner */}
        {weatherError ? (
          <div className="bg-slate-800/60 border border-white/10 text-slate-400 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
            <span>Offline</span>
          </div>
        ) : liveWeather.rainAlert && !liveWeather.rainAlert.includes('0%') && !liveWeather.rainAlert.toLowerCase().includes('no') ? (
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Rain Alert</span>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
            <span>Clear Sky</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        
        {/* Core destination condition (Left) */}
        <div className="md:col-span-4 flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
          <div className="p-2 rounded-xl bg-slate-900/60 shrink-0">
            {getWeatherIcon(liveWeather.condition)}
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Destination</span>
            <span className="text-2xl font-bold font-mono text-white leading-none block my-0.5">{liveWeather.temp}</span>
            <span className="text-xs text-slate-300 font-medium block">{liveWeather.condition}</span>
          </div>
        </div>

        {/* Mini Stats (Center) */}
        <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-1 gap-2.5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Wind className="w-4 h-4 text-blue-400" />
            <span>Wind: {liveWeather.windSpeed}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Thermometer className="w-4 h-4 text-purple-400" />
            <span>Condition: {weatherError ? 'Estimated' : 'Reported'}</span>
          </div>
        </div>

        {/* Forecast list at stops (Right) */}
        <div className="md:col-span-5 space-y-2 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-4">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-2">Transit Waypoints weather</span>
          
          <div className="space-y-2 font-mono text-xs">
            {(liveWeather.forecast || []).map((stop, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900/40 border border-white/5">
                <span className="text-slate-300 truncate max-w-[120px] font-sans">{stop.stop}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[10px] font-sans">{stop.condition}</span>
                  <span className="font-bold text-white shrink-0">{stop.temp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
