/**
 * Automated Verification Suite for UI-3.2 Search Results & Transport Comparison
 * ROAMLY — Transport comparison, filter rail, card hierarchy, recommendation badges, loading, empty, and error states.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT_DIR = path.resolve('c:/Users/g/OneDrive/Documents/AI TRAVEL PLANNER');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend', 'src');

console.log('====================================================');
console.log('🧪 Running UI-3.2 Search Results & Transport Suite');
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

const tripSummaryContent = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripSummaryBar.jsx'), 'utf-8');
const travelOptionsContent = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'TravelOptions.jsx'), 'utf-8');
const plannerPageContent = fs.readFileSync(path.join(FRONTEND_DIR, 'pages', 'PlannerPage.jsx'), 'utf-8');

// ── 1. COMPACT TRIP SUMMARY BAR ──────────────────────────────────────────

runTest('1.1: TripSummaryBar provides "Back to Plan" breadcrumb link', () => {
  assert(tripSummaryContent.includes('Back to Plan'), 'Must have "Back to Plan" text');
  assert(tripSummaryContent.includes('ArrowLeft'), 'Must include ArrowLeft icon');
});

runTest('1.2: TripSummaryBar displays Origin → Destination and metadata bullet line', () => {
  assert(tripSummaryContent.includes('{originName} → {destinationName}'), 'Must format header as Origin → Destination');
  assert(tripSummaryContent.includes('{originName} to {destinationName}'), 'Must preserve previous test assertion');
  assert(tripSummaryContent.includes('activeTrip.travelers'), 'Must display travelers in metadata');
  assert(tripSummaryContent.includes('tripTypeLabel'), 'Must display trip type in metadata');
});

runTest('1.3: TripSummaryBar provides [ Modify Search ] and [ Save Plan ] actions', () => {
  assert(tripSummaryContent.includes('Modify Search'), 'Must have "[ Modify Search ]" button');
  assert(tripSummaryContent.includes('Save Plan'), 'Must have "[ Save Plan ]" button');
});

// ── 2. DESKTOP FILTER RAIL (~240px) ──────────────────────────────────────

runTest('2.1: TravelOptions filter rail implements ~240px desktop width and 3-column layout', () => {
  assert(travelOptionsContent.includes('grid-cols-1 lg:grid-cols-12'), 'Must use 12-column grid');
  assert(travelOptionsContent.includes('lg:col-span-3'), 'Filter rail must be lg:col-span-3 (~240px)');
  assert(travelOptionsContent.includes('renderFilterPanel()'), 'Must render desktop filter rail');
});

runTest('2.2: Filter rail includes Stops filter with counts (Any, Non-stop, 1 stop, 2+ stops)', () => {
  assert(travelOptionsContent.includes('Stops'), 'Must have Stops filter title');
  assert(travelOptionsContent.includes('Non-stop'), 'Must have Non-stop option');
  assert(travelOptionsContent.includes('1 stop'), 'Must have 1 stop option');
  assert(travelOptionsContent.includes('2+ stops'), 'Must have 2+ stops option');
  assert(travelOptionsContent.includes('selectedStops'), 'Must manage stops selection state');
});

runTest('2.3: Filter rail includes Airlines filter dynamically populated with counts', () => {
  assert(travelOptionsContent.includes('Airlines'), 'Must have Airlines filter title');
  assert(travelOptionsContent.includes('availableAirlines'), 'Must dynamically calculate available airlines');
  assert(travelOptionsContent.includes('selectedAirlines'), 'Must manage airline selection state');
});

runTest('2.4: Filter rail includes Departure time buckets (Morning, Afternoon, Evening)', () => {
  assert(travelOptionsContent.includes('Departure Time'), 'Must have Departure Time filter title');
  assert(travelOptionsContent.includes('Morning'), 'Must have Morning time filter');
  assert(travelOptionsContent.includes('Afternoon'), 'Must have Afternoon time filter');
  assert(travelOptionsContent.includes('Evening'), 'Must have Evening time filter');
  assert(travelOptionsContent.includes('departureTimeFilter'), 'Must manage departure time state');
});

runTest('2.5: Filter rail includes Price Range slider with Max Price feedback', () => {
  assert(travelOptionsContent.includes('Price Range') || travelOptionsContent.includes('Max Price'), 'Must have Price filter title');
  assert(travelOptionsContent.includes('type="range"'), 'Must have range slider for price');
  assert(travelOptionsContent.includes('maxPriceFilter'), 'Must manage max price state');
});

runTest('2.6: Filter rail provides Reset Filters action', () => {
  assert(travelOptionsContent.includes('Reset Filters') || travelOptionsContent.includes('Reset'), 'Must have Reset button');
  assert(travelOptionsContent.includes('handleResetFilters'), 'Must have filter reset handler');
});

// ── 3. IMMEDIATE CARD HIERARCHY (5 QUESTIONS) ────────────────────────────

runTest('3.1: Result card answers "1. Who?" (Airline name, flight number, airline logo/icon)', () => {
  assert(travelOptionsContent.includes('flight.airline'), 'Must display airline name');
  assert(travelOptionsContent.includes('flight.flightNumber'), 'Must display flight number');
  assert(travelOptionsContent.includes('flight.logo') || travelOptionsContent.includes('Plane'), 'Must display airline logo or Plane fallback icon');
});

runTest('3.2: Result card answers "2. When?" (Departure time, Arrival time)', () => {
  assert(travelOptionsContent.includes('flight.depart'), 'Must display departure time');
  assert(travelOptionsContent.includes('flight.arrive'), 'Must display arrival time');
});

runTest('3.3: Result card answers "3. How long?" (Duration and stops)', () => {
  assert(travelOptionsContent.includes('flight.duration'), 'Must display duration');
  assert(travelOptionsContent.includes('flight.stops'), 'Must display stops info');
});

runTest('3.4: Result card answers "4. How much?" (Price per person, total price, live fare badge)', () => {
  assert(travelOptionsContent.includes('formatPrice(flight.price)'), 'Must format flight price');
  assert(travelOptionsContent.includes('/ traveler'), 'Must show / traveler indicator');
  assert(travelOptionsContent.includes('Google Flights · Live'), 'Must attribute live Google Flights fare');
});

runTest('3.5: Result card answers "5. What do I do?" (Prominent Select CTA button)', () => {
  assert(travelOptionsContent.includes('Select →') && travelOptionsContent.includes('Selected'), 'Must display Select CTA with selected state');
  assert(travelOptionsContent.includes('onSelectFlightOffer'), 'Must trigger flight selection callback');
});

// ── 4. SEMANTIC RECOMMENDATION BADGES ─────────────────────────────────────

runTest('4.1: Recommendation badges render CHEAPEST, FASTEST, RECOMMENDED, and BEST VALUE', () => {
  assert(travelOptionsContent.includes('CHEAPEST'), 'Must display CHEAPEST badge');
  assert(travelOptionsContent.includes('FASTEST'), 'Must display FASTEST badge');
  assert(travelOptionsContent.includes('RECOMMENDED'), 'Must display RECOMMENDED badge');
  assert(travelOptionsContent.includes('BEST VALUE'), 'Must display BEST VALUE badge');
  assert(travelOptionsContent.includes('badgeMeta'), 'Must dynamically calculate best badges');
});

// ── 5. LOADING SKELETON STATE ─────────────────────────────────────────────

runTest('5.1: Loading state renders multi-card skeleton without central spinner', () => {
  assert(travelOptionsContent.includes('Searching available routes...'), 'Must render "Searching available routes..." message');
  assert(travelOptionsContent.includes('renderSkeletonList()'), 'Must render skeleton cards list');
  assert(travelOptionsContent.includes('<Skeleton'), 'Must use Skeleton primitive');
});

// ── 6. EMPTY & ERROR STATES ───────────────────────────────────────────────

runTest('6.1: Empty state renders "No transport options found" with [ Modify Search ] button', () => {
  assert(travelOptionsContent.includes('No transport options found'), 'Must have empty state title');
  assert(travelOptionsContent.includes('onModifySearch'), 'Must have Modify Search action on empty state');
});

runTest('6.2: Error state renders "We couldn\'t load travel options" with [ Try Again ] and [ Modify Search ]', () => {
  assert(travelOptionsContent.includes("We couldn't load travel options"), 'Must have friendly error message');
  assert(travelOptionsContent.includes('onRetrySearch'), 'Must support onRetrySearch in error state');
  assert(travelOptionsContent.includes('Try Again'), 'Must have Try Again button');
});

runTest('6.3: Error state never discloses API keys, SerpApi technical strings, or stack traces', () => {
  assert(!travelOptionsContent.includes('api_key='), 'Must not expose api_key');
  assert(!travelOptionsContent.includes('SERPAPI_API_KEY'), 'Must not expose SERPAPI_API_KEY');
  assert(!travelOptionsContent.includes('process.env'), 'Must not disclose process.env in TravelOptions');
});

// ── 7. RESPONSIVE MOBILE DRAWER (375x812) ────────────────────────────────

runTest('7.1: Mobile view contains [ Filters ] and [ Sort ] trigger bar', () => {
  assert(travelOptionsContent.includes('Filters'), 'Must have Filters trigger button');
  assert(travelOptionsContent.includes('Sort:'), 'Must have Sort dropdown or trigger');
  assert(travelOptionsContent.includes('showMobileFilterModal'), 'Must track mobile filter modal state');
});

runTest('7.2: Mobile filter sheet uses Roamly Modal primitive', () => {
  assert(travelOptionsContent.includes('<Modal'), 'Must use Modal primitive for mobile filter sheet');
  assert(travelOptionsContent.includes('Filter Travel Options'), 'Must have accessible modal title');
});

// ── 8. WIRING WITH PLANNER PAGE ──────────────────────────────────────────

runTest('8.1: PlannerPage passes onRetrySearch and handles search parameter reload', () => {
  assert(plannerPageContent.includes('onRetrySearch={() => {'), 'PlannerPage must pass onRetrySearch to TravelOptions');
  assert(plannerPageContent.includes('handleSearch({'), 'Must call handleSearch with activeTrip parameters');
});

console.log(`\n====================================================`);
console.log(`🏁 Results: ${passedTests}/${totalTests} tests passed`);
console.log(`====================================================`);

if (passedTests !== totalTests) {
  process.exit(1);
}
