/**
 * Automated Verification Suite for Batch Review Fixes
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend', 'src');

console.log('====================================================');
console.log('🧪 Running Batch Review Fixes Verification Suite');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}\n`);
  }
}

// 1. QuickStartSuggestions date calculation
runTest('QuickStartSuggestions uses Date.setDate() calendar-day arithmetic', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'QuickStartSuggestions.jsx'), 'utf-8');
  assert(content.includes('departureDateObj.setDate(now.getDate() + 7)'), 'Must use setDate for departureDateObj');
  assert(content.includes('retObj.setDate(departureDateObj.getDate() + days)'), 'Must use setDate for getReturnDate');
  assert(!content.includes('7 * 24 * 60 * 60 * 1000'), 'Must not use fixed 24h ms multiplication');
});

// 2. TripConfigurationCard initialValues dependency synchronization
runTest('TripConfigurationCard synchronizes on scalar initialValues dependencies', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripConfigurationCard.jsx'), 'utf-8');
  assert(content.includes('initialFrom = initialValues?.from'), 'Must extract initialFrom');
  assert(content.includes('initialTo = initialValues?.to'), 'Must extract initialTo');
  assert(content.includes('[initialFrom, initialTo, initialDate, initialReturnDate, initialTravelers, initialBudget, initialPreferredMode]'), 'Effect must depend on scalar values');
});

// 3. TripConfigurationCard speech recognition lifecycle
runTest('TripConfigurationCard stores recognition in ref, stops active instance, and cleans up on unmount', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripConfigurationCard.jsx'), 'utf-8');
  assert(content.includes('recognitionRef = useRef(null)'), 'Must define recognitionRef');
  assert(content.includes('recognitionRef.current?.stop()') || content.includes('recognitionRef.current.stop()'), 'Must call stop on recognitionRef.current');
  assert(content.includes('return () => {') && content.includes('recognitionRef.current'), 'Must clean up on unmount');
});

// 4. TripConfigurationCard roundTrip validation rejects missing returnDate
runTest('TripConfigurationCard validates required returnDate on roundTrip before date comparison', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripConfigurationCard.jsx'), 'utf-8');
  const roundTripBlock = content.slice(content.indexOf("tripType === 'roundTrip'"), content.indexOf("tripType === 'roundTrip'") + 300);
  assert(roundTripBlock.includes('!returnDate'), 'Must check !returnDate');
  assert(roundTripBlock.includes('Please select a return date for round trip travel.'), 'Must set error for missing returnDate');
  assert(roundTripBlock.indexOf('!returnDate') < roundTripBlock.indexOf('returnDate < date'), 'Must check missing returnDate before earlier than departure check');
});

// 5. Modal focus-trap shared helper
runTest('Modal uses shared getTabbableElements helper with summary, iframe, editable content and tabIndex >= 0', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'ui', 'Modal.jsx'), 'utf-8');
  assert(content.includes('function getTabbableElements('), 'Must export getTabbableElements helper');
  assert(content.includes('summary') && content.includes('iframe') && content.includes('contenteditable'), 'Selector must include summary, iframe, contenteditable');
  assert(content.includes('el.tabIndex >= 0'), 'Must filter candidates with tabIndex >= 0');
});

// 6. Modal accessible name with ariaLabel fallback
runTest('Modal provides accessible name via titleId or aria-label fallback', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'ui', 'Modal.jsx'), 'utf-8');
  assert(content.includes('ariaLabel'), 'Must accept ariaLabel prop');
  assert(content.includes('aria-labelledby={titleId}'), 'Must use titleId for aria-labelledby');
  assert(content.includes('aria-label={!title ? (ariaLabel || \'Dialog\') : undefined}'), 'Must fallback to aria-label when title absent');
});

// 7. PlannerPage early-flight merge reuses helper
runTest('PlannerPage reuses mergeFlightOffersIntoTrip to update offers, flightCost, and budgetDetails', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'pages', 'PlannerPage.jsx'), 'utf-8');
  assert(content.includes('function mergeFlightOffersIntoTrip('), 'Must define mergeFlightOffersIntoTrip helper');
  assert(content.includes('mergeFlightOffersIntoTrip(prev, offers)'), 'Must reuse in flight success handler');
  assert(content.includes('mergeFlightOffersIntoTrip(aiEnrichedTrip, latestFlightResultRef.current.offers)'), 'Must reuse in early-flight merge');
});

// 8. PlannerPage provider-error handling
runTest('PlannerPage catch block explicitly marks PROVIDER_ERROR and empties baselineMock.options.flight', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'pages', 'PlannerPage.jsx'), 'utf-8');
  assert(content.includes("status: 'PROVIDER_ERROR'"), 'Must set status to PROVIDER_ERROR');
  assert(content.includes('baselineMock.options.flight = []'), 'Must empty baselineMock.options.flight');
  assert(content.includes("latestFlightResultRef.current.status === 'PROVIDER_ERROR'"), 'Must handle provider error in enrichment flow');
});

console.log(`\n====================================================`);
console.log(`🏁 Results: ${passedTests}/${totalTests} tests passed`);
console.log(`====================================================`);

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
