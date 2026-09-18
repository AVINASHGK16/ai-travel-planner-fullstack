/**
 * Automated Verification Suite for UI-3.3 Trip Overview & Itinerary Experience
 * ROAMLY — Visual hierarchy, trip header, summary cards, itinerary timeline, day navigation,
 * supporting trip map, attached compact weather, purple AI suggestions, compact budget, and states.
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
console.log('🧪 Running UI-3.3 Trip Overview & Itinerary Suite');
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

const tripOverviewContent = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripOverview.jsx'), 'utf-8');
const plannerIndexContent = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'index.js'), 'utf-8');
const plannerPageContent = fs.readFileSync(path.join(FRONTEND_DIR, 'pages', 'PlannerPage.jsx'), 'utf-8');

// ── 1. ARCHITECTURE & EXPORTS ─────────────────────────────────────────────

runTest('1.1: TripOverview component is exported from planner/index.js', () => {
  assert(plannerIndexContent.includes("export { default as TripOverview } from './TripOverview';"), 'Must export TripOverview from planner module');
});

runTest('1.2: PlannerPage imports TripOverview and manages activeView stage navigation', () => {
  assert(plannerPageContent.includes('TripOverview'), 'PlannerPage must import TripOverview');
  assert(plannerPageContent.includes("activeView === 'overview'"), 'PlannerPage must conditionally render overview');
  assert(plannerPageContent.includes("activeView === 'transport'"), 'PlannerPage must support transport view');
});

// ── 2. TRIP HEADER ────────────────────────────────────────────────────────

runTest('2.1: Trip Header has "← Back to Trips" navigation link', () => {
  assert(tripOverviewContent.includes('← Back to Trips'), 'Must contain "← Back to Trips" link');
  assert(tripOverviewContent.includes('ArrowLeft'), 'Must include ArrowLeft icon');
});

runTest('2.2: Trip Header renders Origin → Destination and metadata line', () => {
  assert(tripOverviewContent.includes('{originName}'), 'Must display origin');
  assert(tripOverviewContent.includes('{destinationName}'), 'Must display destination');
  assert(tripOverviewContent.includes('dateRangeStr'), 'Must display date range');
  assert(tripOverviewContent.includes('travelersLabel'), 'Must display travelers count');
  assert(tripOverviewContent.includes('daysLabel'), 'Must display days duration');
});

runTest('2.3: Trip Header provides Edit Trip, Save, and overflow menu with actions', () => {
  assert(tripOverviewContent.includes('Edit Trip'), 'Must contain [ Edit Trip ] action');
  assert(tripOverviewContent.includes('Save') && tripOverviewContent.includes('Saved'), 'Must contain [ Save ] action with saved state');
  assert(tripOverviewContent.includes('MoreVertical'), 'Must contain overflow menu trigger');
  assert(tripOverviewContent.includes('Download PDF Itinerary'), 'Must offer PDF download in overflow');
  assert(tripOverviewContent.includes('Share Trip'), 'Must offer Share Trip in overflow');
});

// ── 3. TRIP SUMMARY SECTION ───────────────────────────────────────────────

runTest('3.1: Trip Summary renders "Total Estimated Cost" with formatted amount', () => {
  assert(tripOverviewContent.includes('Total Estimated Cost'), 'Must have Total Estimated Cost label');
  assert(tripOverviewContent.includes('totalEstimatedCost.toLocaleString()'), 'Must format total estimated cost');
});

runTest('3.2: Trip Summary has 4 compact metric cards (Flights, Stays, Activities, Transport)', () => {
  assert(tripOverviewContent.includes('Flights'), 'Must have Flights summary card');
  assert(tripOverviewContent.includes('Stays'), 'Must have Stays summary card');
  assert(tripOverviewContent.includes('Activities'), 'Must have Activities summary card');
  assert(tripOverviewContent.includes('Transport'), 'Must have Transport summary card');
});

// ── 4. ITINERARY & TIMELINE (PRIMARY CONTENT) ────────────────────────────

runTest('4.1: Itinerary section has title and Day Navigation (‹ Day 1 Day 2 ... ›)', () => {
  assert(tripOverviewContent.includes('ITINERARY'), 'Must contain ITINERARY header');
  assert(tripOverviewContent.includes('ChevronLeft') && tripOverviewContent.includes('ChevronRight'), 'Must have prev/next navigation');
  assert(tripOverviewContent.includes('Day {dayNum}'), 'Must render Day buttons');
  assert(tripOverviewContent.includes('selectedDay === dayNum'), 'Must track selectedDay');
});

runTest('4.2: Selected day header has attached compact weather', () => {
  assert(tripOverviewContent.includes('DAY {selectedDay}'), 'Must display active day banner');
  assert(tripOverviewContent.includes('dayWeatherTemp'), 'Must attach day temperature');
  assert(tripOverviewContent.includes('dayWeatherCondition'), 'Must attach day weather condition');
});

runTest('4.3: Visual vertical timeline communicates day progression', () => {
  assert(tripOverviewContent.includes('w-0.5 bg-slate-200'), 'Must render continuous vertical timeline guide');
  assert(tripOverviewContent.includes('✈ Arrive in'), 'Must have Day 1 transit arrival step');
  assert(tripOverviewContent.includes('activity.time'), 'Must display activity time');
  assert(tripOverviewContent.includes('activity.title'), 'Must display activity location/title');
  assert(tripOverviewContent.includes('activityDuration'), 'Must display activity duration');
});

runTest('4.4: AI Suggestions strictly use reserved purple token (zero purple in product actions)', () => {
  assert(tripOverviewContent.includes('✨ AI Suggestion'), 'Must render ✨ AI Suggestion');
  assert(tripOverviewContent.includes('bg-purple-50'), 'Must use purple background token for AI');
  assert(tripOverviewContent.includes('text-purple-600'), 'Must use purple icon token for AI');
  assert(!tripOverviewContent.includes('bg-purple-600 text-white shadow'), 'Must NOT make product buttons purple');
});

// ── 5. TRIP MAP (SUPPORTING CONTEXT) ──────────────────────────────────────

runTest('5.1: Trip Map card has header and "[ View Full Map ]" trigger', () => {
  assert(tripOverviewContent.includes('TRIP MAP'), 'Must contain TRIP MAP header');
  assert(tripOverviewContent.includes('[ View Full Map ]'), 'Must contain [ View Full Map ] button');
  assert(tripOverviewContent.includes('fullMapOpen'), 'Must manage full map modal state');
});

runTest('5.2: Trip Map renders day waypoints using Leaflet and isolates with MapErrorBoundary', () => {
  assert(tripOverviewContent.includes('<MapContainer'), 'Must use Leaflet MapContainer');
  assert(tripOverviewContent.includes('<Marker'), 'Must render day markers');
  assert(tripOverviewContent.includes('MapErrorBoundary'), 'Must wrap map in MapErrorBoundary');
  assert(tripOverviewContent.includes('dayWaypoints'), 'Must map active day waypoints');
});

runTest('5.3: Full map modal opens in Roamly Modal primitive', () => {
  assert(tripOverviewContent.includes('<Modal'), 'Must render full map in Modal');
  assert(tripOverviewContent.includes('isOpen={fullMapOpen}'), 'Modal must bind to fullMapOpen');
});

// ── 6. COMPACT BUDGET SECTION ─────────────────────────────────────────────

runTest('6.1: Compact Budget section displays estimated vs planned and progress bar', () => {
  assert(tripOverviewContent.includes('Budget'), 'Must have Budget section');
  assert(tripOverviewContent.includes('plannedBudget'), 'Must compare against planned budget');
  assert(tripOverviewContent.includes('budgetPercent'), 'Must compute budget percentage');
  assert(tripOverviewContent.includes('role="progressbar"'), 'Must render accessible progress bar');
});

runTest('6.2: Budget displays remaining amount and category breakdown', () => {
  assert(tripOverviewContent.includes('remaining') || tripOverviewContent.includes('over budget'), 'Must indicate remaining or over budget');
  assert(tripOverviewContent.includes('Flights & Transit') || tripOverviewContent.includes('Flights &amp; Transit'), 'Must break down Flights');
  assert(tripOverviewContent.includes('Hotels & Stays') || tripOverviewContent.includes('Hotels &amp; Stays'), 'Must break down Stays');
  assert(tripOverviewContent.includes('Food & Activities') || tripOverviewContent.includes('Food &amp; Activities'), 'Must break down Activities');
});

// ── 7. RESILIENT STATES ───────────────────────────────────────────────────

runTest('7.1: Loading state renders skeletons using Skeleton primitive without blocking spinner', () => {
  assert(tripOverviewContent.includes('<Skeleton'), 'Must use Skeleton primitive');
  assert(tripOverviewContent.includes('aria-busy="true"'), 'Must have accessible loading state');
});

runTest('7.2: Empty state displays "No itinerary available yet" and plan CTA', () => {
  assert(tripOverviewContent.includes('No itinerary available yet'), 'Must have empty state title');
  assert(tripOverviewContent.includes('Generate an itinerary to start planning your trip.'), 'Must have empty state guidance');
  assert(tripOverviewContent.includes('Plan Trip'), 'Must have Plan Trip CTA');
});

runTest('7.3: Error state displays "We couldn\'t load this trip. Please try again." with [ Try Again ]', () => {
  assert(tripOverviewContent.includes("We couldn't load this trip."), 'Must have friendly error title');
  assert(tripOverviewContent.includes('Please try again.'), 'Must have retry instruction');
  assert(tripOverviewContent.includes('Try Again'), 'Must have Try Again button');
});

runTest('7.4: Zero secret, API key, SerpApi, or stack trace disclosures in TripOverview', () => {
  assert(!tripOverviewContent.includes('api_key='), 'Must not expose api_key');
  assert(!tripOverviewContent.includes('SERPAPI_API_KEY'), 'Must not expose SERPAPI_API_KEY');
  assert(!tripOverviewContent.includes('process.env'), 'Must not disclose process.env');
  assert(!tripOverviewContent.includes('stack'), 'Must not disclose stack traces');
});

// ── 8. RESPONSIVE LAYOUT (1280 / 1440 / 375) ──────────────────────────────

runTest('8.1: Desktop implements two-column grid (lg:grid-cols-12, 7 cols Itinerary, 5 cols Map)', () => {
  assert(tripOverviewContent.includes('lg:grid-cols-12'), 'Must use 12-col responsive grid');
  assert(tripOverviewContent.includes('lg:col-span-7'), 'Itinerary column must be lg:col-span-7');
  assert(tripOverviewContent.includes('lg:col-span-5'), 'Map/Budget column must be lg:col-span-5');
});

console.log(`\n====================================================`);
console.log(`🏁 Results: ${passedTests}/${totalTests} tests passed`);
console.log(`====================================================`);

if (passedTests !== totalTests) {
  process.exit(1);
}
