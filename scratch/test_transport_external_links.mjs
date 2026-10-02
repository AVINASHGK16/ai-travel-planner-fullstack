import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRedBusCitySlug, getRedBusUrl, getConfirmTktUrl } from '../frontend/src/utils/transportLinks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🧪 RUNNING PHASE D: TRAIN & BUS EXTERNAL TRANSPORT TEST SUITE');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

// Read source files for structural verification
const travelOptionsPath = path.join(__dirname, '../frontend/src/components/TravelOptions.jsx');
const travelOptionsSource = fs.readFileSync(travelOptionsPath, 'utf-8');

const plannerPagePath = path.join(__dirname, '../frontend/src/pages/PlannerPage.jsx');
const plannerPageSource = fs.readFileSync(plannerPagePath, 'utf-8');

// ─── TEST 1 & 2: Train CTA does NOT contain fake train-schedule links ─────
console.log('--- PART 1: Train External Navigation & Link Safety ---');

test('1. Train CTA does NOT contain /train-schedule/15042', () => {
  const url1 = getConfirmTktUrl('Bangalore', 'Jaipur');
  assert(!url1.includes('/train-schedule/15042'), 'URL must not contain /train-schedule/15042');
  assert(!url1.includes('15042'), 'URL must not contain mock train 15042');

  // Verify that passing synthetic number does not produce /train-schedule/15042
  const fallbackAttempt = getConfirmTktUrl('15042');
  assert(!fallbackAttempt.includes('/train-schedule/15042'), 'Even if train number passed, must not output /train-schedule/15042');

  // Check TravelOptions.jsx source
  assert(!travelOptionsSource.includes('/train-schedule/${trainNo}'), 'TravelOptions.jsx must not construct train-schedule URL');
  assert(!travelOptionsSource.includes('getConfirmTktUrl(train.number)'), 'CTA in TravelOptions.jsx must not pass train.number to ConfirmTkt link');
});

test('2. Train CTA does NOT contain /train-schedule/12839', () => {
  const url = getConfirmTktUrl('Bangalore', 'Jaipur');
  assert(!url.includes('/train-schedule/12839'), 'URL must not contain /train-schedule/12839');
  assert(!url.includes('12839'), 'URL must not contain mock train 12839');

  const fallbackAttempt = getConfirmTktUrl('12839');
  assert(!fallbackAttempt.includes('/train-schedule/12839'), 'Must not output /train-schedule/12839');
});

test('3. Train external destination is route-aware OR safely falls back to the provider homepage', () => {
  const url = getConfirmTktUrl('Bangalore', 'Jaipur');
  assert.strictEqual(url, 'https://www.confirmtkt.com/', 'ConfirmTkt CTA safely routes to official train search portal');

  const emptyCall = getConfirmTktUrl();
  assert.strictEqual(emptyCall, 'https://www.confirmtkt.com/', 'No params returns provider homepage');

  const nullCall = getConfirmTktUrl(null, null);
  assert.strictEqual(nullCall, 'https://www.confirmtkt.com/', 'Null params returns provider homepage');
});

// ─── TEST 4 - 7: Bus redBus Route-Aware Navigation & Fallback Safety ──────
console.log('\n--- PART 2: Bus External Navigation & Fallback Safety ---');

test('4. Bus CTA does NOT contain /bus-tickets/search?', () => {
  const url = getRedBusUrl('Bangalore', 'Jaipur');
  assert(!url.includes('/bus-tickets/search?'), 'Bus CTA must not use broken 404 endpoint /bus-tickets/search?');
  assert(!url.includes('fromCityName='), 'Bus CTA must not use invalid query param fromCityName');
  assert(!url.includes('toCityName='), 'Bus CTA must not use invalid query param toCityName');

  assert(!travelOptionsSource.includes('/bus-tickets/search?'), 'TravelOptions.jsx must not contain /bus-tickets/search?');
});

test('5. Bus Bangalore → Jaipur produces a route-aware destination', () => {
  const url = getRedBusUrl('Bangalore', 'Jaipur');
  assert.strictEqual(url, 'https://www.redbus.in/bus-tickets/bangalore-to-jaipur', 'Bangalore -> Jaipur produces canonical redBus destination');

  // Verify city normalization with state / country info
  const normalizedUrl = getRedBusUrl('Bangalore, Karnataka, India', 'Jaipur, Rajasthan');
  assert.strictEqual(normalizedUrl, 'https://www.redbus.in/bus-tickets/bangalore-to-jaipur', 'Comma-separated location strings normalized properly');

  // Verify parenthetical code stripping
  const parenUrl = getRedBusUrl('Bengaluru (BLR)', 'Jaipur (JAI)');
  assert.strictEqual(parenUrl, 'https://www.redbus.in/bus-tickets/bengaluru-to-jaipur', 'Parenthetical airport/station codes stripped properly');

  // Verify multi-word city names
  const multiWordUrl = getRedBusUrl('New Delhi', 'Jaipur');
  assert.strictEqual(multiWordUrl, 'https://www.redbus.in/bus-tickets/new-delhi-to-jaipur', 'Multi-word city slugs formatted with hyphens');
});

