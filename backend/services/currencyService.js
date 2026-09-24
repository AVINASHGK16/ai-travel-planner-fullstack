/**
 * Currency Exchange Rate Service
 * Provides centralized exchange rates for supported currencies (INR, USD, EUR, GBP).
 * Caches live rates in-memory with a 1-hour TTL and provides resilient baseline fallbacks.
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

export const BASELINE_RATES = {
  INR: 1,
  USD: 0.0104,
  EUR: 0.0091,
  GBP: 0.0078
};

let rateCache = {
  base: 'INR',
  rates: { ...BASELINE_RATES },
  lastUpdated: null,
  expiresAt: 0,
  source: 'fallback'
};

let lastGoodRates = { ...BASELINE_RATES };

/**
 * Fetches latest exchange rates from open exchange API with caching and fallback.
 * Base currency is always 'INR'.
 * 
 * @returns {Promise<{ base: string, rates: Record<string, number>, lastUpdated: number, source: string }>}
 */
export async function getExchangeRates() {
  const now = Date.now();

  // Return cached rates if still fresh
  if (rateCache.lastUpdated && now < rateCache.expiresAt) {
    return {
      base: rateCache.base,
      rates: { ...rateCache.rates },
      lastUpdated: rateCache.lastUpdated,
      source: rateCache.source,
      cached: true
    };
  }

  // Attempt to fetch fresh rates from reliable open exchange API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://open.er-api.com/v6/latest/INR', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open exchange API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (data && data.result === 'success' && data.rates && typeof data.rates === 'object') {
      const liveRates = {
        INR: 1,
        USD: typeof data.rates.USD === 'number' && data.rates.USD > 0 ? Number(data.rates.USD.toFixed(6)) : lastGoodRates.USD,
        EUR: typeof data.rates.EUR === 'number' && data.rates.EUR > 0 ? Number(data.rates.EUR.toFixed(6)) : lastGoodRates.EUR,
        GBP: typeof data.rates.GBP === 'number' && data.rates.GBP > 0 ? Number(data.rates.GBP.toFixed(6)) : lastGoodRates.GBP
      };

      lastGoodRates = { ...liveRates };

      rateCache = {
        base: 'INR',
        rates: liveRates,
        lastUpdated: now,
        expiresAt: now + CACHE_TTL_MS,
        source: 'live'
      };

      return {
        base: rateCache.base,
        rates: { ...rateCache.rates },
        lastUpdated: rateCache.lastUpdated,
        source: 'live',
        cached: false
      };
    }

    throw new Error('Invalid rate payload received from exchange rate provider');
  } catch (error) {
    console.warn(`[CurrencyService] Rate fetch notice: ${error.message}. Using fallback rates.`);

    // Gracefully fall back to last known good rates
    rateCache = {
      base: 'INR',
      rates: { ...lastGoodRates },
      lastUpdated: rateCache.lastUpdated || now,
      expiresAt: now + 5 * 60 * 1000, // retry after 5 mins on error
      source: 'fallback'
    };

    return {
      base: rateCache.base,
      rates: { ...rateCache.rates },
      lastUpdated: rateCache.lastUpdated,
      source: 'fallback',
      cached: false
    };
  }
}
