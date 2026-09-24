import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { storage } from '../utils/storage';
import { request } from '../services/apiClient';
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  BASELINE_RATES,
  getCurrencySymbol,
  convertCurrency as baseConvertCurrency,
  formatMoney as baseFormatMoney,
  convertAndFormat as baseConvertAndFormat
} from '../utils/currency';

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => ({
    currency: storage.get('pref_currency', DEFAULT_CURRENCY),
    travelers: storage.get('pref_travelers', '1'),
    preferredMode: storage.get('pref_mode', 'any')
  }));

  const [rates, setRates] = useState(() => {
    return storage.getJSON('cached_exchange_rates', BASELINE_RATES);
  });

  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState(null);

  // Fetch fresh exchange rates on mount
  useEffect(() => {
    let isMounted = true;

    async function loadRates() {
      setRatesLoading(true);
      try {
        const response = await request('/api/currency/rates', { timeoutMs: 7000 });
        const liveRates = response?.data?.rates;
        if (isMounted && response?.ok && liveRates && typeof liveRates === 'object') {
          const newRates = { ...BASELINE_RATES, ...liveRates };
          setRates(newRates);
          storage.setJSON('cached_exchange_rates', newRates);
          setRatesError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[PreferencesContext] Exchange rate fetch fallback:', err?.message || err);
          setRatesError(err?.message || 'Failed to fetch live exchange rates');
          // Retain cached rates or baseline
        }
      } finally {
        if (isMounted) {
          setRatesLoading(false);
        }
      }
    }

    loadRates();

    return () => {
      isMounted = false;
    };
  }, []);

  const updatePreferences = useCallback((newSettings) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...newSettings };
      if (updated.currency) storage.set('pref_currency', updated.currency);
      if (updated.travelers) storage.set('pref_travelers', String(updated.travelers));
      if (updated.preferredMode) storage.set('pref_mode', updated.preferredMode);
      return updated;
    });
  }, []);

  const setCurrency = useCallback((curr) => {
    if (curr && SUPPORTED_CURRENCIES.includes(curr)) {
      updatePreferences({ currency: curr });
    }
  }, [updatePreferences]);

  const currency = preferences.currency || DEFAULT_CURRENCY;
  const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency]);

  // Bound currency helper functions that automatically use the user's active currency and loaded rates
  const formatMoney = useCallback((amount, targetCurrency = currency, options = {}) => {
    return baseFormatMoney(amount, targetCurrency, options);
  }, [currency]);

  const convertCurrency = useCallback((amount, fromCurrency = DEFAULT_CURRENCY, toCurrency = currency, options = {}) => {
    return baseConvertCurrency(amount, fromCurrency, toCurrency, rates, options);
  }, [currency, rates]);

  const convertAndFormat = useCallback((amount, fromCurrency = DEFAULT_CURRENCY, toCurrency = currency, options = {}) => {
    return baseConvertAndFormat(amount, fromCurrency, toCurrency, rates, options);
  }, [currency, rates]);

  const value = useMemo(() => ({
    preferences,
    currency,
    currencySymbol,
    supportedCurrencies: SUPPORTED_CURRENCIES,
    rates,
    ratesLoading,
    ratesError,
    travelers: preferences.travelers,
    preferredMode: preferences.preferredMode,
    updatePreferences,
    setCurrency,
    formatMoney,
    convertCurrency,
    convertAndFormat
  }), [
    preferences,
    currency,
    currencySymbol,
    rates,
    ratesLoading,
    ratesError,
    updatePreferences,
    setCurrency,
    formatMoney,
    convertCurrency,
    convertAndFormat
  ]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    const curr = storage.get('pref_currency', DEFAULT_CURRENCY);
    const symbol = getCurrencySymbol(curr);
    const cachedRates = storage.getJSON('cached_exchange_rates', BASELINE_RATES);

    return {
      preferences: {
        currency: curr,
        travelers: storage.get('pref_travelers', '1'),
        preferredMode: storage.get('pref_mode', 'any')
      },
      currency: curr,
      currencySymbol: symbol,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      rates: cachedRates,
      ratesLoading: false,
      ratesError: null,
      travelers: storage.get('pref_travelers', '1'),
      preferredMode: storage.get('pref_mode', 'any'),
      updatePreferences: (newSettings) => {
        if (newSettings?.currency) storage.set('pref_currency', newSettings.currency);
        if (newSettings?.travelers) storage.set('pref_travelers', String(newSettings.travelers));
        if (newSettings?.preferredMode) storage.set('pref_mode', newSettings.preferredMode);
      },
      setCurrency: (newCurr) => {
        if (newCurr) storage.set('pref_currency', newCurr);
      },
      formatMoney: (amount, targetCurrency = curr, options = {}) => {
        return baseFormatMoney(amount, targetCurrency, options);
      },
      convertCurrency: (amount, fromCurrency = DEFAULT_CURRENCY, toCurrency = curr, options = {}) => {
        return baseConvertCurrency(amount, fromCurrency, toCurrency, cachedRates, options);
      },
      convertAndFormat: (amount, fromCurrency = DEFAULT_CURRENCY, toCurrency = curr, options = {}) => {
        return baseConvertAndFormat(amount, fromCurrency, toCurrency, cachedRates, options);
      }
    };
  }
  return context;
}
export default PreferencesContext;