test('6. Missing origin does not produce undefined, null, empty path, or malformed query parameters', () => {
  const cases = [
    getRedBusUrl('', 'Jaipur'),
    getRedBusUrl(null, 'Jaipur'),
    getRedBusUrl(undefined, 'Jaipur'),
    getRedBusUrl('   ', 'Jaipur')
  ];

  for (const url of cases) {
    assert.strictEqual(url, 'https://www.redbus.in/', 'Missing origin safely falls back to provider homepage');
    assert(!url.includes('undefined'), 'URL must not contain "undefined"');
    assert(!url.includes('null'), 'URL must not contain "null"');
    assert(!url.includes('-to-'), 'URL must not have dangling "-to-"');
    assert(!url.includes('?'), 'URL must not have dangling query parameters');
  }
});

test('7. Missing destination behaves safely', () => {
  const cases = [
    getRedBusUrl('Bangalore', ''),
    getRedBusUrl('Bangalore', null),
    getRedBusUrl('Bangalore', undefined),
    getRedBusUrl('Bangalore', '   '),
    getRedBusUrl('', ''),
    getRedBusUrl(null, null),
    getRedBusUrl()
  ];

  for (const url of cases) {
    assert.strictEqual(url, 'https://www.redbus.in/', 'Missing destination safely falls back to provider homepage');
    assert(!url.includes('undefined'), 'URL must not contain "undefined"');
    assert(!url.includes('null'), 'URL must not contain "null"');
    assert(!url.includes('-to-'), 'URL must not have dangling "-to-"');
  }
});

// ─── TEST 8: Transport selection code integrity & Data presentation ────────
console.log('\n--- PART 3: Transport Selection & Data Presentation Integrity ---');

test('8. No transport-selection code was changed', () => {
  // Check handleSelectTrain in TravelOptions.jsx
  assert(travelOptionsSource.includes('const handleSelectTrain = (train) => {'), 'handleSelectTrain handler preserved');
  assert(travelOptionsSource.includes('setActiveTrainId(id);'), 'setActiveTrainId preserved');
  assert(travelOptionsSource.includes("setActiveMode('train');"), 'setActiveMode train preserved');
  assert(travelOptionsSource.includes('onSelectTrainOffer(train);'), 'onSelectTrainOffer invocation preserved');

  // Check handleSelectBus in TravelOptions.jsx
  assert(travelOptionsSource.includes('const handleSelectBus = (bus) => {'), 'handleSelectBus handler preserved');
  assert(travelOptionsSource.includes('setActiveBusId(id);'), 'setActiveBusId preserved');
  assert(travelOptionsSource.includes("setActiveMode('bus');"), 'setActiveMode bus preserved');
  assert(travelOptionsSource.includes('onSelectBusOffer(bus);'), 'onSelectBusOffer invocation preserved');

  // Check PlannerPage.jsx handlers
  assert(plannerPageSource.includes('onSelectTrainOffer={(train) => {'), 'PlannerPage passes onSelectTrainOffer handler');
  assert(plannerPageSource.includes('onSelectBusOffer={(bus) => {'), 'PlannerPage passes onSelectBusOffer handler');
});

test('9. Synthetic train numbers are not presented as real booking identities', () => {
  // Verify #{train.number} badge was removed from renderTrainsTab
  assert(!travelOptionsSource.includes('#{train.number}'), 'UI does not display #{train.number} badge claiming real train identity');
  
  // Verify clear estimate disclaimers are present in both tabs
  assert(travelOptionsSource.includes('Train schedules and fares shown are route estimates'), 'Train tab displays estimate disclaimer');
  assert(travelOptionsSource.includes('Bus services and fares shown are route estimates'), 'Bus tab displays estimate disclaimer');
  assert(travelOptionsSource.includes('Est. Availability: ~{train.avail} seats'), 'Train seats labeled as estimated');
  assert(travelOptionsSource.includes('Est. Seats: ~{bus.seats}'), 'Bus seats labeled as estimated');
});

console.log('\n====================================================');
console.log(`🏁 PHASE D RESULTS: ${passed}/${total} TESTS PASSED`);
console.log('====================================================\n');

if (passed !== total) {
  process.exit(1);
}
