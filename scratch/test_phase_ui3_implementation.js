/**
 * Automated Verification Suite for Phase UI-3 Implementation
 * ROAMLY — Plan Trip + Flight Results Visual Redesign
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT_DIR = path.resolve('c:/Users/g/OneDrive/Documents/AI TRAVEL PLANNER');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend', 'src');

console.log('====================================================');
console.log('🧪 Running Phase UI-3 Implementation Test Suite');
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

// ── PHASE A: PLAN TRIP PAGE ─────────────────────────────────────────

runTest('A1: PlannerHeader has "Plan Your Next Adventure with AI" and supporting text', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'PlannerHeader.jsx'), 'utf-8');
  assert(content.includes('Plan Your Next'), 'Must contain "Plan Your Next"');
  assert(content.includes('Adventure with AI'), 'Must contain "Adventure with AI"');
  assert(content.includes('text-blue-600'), 'Must style "Adventure with AI" prominently');
  assert(content.includes("Tell us where you're going and we'll help you build the perfect itinerary with live routes, fares, and AI insights."), 'Must contain supporting text');
});

runTest('A2: TripConfigurationCard includes Round Trip / One Way / Multi-city selector', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripConfigurationCard.jsx'), 'utf-8');
  assert(content.includes('Round Trip'), 'Must have Round Trip option');
  assert(content.includes('One Way'), 'Must have One Way option');
  assert(content.includes('Multi-city'), 'Must have Multi-city option');
});

runTest('A3: TripConfigurationCard has FROM, TO, and Swap control', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripConfigurationCard.jsx'), 'utf-8');
  assert(content.includes('label="FROM"'), 'Must have FROM label');
  assert(content.includes('label="TO"'), 'Must have TO label');
  assert(content.includes('placeholder="Bengaluru (BLR)"'), 'Must have Bengaluru placeholder');
  assert(content.includes('placeholder="Goa (GOI)"'), 'Must have Goa placeholder');
  assert(content.includes('id="planner-swap-btn"'), 'Must have swap button');
  assert(content.includes('handleSwapLocations'), 'Must have swap handler');
});

runTest('A4: TripConfigurationCard has DEPARTURE and RETURN date pickers', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripConfigurationCard.jsx'), 'utf-8');
  assert(content.includes('label="DEPARTURE"'), 'Must have DEPARTURE label');
  assert(content.includes('RETURN'), 'Must have RETURN label');
  assert(content.includes('id="planner-departure-date"'), 'Must have departure date input');
  assert(content.includes('id="planner-return-date"'), 'Must have return date input');
});

runTest('A5: TripConfigurationCard has TRAVELERS, TRIP TYPE, and BUDGET 3-column row', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripConfigurationCard.jsx'), 'utf-8');
  assert(content.includes('label="TRAVELERS"'), 'Must have TRAVELERS label');
  assert(content.includes('label="TRIP TYPE"'), 'Must have TRIP TYPE label');
  assert(content.includes('BUDGET'), 'Must have BUDGET label');
  assert(content.includes('planner-budget-slider'), 'Must have budget range slider');
});

runTest('A6: TripConfigurationCard has strongest CTA "[ Search Flights & Plan Trip → ]"', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripConfigurationCard.jsx'), 'utf-8');
  assert(content.includes('Search Flights & Plan Trip →'), 'Must have primary CTA "Search Flights & Plan Trip →"');
  assert(content.includes('variant="primary"'), 'Must use primary variant');
});

runTest('A7: PlanWithAICallout has purple AI reserved styling, description, and Plan with AI CTA', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'PlanWithAICallout.jsx'), 'utf-8');
  assert(content.includes('Plan with AI'), 'Must have Plan with AI title and CTA');
  assert(content.includes('Describe your dream trip and let Roamly create a personalized itinerary for you'), 'Must contain description');
  assert(content.includes('purple-'), 'Must use purple reserved token for AI');
});

runTest('A8: TravelFeatureStrip has 4 proof points with micro-icons and restrained typography', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TravelFeatureStrip.jsx'), 'utf-8');
  assert(content.includes('Live flight data'), 'Must have Live flight data proof point');
  assert(content.includes('Curated itineraries'), 'Must have Curated itineraries proof point');
  assert(content.includes('Maps & navigation'), 'Must have Maps & navigation proof point');
  assert(content.includes('AI recommendations'), 'Must have AI recommendations proof point');
});

runTest('A9: QuickStartSuggestions has inspiration heading and 4 image-driven destination cards', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'QuickStartSuggestions.jsx'), 'utf-8');
  assert(content.includes('Need inspiration?'), 'Must have Need inspiration? heading');
  assert(content.includes('Popular destinations for your next adventure'), 'Must have subtitle');
  assert(content.includes('Goa Weekend'), 'Must have Goa Weekend card');
  assert(content.includes('Rajasthan Explorer'), 'Must have Rajasthan Explorer card');
  assert(content.includes('Himalayan Escape'), 'Must have Himalayan Escape card');
  assert(content.includes('Kerala Getaway'), 'Must have Kerala Getaway card');
  assert(content.includes('/images/destinations/goa.jpg'), 'Must link to Goa photography asset');
  assert(content.includes('/images/destinations/rajasthan.jpg'), 'Must link to Rajasthan photography asset');
  assert(content.includes('/images/destinations/himalayas.jpg'), 'Must link to Himalayas photography asset');
  assert(content.includes('/images/destinations/kerala.jpg'), 'Must link to Kerala photography asset');
});

// ── PHASE B: FLIGHT RESULTS PAGE ────────────────────────────────────

runTest('B1: TripSummaryBar has "Origin to Destination", metadata line, and "[ Modify Search ]"', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripSummaryBar.jsx'), 'utf-8');
  assert(content.includes('{originName} to {destinationName}'), 'Must format header as "Origin to Destination"');
  assert(content.includes('activeTrip.travelers'), 'Must display travelers in metadata');
  assert(content.includes('tripTypeLabel'), 'Must display trip type in metadata');
  assert(content.includes('Modify Search'), 'Must have secondary "[ Modify Search ]" button');
  assert(content.includes('Save Plan'), 'Must have "[ Save Plan ]" action');
});

runTest('B2: TravelOptions has 4 clear transport selector tabs with Flights active by default', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'TravelOptions.jsx'), 'utf-8');
  assert(content.includes('<span>Flights</span>'), 'Must have Flights tab');
  assert(content.includes('<span>Road Trip</span>'), 'Must have Road Trip tab');
  assert(content.includes('<span>Trains</span>'), 'Must have Trains tab');
  assert(content.includes('<span>Buses</span>'), 'Must have Buses tab');
  assert(content.includes("activeMode = 'flight'"), 'Must have Flights active by default');
});

runTest('B3: TravelOptions implements 3-column desktop layout (Filters, Flight Results, Contextual Sidebar)', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'TravelOptions.jsx'), 'utf-8');
  assert(content.includes('grid-cols-1 lg:grid-cols-12'), 'Must use 12-column grid layout');
  assert(content.includes('lg:col-span-3'), 'Must have ~20-25% filter / sidebar column');
  assert(content.includes('lg:col-span-6'), 'Must have ~55-60% results column');
  assert(content.includes('renderFilterPanel()'), 'Must render left filter panel');
  assert(content.includes('renderRightSidebar()'), 'Must render right contextual sidebar');
});

runTest('B4: Filter panel contains Sort by, Stops, and Airlines filters', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'TravelOptions.jsx'), 'utf-8');
  assert(content.includes('Recommended'), 'Must have Recommended sort');
  assert(content.includes('Lowest Price'), 'Must have Lowest Price sort');
  assert(content.includes('Shortest Duration'), 'Must have Shortest Duration sort');
  assert(content.includes('Earliest Departure'), 'Must have Earliest Departure sort');
  assert(content.includes('Non-stop'), 'Must have Non-stop checkbox');
  assert(content.includes('1 stop'), 'Must have 1 stop checkbox');
  assert(content.includes('2+ stops'), 'Must have 2+ stops checkbox');
  assert(content.includes('availableAirlines'), 'Must dynamically populate available airlines');
});

runTest('B5: Flight result card has clean horizontal hierarchy: Airline, Depart/Arrive, Duration/Stops, Price, Select CTA', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'TravelOptions.jsx'), 'utf-8');
  assert(content.includes('flight.airline'), 'Must display airline');
  assert(content.includes('flight.depart'), 'Must display departure time');
  assert(content.includes('flight.arrive'), 'Must display arrival time');
  assert(content.includes('flight.duration'), 'Must display duration');
  assert(content.includes('/ traveler'), 'Must display per traveler price');
  assert(content.includes('Select →') && content.includes('Selected'), 'Must display Select CTA with state');
  assert(content.includes('Google Flights · Live'), 'Must display live fare badge');
});

runTest('B6: Contextual Right Sidebar contains YOUR TRIP, PRICE INSIGHTS, and POPULAR TIMES', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'TravelOptions.jsx'), 'utf-8');
  assert(content.includes('YOUR TRIP'), 'Must have YOUR TRIP card');
  assert(content.includes('PRICE INSIGHTS'), 'Must have PRICE INSIGHTS card');
  assert(content.includes('12% lower than the average fare for this route.'), 'Must have comparative price callout');
  assert(content.includes('POPULAR TIMES'), 'Must have POPULAR TIMES card');
});

runTest('B7: Compact "Smart picks" chips bar sits above primary flight results without overpowering', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'TravelOptions.jsx'), 'utf-8');
  assert(content.includes('✨ Smart picks'), 'Must have Smart picks heading');
  assert(content.includes('Best value'), 'Must have Best value pick');
  assert(content.includes('Fastest'), 'Must have Fastest pick');
  assert(content.includes('Cheapest'), 'Must have Cheapest pick');
});

runTest('B8: PlannerPage wires TravelOptions as primary focal content with 3-column flight results', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'pages', 'PlannerPage.jsx'), 'utf-8');
  assert(content.includes('<TravelOptions'), 'Must render TravelOptions');
  assert(content.includes('onModifySearch'), 'Must pass onModifySearch to TravelOptions');
  assert(content.includes('onSelectFlightOffer'), 'Must pass onSelectFlightOffer to TravelOptions');
  assert(content.includes('PlanWithAICallout'), 'Must render PlanWithAICallout in empty state');
  assert(content.includes('TravelFeatureStrip'), 'Must render TravelFeatureStrip in empty state');
});

console.log(`\n====================================================`);
console.log(`🏁 Results: ${passedTests}/${totalTests} tests passed`);
console.log(`====================================================`);

if (passedTests !== totalTests) {
  process.exit(1);
}
