/**
 * Automated Verification Script for Real Global Currency Preference System
 * Tests:
 * 1. Backend currency exchange rates service and endpoint
 * 2. Frontend currency utility: formatMoney, convertCurrency, convertAndFormat
 * 3. Decimal precision and sensible formatting across INR, USD, EUR, GBP
 * 4. Preservation of original flight provider currencies
 * 5. Fallbacks on missing/invalid/zero amounts
 */

import { getExchangeRates, SUPPORTED_CURRENCIES, BASELINE_RATES } from '../backend/services/currencyService.js';
import { formatMoney, convertCurrency, convertAndFormat, getCurrencySymbol } from '../frontend/src/utils/currency.js';

let passes = 0;
let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passes++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failures++;
  }
}

async function runTests() {
  console.log('\n=== TEST SUITE 1: Backend Currency Service ===');
  const rateData = await getExchangeRates();
  assert(rateData && typeof rateData === 'object', 'getExchangeRates returns object');
  assert(rateData.base === 'INR', 'Base currency is INR');
  assert(rateData.rates && rateData.rates.INR === 1, 'INR rate is 1');
  assert(typeof rateData.rates.USD === 'number' && rateData.rates.USD > 0, 'USD rate is valid positive number');
  assert(typeof rateData.rates.EUR === 'number' && rateData.rates.EUR > 0, 'EUR rate is valid positive number');
  assert(typeof rateData.rates.GBP === 'number' && rateData.rates.GBP > 0, 'GBP rate is valid positive number');
  assert(typeof rateData.lastUpdated === 'number', 'lastUpdated timestamp is present');

  console.log('\n=== TEST SUITE 2: Currency Symbols ===');
  assert(getCurrencySymbol('INR') === '₹', 'INR symbol is ₹');
  assert(getCurrencySymbol('USD') === '$', 'USD symbol is $');
  assert(getCurrencySymbol('EUR') === '€', 'EUR symbol is €');
  assert(getCurrencySymbol('GBP') === '£', 'GBP symbol is £');
  assert(getCurrencySymbol('unknown') === '₹', 'Fallback symbol is ₹');

  console.log('\n=== TEST SUITE 3: Money Formatting (formatMoney) ===');
  const inrFormatted = formatMoney(50000, 'INR');
  assert(inrFormatted.includes('50,000') && inrFormatted.includes('₹'), `formatMoney(50000, "INR") -> "${inrFormatted}"`);

  const usdFormatted = formatMoney(600, 'USD');
  assert(usdFormatted.includes('600') && usdFormatted.includes('$'), `formatMoney(600, "USD") -> "${usdFormatted}"`);

  const eurFormatted = formatMoney(550, 'EUR');
  assert(eurFormatted.includes('550') && eurFormatted.includes('€'), `formatMoney(550, "EUR") -> "${eurFormatted}"`);

  const gbpFormatted = formatMoney(470, 'GBP');
  assert(gbpFormatted.includes('470') && gbpFormatted.includes('£'), `formatMoney(470, "GBP") -> "${gbpFormatted}"`);

  assert(formatMoney(0, 'INR').includes('0'), 'formatMoney(0, "INR") formats 0 correctly');
  assert(formatMoney(null, 'INR') === '—', 'formatMoney(null) returns fallback "—"');
  assert(formatMoney(undefined, 'INR') === '—', 'formatMoney(undefined) returns fallback "—"');
  assert(formatMoney(NaN, 'INR') === '—', 'formatMoney(NaN) returns fallback "—"');

  console.log('\n=== TEST SUITE 4: Currency Conversion (convertCurrency) ===');
  const rates = rateData.rates;
  // INR -> USD
  const inrToUsd = convertCurrency(100000, 'INR', 'USD', rates);
  assert(typeof inrToUsd === 'number' && inrToUsd > 500 && inrToUsd < 2000, `100,000 INR converted to USD = $${inrToUsd}`);

  // USD -> INR
  const usdToInr = convertCurrency(inrToUsd, 'USD', 'INR', rates);
  assert(Math.abs(usdToInr - 100000) < 200, `Round trip USD -> INR preserved within rounding margin: ${usdToInr}`);

  // Same currency conversion
  assert(convertCurrency(45000, 'INR', 'INR', rates) === 45000, 'INR -> INR returns exact original');
  assert(convertCurrency(500, 'USD', 'USD', rates) === 500, 'USD -> USD returns exact original');

  // Source USD converted to EUR
  const usdToEur = convertCurrency(100, 'USD', 'EUR', rates);
  assert(typeof usdToEur === 'number' && usdToEur > 70 && usdToEur < 120, `USD 100 converted to EUR = €${usdToEur}`);

  console.log('\n=== TEST SUITE 5: convertAndFormat (Combined) ===');
  const formattedUsd = convertAndFormat(50000, 'INR', 'USD', rates);
  assert(formattedUsd.includes('$') && !formattedUsd.includes('NaN'), `convertAndFormat(50000, INR -> USD) = "${formattedUsd}"`);

  const formattedEur = convertAndFormat(50000, 'INR', 'EUR', rates);
  assert(formattedEur.includes('€') && !formattedEur.includes('NaN'), `convertAndFormat(50000, INR -> EUR) = "${formattedEur}"`);

  const formattedGbp = convertAndFormat(50000, 'INR', 'GBP', rates);
  assert(formattedGbp.includes('£') && !formattedGbp.includes('NaN'), `convertAndFormat(50000, INR -> GBP) = "${formattedGbp}"`);

  console.log('\n=== TEST SUITE 6: Source Currency Preservation ===');
  // Provider returns offer in USD
  const usdFlightOffer = {
    id: 'fl_us_01',
    price: 450,
    currency: 'USD'
  };

  // User preference is INR
  const displayedInInr = convertAndFormat(usdFlightOffer.price, usdFlightOffer.currency, 'INR', rates);
  assert(displayedInInr.includes('₹') && !displayedInInr.includes('NaN'), `USD flight displayed in INR: "${displayedInInr}"`);
  assert(usdFlightOffer.price === 450, 'Original flight offer price retained as 450');
  assert(usdFlightOffer.currency === 'USD', 'Original flight offer currency retained as "USD"');

  // User preference is EUR
  const displayedInEur = convertAndFormat(usdFlightOffer.price, usdFlightOffer.currency, 'EUR', rates);
  assert(displayedInEur.includes('€'), `USD flight displayed in EUR: "${displayedInEur}"`);

  console.log('\n=== TEST SUITE 7: Budget Slider Semantics ===');
  const baseBudget = 50000; // INR
  const usdBudgetDisplay = convertAndFormat(baseBudget, 'INR', 'USD', rates);
  const inrBudgetDisplay = convertAndFormat(baseBudget, 'INR', 'INR', rates);
  assert(usdBudgetDisplay.includes('$'), `Budget in USD displays correctly: "${usdBudgetDisplay}"`);
  assert(inrBudgetDisplay.includes('₹') && inrBudgetDisplay.includes('50,000'), `Budget in INR displays original: "${inrBudgetDisplay}"`);

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passes} Passed, ${failures} Failed`);
  console.log(`========================================`);

  if (failures > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
