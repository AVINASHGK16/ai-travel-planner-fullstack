/**
 * Central Currency Service & Utilities
 * Provides standardized formatting, conversion, and symbol helpers
 * for supported currencies (INR, USD, EUR, GBP).
 */

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
export const DEFAULT_CURRENCY = 'INR';

export const CURRENCY_CONFIG = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'en-IE'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB'
  }
};

export const BASELINE_RATES = {
  INR: 1,
  USD: 0.0104,
  EUR: 0.0091,
  GBP: 0.0078
};

/**
 * Returns the currency symbol for a currency code.
 * @param {string} [currency='INR']
 * @returns {string}
 */
export function getCurrencySymbol(currency = DEFAULT_CURRENCY) {
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  return CURRENCY_CONFIG[code]?.symbol || '₹';
}

/**
 * Safe currency converter.
 * Converts amount from fromCurrency to toCurrency using base-INR exchange rates.
 * 
 * @param {number|string} amount
 * @param {string} [fromCurrency='INR']
 * @param {string} [toCurrency='INR']
 * @param {Record<string, number>} [rates]
 * @param {Object} [options]
 * @param {boolean} [options.round=false] - Whether to round to nearest integer for standard whole amounts
 * @returns {number|null}
 */
export function convertCurrency(
  amount,
  fromCurrency = DEFAULT_CURRENCY,
  toCurrency = DEFAULT_CURRENCY,
  rates = BASELINE_RATES,
  options = { round: false }
) {
  if (amount === null || amount === undefined || amount === '') return null;
  const num = Number(amount);
  if (Number.isNaN(num)) return null;
  if (num === 0) return 0;

  const { round = false } = options || {};

  const fromCode = (fromCurrency || DEFAULT_CURRENCY).toUpperCase();
  const toCode = (toCurrency || DEFAULT_CURRENCY).toUpperCase();

  if (fromCode === toCode) {
    return round ? Math.round(num) : num;
  }

  const effectiveRates = rates && typeof rates === 'object' ? rates : BASELINE_RATES;
  const fromRate = effectiveRates[fromCode] || BASELINE_RATES[fromCode] || 1;
  const toRate = effectiveRates[toCode] || BASELINE_RATES[toCode] || 1;

  // Amount in base currency (INR) = amount / fromRate
  // Converted amount in target currency = inBase * toRate
  const converted = (num / fromRate) * toRate;

  if (round) {
    return Math.round(converted);
  }

  return Number(converted.toFixed(2));
}

/**
 * Formats a monetary amount into the target currency using Intl.NumberFormat.
 * 
 * @param {number|string} amount
 * @param {string} [currency='INR']
 * @param {Object} [options]
 * @param {string} [options.fallback='—'] - Fallback text if amount is invalid/null
 * @param {number} [options.maxDecimals] - Force max fraction digits
 * @param {boolean} [options.compact=false] - Use compact notation (e.g. 50K)
 * @returns {string}
 */
export function formatMoney(amount, currency = DEFAULT_CURRENCY, options = {}) {
  const fallback = options.fallback !== undefined ? options.fallback : '—';
  if (amount === null || amount === undefined || amount === '') {
    return fallback;
  }

  const num = Number(amount);
  if (Number.isNaN(num)) {
    return fallback;
  }

  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  const config = CURRENCY_CONFIG[code] || CURRENCY_CONFIG.INR;

  const isWhole = num % 1 === 0;
  const maxDecimals = options.maxDecimals !== undefined 
    ? options.maxDecimals 
    : (isWhole ? 0 : 2);
  const minDecimals = options.minDecimals !== undefined
    ? options.minDecimals
    : 0;

  try {
    const formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
      notation: options.compact ? 'compact' : 'standard'
    });
    return formatter.format(num);
  } catch {
    // Fallback if Intl fails on obscure environments
    const rounded = isWhole ? Math.round(num) : num.toFixed(2);
    return `${config.symbol}${rounded.toLocaleString()}`;
  }
}

/**
 * Convenience function: Converts from source currency to target currency and formats.
 * 
 * @param {number|string} amount
 * @param {string} [fromCurrency='INR']
 * @param {string} [toCurrency='INR']
 * @param {Record<string, number>} [rates]
 * @param {Object} [options]
 * @returns {string}
 */
export function convertAndFormat(
  amount,
  fromCurrency = DEFAULT_CURRENCY,
  toCurrency = DEFAULT_CURRENCY,
  rates = BASELINE_RATES,
  options = {}
) {
  if (amount === null || amount === undefined || amount === '') {
    return options.fallback !== undefined ? options.fallback : '—';
  }

  const num = Number(amount);
  if (Number.isNaN(num)) {
    return options.fallback !== undefined ? options.fallback : '—';
  }

  const converted = convertCurrency(num, fromCurrency, toCurrency, rates, {
    round: options.round !== false
  });

  return formatMoney(converted, toCurrency, options);
}
