import React, { createContext, useContext, useState, useMemo } from 'react';
import { storage } from '../utils/storage';

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => ({
    currency: storage.get('pref_currency', 'INR'),
    travelers: storage.get('pref_travelers', '1'),
    preferredMode: storage.get('pref_mode', 'any')
  }));

  const updatePreferences = (newSettings) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...newSettings };
      if (updated.currency) storage.set('pref_currency', updated.currency);
      if (updated.travelers) storage.set('pref_travelers', String(updated.travelers));
      if (updated.preferredMode) storage.set('pref_mode', updated.preferredMode);
      return updated;
    });
  };

  const currencySymbol = useMemo(() => {
    switch (preferences.currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '₹';
    }
  }, [preferences.currency]);

  const value = useMemo(() => ({
    preferences,
    currency: preferences.currency,
    currencySymbol,
    travelers: preferences.travelers,
    preferredMode: preferences.preferredMode,
    updatePreferences
  }), [preferences, currencySymbol]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    // Graceful fallback if rendered outside provider
    const curr = storage.get('pref_currency', 'INR');
    const symbol = curr === 'USD' ? '$' : (curr === 'EUR' ? '€' : (curr === 'GBP' ? '£' : '₹'));
    return {
      preferences: { currency: curr, travelers: storage.get('pref_travelers', '1'), preferredMode: storage.get('pref_mode', 'any') },
      currency: curr,
      currencySymbol: symbol,
      travelers: storage.get('pref_travelers', '1'),
      preferredMode: storage.get('pref_mode', 'any'),
      updatePreferences: (newSettings) => {
        if (newSettings?.currency) storage.set('pref_currency', newSettings.currency);
        if (newSettings?.travelers) storage.set('pref_travelers', String(newSettings.travelers));
        if (newSettings?.preferredMode) storage.set('pref_mode', newSettings.preferredMode);
      }
    };
  }
  return context;
}
