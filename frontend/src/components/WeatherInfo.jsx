import React, { useState, useEffect, useRef } from 'react';
import { Cloud, Sun, CloudRain, Wind, AlertTriangle, Thermometer, Loader2 } from 'lucide-react';
import { getWeather } from '../services/weatherService';

export default function WeatherInfo({ weather, destination, destinationCoords }) {
  const [liveWeather, setLiveWeather] = useState(weather);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  const targetCity = typeof destination === 'string' ? destination.split(',')[0].trim() : '';
  const initialWeatherRef = useRef(weather);

  useEffect(() => {
    // Reset to static generated weather when city changes
    setLiveWeather(weather || initialWeatherRef.current);
    setWeatherError(null);

    if (!targetCity && (!Array.isArray(destinationCoords) || destinationCoords.length < 2)) return;

    let active = true;
    const controller = new AbortController();

    const fetchLiveWeather = async () => {
      setLoadingWeather(true);
      try {
        const query = (Array.isArray(destinationCoords) && destinationCoords.length >= 2 && typeof destinationCoords[0] === 'number' && typeof destinationCoords[1] === 'number')
          ? { city: targetCity, lat: destinationCoords[0], lon: destinationCoords[1] }
          : targetCity;
        const data = await getWeather(query, controller.signal);
        
        if (!active) return;
        
        setWeatherError(null);
        setLiveWeather(prev => ({
          ...prev,
          temp: data.temp,
          condition: data.condition || 'Atmosphere',
          windSpeed: data.windSpeed || 'N/A',
          rainAlert: data.rainAlert || 'No alerts',
          // Retain generated transit stop forecast
          forecast: (Array.isArray(prev?.forecast) && prev.forecast.length > 0)
            ? prev.forecast
            : (Array.isArray(weather?.forecast) ? weather.forecast : [])
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
      }
    };

    fetchLiveWeather();

    return () => {
      active = false;
      setLoadingWeather(false);
      controller.abort();
    };
  }, [targetCity, destinationCoords?.[0], destinationCoords?.[1]]);

  const hasValidWeather = liveWeather && typeof liveWeather.temp === 'string' && liveWeather.temp.trim() !== '';

  // If completely missing valid weather data, show a safe, styled error card
  if (!hasValidWeather) {
    return (
      <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs text-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-900">Weather Data Unavailable</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {weatherError || `Live weather information could not be retrieved for ${destination?.split(',')?.[0] || 'destination'}.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getWeatherIcon = (cond) => {
    const norm = cond?.toLowerCase() || '';
    if (norm.includes('rain') || norm.includes('shower')) return <CloudRain className="w-7 h-7 text-blue-600" />;
    if (norm.includes('cloud') || norm.includes('overcast')) return <Cloud className="w-7 h-7 text-slate-500" />;
    return <Sun className="w-7 h-7 text-amber-500" />;
  };

  return (
    <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-100">
        <div>
          <h4 className="font-semibold text-base text-slate-900 tracking-tight">Weather Forecast</h4>
          <div className="mt-0.5">
            {loadingWeather ? (
              <p className="text-xs text-blue-600 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Updating live weather...</span>
              </p>
            ) : weatherError ? (
              <p className="text-xs text-amber-700 flex items-center gap-1" title={weatherError}>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Estimated route climate (Live station unavailable)</span>
              </p>
            ) : (
              <p className="text-xs text-slate-500">Conditions at your transit locations</p>
            )}
          </div>
        </div>
        
        {/* Rain Alert flag / Status banner */}
        {weatherError ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase">
            <span>Estimated Climate</span>
          </div>
        ) : typeof liveWeather.rainAlert === 'string' && !/\b0%/.test(liveWeather.rainAlert) && !/\bno\b/i.test(liveWeather.rainAlert) ? (
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Rain Alert</span>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase">
            <span>Live Forecast</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        
        {/* Core destination condition (Left) */}
        <div className="md:col-span-4 flex items-center gap-3.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
          <div className="p-2 rounded-lg bg-white border border-slate-200/80 shrink-0">
            {getWeatherIcon(liveWeather.condition)}
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Destination {weatherError ? '(Estimated)' : ''}
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 leading-none block my-0.5">
              {weatherError ? `~${liveWeather.temp.replace(/^~/, '')}` : liveWeather.temp}
            </span>
            <span className="text-xs text-slate-600 font-medium block">
              {weatherError ? `${liveWeather.condition} (Regional Estimate)` : liveWeather.condition}
            </span>
          </div>
        </div>

        {/* Mini Stats (Center) */}
        <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-1 gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Wind className="w-3.5 h-3.5 text-blue-600" />
            <span>Wind: {liveWeather.windSpeed}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Thermometer className="w-3.5 h-3.5 text-purple-600" />
            <span>Source: {weatherError ? 'Regional Climate' : 'OpenWeather'}</span>
          </div>
        </div>

        {/* Forecast list at stops (Right) */}
        <div className="md:col-span-5 space-y-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-2">Transit Waypoints weather</span>
          
          <div className="space-y-1.5 font-mono text-xs">
            {(liveWeather.forecast || []).filter(s => s && typeof s === 'object').map((stop, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                <span className="text-slate-800 truncate max-w-[120px] font-sans font-medium">{stop.stop || `Stop ${idx + 1}`}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[10px] font-sans">{stop.condition || 'Clear'}</span>
                  <span className="font-bold text-slate-900 shrink-0">{stop.temp || '--'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
