import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getRedBusCitySlug,
  getRedBusUrl,
  getConfirmTktUrl,
  getGoogleFlightsUrl,
  extractDateOnly
} from '../frontend/src/utils/transportLinks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Starting Phase D: Route-Aware Train and Bus Booking Links Test Suite...\n');

let total = 0;
let passed = 0;

function runTest(name, fn) {
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

// -------------------------------------------------------------
// Test Group 1: redBus City Slug Normalization & Character Encoding
// -------------------------------------------------------------
console.log('--- TEST GROUP 1: redBus City Slug Normalization ---');

runTest('1.1 Standard cities produce lowercased kebab-case slugs', () => {
  assert.equal(getRedBusCitySlug('Bangalore'), 'bangalore');
  assert.equal(getRedBusCitySlug('Jaipur'), 'jaipur');
  assert.equal(getRedBusCitySlug('New Delhi'), 'new-delhi');
  assert.equal(getRedBusCitySlug('St. Petersburg'), 'st-petersburg');
});

runTest('1.2 Comma-separated region and country suffixes are stripped before slugifying', () => {
  assert.equal(getRedBusCitySlug('Bangalore, Karnataka, India'), 'bangalore');
  assert.equal(getRedBusCitySlug('Jaipur, Rajasthan'), 'jaipur');
  assert.equal(getRedBusCitySlug('Chennai, Tamil Nadu'), 'chennai');
});

runTest('1.3 Parenthetical station/airport codes are cleanly removed', () => {
  assert.equal(getRedBusCitySlug('Bengaluru (BLR)'), 'bengaluru');
  assert.equal(getRedBusCitySlug('Hyderabad (HYD)'), 'hyderabad');
  assert.equal(getRedBusCitySlug('Mumbai (BOM)'), 'mumbai');
});

runTest('1.4 Unicode diacritics are normalized cleanly into standard ASCII slugs', () => {
  assert.equal(getRedBusCitySlug('São Paulo'), 'sao-paulo');
  assert.equal(getRedBusCitySlug('München'), 'munchen');
});

runTest('1.5 Empty, null, or whitespace values safely return empty string', () => {
  assert.equal(getRedBusCitySlug(''), '');
  assert.equal(getRedBusCitySlug('   '), '');
  assert.equal(getRedBusCitySlug(null), '');
  assert.equal(getRedBusCitySlug(undefined), '');
  assert.equal(getRedBusCitySlug(123), '');
});

// -------------------------------------------------------------
// Test Group 2: Route-Aware redBus Booking Link Construction
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 2: redBus URL Construction & Fallbacks ---');

runTest('2.1 Valid origin and destination produce canonical route-aware corridor URL', () => {
  const url = getRedBusUrl('Bengaluru', 'Chennai', '2026-11-10');
  assert.equal(url, 'https://www.redbus.in/bus-tickets/bengaluru-to-chennai');
});

runTest('2.2 Different corridor combinations generate accurate paths', () => {
  assert.equal(getRedBusUrl('Hyderabad', 'Goa'), 'https://www.redbus.in/bus-tickets/hyderabad-to-goa');
  assert.equal(getRedBusUrl('New Delhi', 'Jaipur'), 'https://www.redbus.in/bus-tickets/new-delhi-to-jaipur');
  assert.equal(getRedBusUrl('Pune', 'Mumbai'), 'https://www.redbus.in/bus-tickets/pune-to-mumbai');
});

runTest('2.3 Missing origin or destination safely falls back to provider homepage', () => {
  assert.equal(getRedBusUrl(null, 'Chennai'), 'https://www.redbus.in/');
  assert.equal(getRedBusUrl('Bengaluru', null), 'https://www.redbus.in/');
  assert.equal(getRedBusUrl('', ''), 'https://www.redbus.in/');
  assert.equal(getRedBusUrl('   ', 'Chennai'), 'https://www.redbus.in/');
  assert.equal(getRedBusUrl('Bengaluru', '   '), 'https://www.redbus.in/');
});

runTest('2.4 Unsupported query parameters or 404 endpoints are NEVER generated', () => {
  const url = getRedBusUrl('Bengaluru', 'Chennai', '2026-11-10');
  assert(!url.includes('/bus-tickets/search?'), 'Must not use broken /bus-tickets/search? endpoint');
  assert(!url.includes('fromCityName='), 'Must not use invalid fromCityName parameter');
  assert(!url.includes('toCityName='), 'Must not use invalid toCityName parameter');
  assert(!url.includes('undefined'), 'Must never output literal "undefined"');
  assert(!url.includes('null'), 'Must never output literal "null"');
});

// -------------------------------------------------------------
// Test Group 3: ConfirmTkt Official Search Portal Safety
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 3: ConfirmTkt Portal Safety ---');

runTest('3.1 ConfirmTkt safely routes to official train search portal without fake train schedules', () => {
  const url = getConfirmTktUrl('Bengaluru', 'Chennai', '2026-11-10');
  assert.equal(url, 'https://www.confirmtkt.com/');
});

runTest('3.2 ConfirmTkt does not produce 404 fake train schedule URLs', () => {
  const url = getConfirmTktUrl('12839', '15042');
  assert(!url.includes('/train-schedule/12839'), 'Must not emit /train-schedule/12839');
  assert(!url.includes('/train-schedule/15042'), 'Must not emit /train-schedule/15042');
  assert(!url.includes('/trains-between-stations'), 'Must not emit 404 /trains-between-stations');
});

// -------------------------------------------------------------
// Test Group 4: Timezone Safety for Date-Only Values
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Date-Only Timezone Safety ---');

runTest('4.1 String YYYY-MM-DD dates are strictly preserved without UTC shifting', () => {
  assert.equal(extractDateOnly('2026-10-02'), '2026-10-02');
  assert.equal(extractDateOnly('2026-12-31'), '2026-12-31');
  assert.equal(extractDateOnly('2027-01-01'), '2027-01-01');
});

runTest('4.2 Date objects preserve local calendar date', () => {
  const d = new Date(2026, 9, 2); // Oct 2, 2026
  assert.equal(extractDateOnly(d), '2026-10-02');
});

runTest('4.3 Invalid or missing dates return null safely without throwing', () => {
  assert.equal(extractDateOnly(null), null);
  assert.equal(extractDateOnly(''), null);
  assert.equal(extractDateOnly('not-a-date'), null);
});

// -------------------------------------------------------------
// Test Group 5: JSX Source Verification (Security, Titles & Disclaimers)
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Component Source Contracts & Security Attributes ---');

const travelOptionsPath = path.join(__dirname, '../frontend/src/components/TravelOptions.jsx');
const travelOptionsSrc = fs.readFileSync(travelOptionsPath, 'utf-8');

runTest('5.1 ConfirmTkt link has target="_blank" and rel="noopener noreferrer"', () => {
  assert(travelOptionsSrc.includes('target="_blank"'), 'Must have target="_blank"');
  assert(travelOptionsSrc.includes('rel="noopener noreferrer"'), 'Must have rel="noopener noreferrer"');
});

runTest('5.2 TravelOptions getConfirmTktUrl and getRedBusUrl wrapper signatures are aligned', () => {
  assert(
    travelOptionsSrc.includes('const getConfirmTktUrl = (origin = from, destination = to, travelDate = date) =>'),
    'getConfirmTktUrl wrapper parameters must be (origin, destination, travelDate)'
  );
  assert(
    travelOptionsSrc.includes('const getRedBusUrl = (origin = from, destination = to, travelDate = date) =>'),
    'getRedBusUrl wrapper parameters must be (origin, destination, travelDate)'
  );
});

runTest('5.3 Disclaimers and tooltips clearly communicate estimated fares and portal manual verification', () => {
  assert(
    travelOptionsSrc.includes('Train schedules and fares shown are route estimates. ConfirmTkt opens the live booking portal'),
    'Train tab disclaimer informs user about route estimates and live ConfirmTkt booking portal'
  );
  assert(
    travelOptionsSrc.includes('Bus services and fares shown are route estimates. redBus opens the'),
    'Bus tab disclaimer informs user about route estimates and live redBus corridor'
  );
  assert(
    travelOptionsSrc.includes('Open ConfirmTkt live train search portal'),
    'ConfirmTkt link title communicates manual entry/search'
  );
  assert(
    travelOptionsSrc.includes('View live buses and seat charts on redBus'),
    'redBus link title communicates live seat charts and booking'
  );
});

// -------------------------------------------------------------
// Test Group 6: Non-Regression of Google Flights Handoff
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 6: Non-Regression of Flight Handoff ---');

runTest('6.1 Google Flights round-trip URL preserves route, dates, and passengers', () => {
  const flightUrl = getGoogleFlightsUrl({
    origin: 'Hyderabad (HYD)',
    destination: 'Bengaluru (BLR)',
    departureDate: '2026-10-02',
    returnDate: '2026-10-05',
    passengers: 2,
    cabin: 'economy'
  });

  assert(flightUrl.startsWith('https://www.google.com/travel/flights?q='), 'Google Flights prefix valid');
  assert(flightUrl.includes('HYD'), 'Origin IATA code included');
  assert(flightUrl.includes('BLR'), 'Destination IATA code included');
  assert(flightUrl.includes('2026-10-02'), 'Departure date included');
  assert(flightUrl.includes('2026-10-05'), 'Return date included');
  assert(flightUrl.includes('2%20adults'), 'Passenger count included');
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n====================================================');
console.log(`🏁 PHASE D RESULTS: ${passed}/${total} TESTS PASSED`);
console.log('====================================================\n');

if (passed !== total) {
  process.exit(1);
}
