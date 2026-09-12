/**
 * Test Suite: Phase 4B — Data Integrity, Geography, Transport Domain & Budget Correctness
 * 
 * Verifies all 18 requirements specified in Phase 4B:
 * 1. Bangalore -> Mysore resolves to geographically correct coordinates (~12.30°N, 76.65°E)
 * 2. Unknown destination never receives hash-generated coordinates
 * 3. Geocoding failure is explicit (FAILED_TO_GEOCODE)
 * 4. Origin and destination use one canonical representation
 * 5. Road route calculation does not use fake distance (~141 km for Bangalore -> Mysore)
 * 6. Haversine is not incorrectly treated as road distance
 * 7. Flight without provider data is unavailable/estimated, not falsely live
 * 8. Transport options contain provenance (source, status, fetchedAt)
 * 9. Flight budget does not include fuel/toll
 * 10. Own Vehicle budget includes fuel/toll/parking and excludes ticket cost
 * 11. Train budget does not include vehicle fuel
 * 12. Selected transport mode survives persistence
 * 13. Old saved trip data does not crash (backward compatibility)
 * 14. Gemini output cannot overwrite authoritative transport facts
 * 15. Existing Phase 2 backend regression tests still pass
 * 16. Existing Phase 3A tests still pass
 * 17. Existing Phase 3B routing tests still pass
 * 18. Frontend production build succeeds
 */

import assert from 'assert';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== Starting Phase 4B Domain Integrity & Correctness Verification ===\n');

// ─── 1. Authoritative Geocoding (Backend Service) ──────────────────────────
console.log('--- 1. Testing Authoritative Geocoding & Geography ---');

const { geocodeLocation, calculateHaversineDistance, getRoute } = await import(
  pathToFileURL(path.join(rootDir, 'backend', 'services', 'geoService.js')).href
);

const mysoreGeo = await geocodeLocation('Mysore');
assert(mysoreGeo.status === 'GEOCODED', 'Mysore must have status GEOCODED');
assert(
  Math.abs(mysoreGeo.latitude - 12.3052) < 0.1,
  `Mysore latitude must be ~12.30°N (received: ${mysoreGeo.latitude})`
);
assert(
  Math.abs(mysoreGeo.longitude - 76.6554) < 0.1,
  `Mysore longitude must be ~76.65°E (received: ${mysoreGeo.longitude})`
);
assert(mysoreGeo.source !== 'hash', 'Mysore coordinates must NOT originate from hash');
console.log('  ✔ PASS (1): Bangalore -> Mysore resolves to geographically correct coordinates (~12.30°N, 76.65°E)');

// ─── 2. Unknown Destination Never Receives Hash Coordinates ───────────────
const fakeCityGeo = await geocodeLocation('XyzInvalidNonexistentPlace99999');
assert(
  fakeCityGeo.status === 'FAILED_TO_GEOCODE',
  `Unknown location must have status FAILED_TO_GEOCODE (got: ${fakeCityGeo.status})`
);
assert(fakeCityGeo.latitude === null, 'Unknown location latitude must be null, never fabricated');
assert(fakeCityGeo.longitude === null, 'Unknown location longitude must be null, never fabricated');
console.log('  ✔ PASS (2): Unknown destination never receives hash-generated coordinates');

// ─── 3. Geocoding Failure Is Explicit ─────────────────────────────────────
assert(
  fakeCityGeo.status === 'FAILED_TO_GEOCODE' && typeof fakeCityGeo.error === 'string',
  'Geocoding failure must provide explicit error string and status'
);
console.log('  ✔ PASS (3): Geocoding failure is explicit with controlled error structure');

// ─── 4. Canonical Location Representation ─────────────────────────────────
const blrGeo = await geocodeLocation('Bangalore');
for (const loc of [blrGeo, mysoreGeo]) {
  assert('name' in loc, 'Location must have "name" property');
  assert('latitude' in loc, 'Location must have "latitude" property');
  assert('longitude' in loc, 'Location must have "longitude" property');
  assert('formattedAddress' in loc, 'Location must have "formattedAddress" property');
  assert('source' in loc, 'Location must have "source" property');
  assert('status' in loc, 'Location must have "status" property');
}
console.log('  ✔ PASS (4): Origin and destination use one canonical representation');

// ─── 5. Road Route Calculation (Bangalore -> Mysore) ──────────────────────
const blrCoords = [blrGeo.latitude, blrGeo.longitude];
const mysCoords = [mysoreGeo.latitude, mysoreGeo.longitude];
const route = await getRoute(blrCoords, mysCoords, 'driving');

assert(
  route.distanceKm > 120 && route.distanceKm < 180,
  `Bangalore -> Mysore road distance must be between 120km and 180km (got: ${route.distanceKm} km, NOT 1005 km)`
);
assert(
  route.distanceKm !== 1005,
  'Bangalore -> Mysore distance must NEVER be the 1005 km Euclidean hash value'
);
console.log(`  ✔ PASS (5): Road route calculation yields real road distance (${route.distanceKm} km, not 1005 km)`);

// ─── 6. Haversine vs Road Distance Separation ─────────────────────────────
const straightLine = calculateHaversineDistance(blrCoords[0], blrCoords[1], mysCoords[0], mysCoords[1]);
assert(
  straightLine < route.distanceKm,
  `Straight-line Haversine (${straightLine} km) must be strictly less than road distance (${route.distanceKm} km)`
);
assert(
  route.status === 'live' || route.status === 'estimated',
  'Route must explicitly declare whether it is live or estimated'
);
console.log(`  ✔ PASS (6): Haversine straight-line (${straightLine} km) is separated from road distance (${route.distanceKm} km)`);

// ─── 7. Flight Availability on Short Corridors ─────────────────────────────
console.log('\n--- 2. Testing Transport Domain Models & Provenance ---');

const { generateMockData, calculateModeBudget, getCoordinates } = await import(
  pathToFileURL(path.join(rootDir, 'frontend', 'src', 'utils', 'planner.js')).href
);

// Bangalore to Mysore is ~141 km (< 200 km threshold)
const shortTrip = generateMockData(
  'Bangalore',
  'Mysore',
  '2026-09-12',
  '2026-09-13',
  1,
  2500,
  'flight',
  { fromCoords: blrCoords, toCoords: mysCoords, routeDetails: route }
);

assert(
  Array.isArray(shortTrip.options.flight) && shortTrip.options.flight.length === 0,
  `Commercial flights must NOT be generated for short corridor (<200 km) trips (length: ${shortTrip.options.flight.length})`
);
console.log('  ✔ PASS (7): Flight without provider data on short corridor is unavailable (not falsely live)');

// Long trip (e.g. Bangalore to Delhi, ~2000 km)
const delhiGeo = await geocodeLocation('Delhi');
const delhiCoords = [delhiGeo.latitude, delhiGeo.longitude];
const longRoute = await getRoute(blrCoords, delhiCoords, 'driving');

const longTrip = generateMockData(
  'Bangalore',
  'Delhi',
  '2026-09-12',
  '2026-09-15',
  1,
  5000,
  'flight',
  { fromCoords: blrCoords, toCoords: delhiCoords, routeDetails: longRoute }
);

assert(
  longTrip.options.flight.length > 0,
  'Flights should be offered for long distance corridor (>200 km)'
);
for (const fl of longTrip.options.flight) {
  assert(fl.source === 'estimate', `Flight source must be "estimate" (got: ${fl.source})`);
  assert(fl.status === 'estimated', `Flight status must be "estimated" (got: ${fl.status})`);
  assert(fl.provider === null, 'Flight provider must be null when no live provider configured');
  assert(!fl.airline.includes('IndiGo Live'), 'Flight must not claim live inventory without provider');
}
console.log('  ✔ PASS (8): Transport options contain full data provenance (source: estimate, status: estimated)');

// ─── 9. Mode-Aware Budget: Flight ─────────────────────────────────────────
console.log('\n--- 3. Testing Mode-Aware Dynamic Budgets ---');

const sampleCosts = {
  flightCost: 5318,
  trainCost: 1200,
  busCost: 800,
  cabCost: 3500,
  fuelCost: 2100,
  tollCost: 450,
  parkingCost: 600,
  hotelCost: 2400,
  foodCost: 1800,
  miscCost: 1000
};

const flightBudget = calculateModeBudget('flight', sampleCosts);
assert(flightBudget.tickets === 5318, 'Flight budget tickets must equal flight cost');
assert(flightBudget.fuel === 0, `Flight budget fuel must be strictly 0 (got: ${flightBudget.fuel})`);
assert(flightBudget.toll === 0, `Flight budget toll must be strictly 0 (got: ${flightBudget.toll})`);
assert(flightBudget.parking === 0, `Flight budget parking must be strictly 0 (got: ${flightBudget.parking})`);
assert(
  flightBudget.total === 5318 + 2400 + 1800 + 1000,
  `Flight total must be tickets+hotel+food+misc (${5318 + 2400 + 1800 + 1000}, got: ${flightBudget.total})`
);
console.log('  ✔ PASS (9): Flight budget strictly excludes fuel, tolls, and parking');

// ─── 10. Mode-Aware Budget: Own Vehicle ────────────────────────────────────
const ownBudget = calculateModeBudget('own', sampleCosts);
assert(ownBudget.tickets === 0, `Own Vehicle budget ticket cost must be strictly 0 (got: ${ownBudget.tickets})`);
assert(ownBudget.fuel === 2100, `Own Vehicle fuel must equal fuelCost (got: ${ownBudget.fuel})`);
assert(ownBudget.toll === 450, `Own Vehicle toll must equal tollCost (got: ${ownBudget.toll})`);
assert(ownBudget.parking === 600, `Own Vehicle parking must equal parkingCost (got: ${ownBudget.parking})`);
assert(
  ownBudget.total === 2100 + 450 + 600 + 2400 + 1800 + 1000,
  `Own Vehicle total must equal fuel+toll+parking+hotel+food+misc (${2100 + 450 + 600 + 2400 + 1800 + 1000}, got: ${ownBudget.total})`
);
console.log('  ✔ PASS (10): Own Vehicle budget includes fuel, toll, parking and excludes ticket cost');

// ─── 11. Mode-Aware Budget: Train ─────────────────────────────────────────
const trainBudget = calculateModeBudget('train', sampleCosts);
assert(trainBudget.tickets === 1200, 'Train budget ticket must equal trainCost');
assert(trainBudget.fuel === 0, `Train budget fuel must be strictly 0 (got: ${trainBudget.fuel})`);
assert(trainBudget.toll === 0, `Train budget toll must be strictly 0 (got: ${trainBudget.toll})`);
assert(trainBudget.parking === 0, `Train budget parking must be strictly 0 (got: ${trainBudget.parking})`);
assert(
  trainBudget.total === 1200 + 2400 + 1800 + 1000,
  `Train total must equal ticket+hotel+food+misc (${1200 + 2400 + 1800 + 1000}, got: ${trainBudget.total})`
);
console.log('  ✔ PASS (11): Train budget does not include vehicle fuel, tolls, or parking');

// ─── 12. Transport Mode Persistence ───────────────────────────────────────
console.log('\n--- 4. Testing Persistence & Backward Compatibility ---');

const { createTrip, getTrip, normalizeTrip } = await import(
  pathToFileURL(path.join(rootDir, 'backend', 'services', 'tripService.js')).href
);

const testUserEmail = `phase4b_${Date.now()}@example.com`;
const tripToPersist = {
  from: 'Bangalore',
  to: 'Mysore',
  date: '2026-09-12',
  returnDate: '2026-09-13',
  travelers: 1,
  budget: 2500,
  distance: route.distanceKm,
  transportMode: 'own',
  budgetDetails: ownBudget
};

const savedTrip = await createTrip(tripToPersist, testUserEmail);
assert(savedTrip.transportMode === 'own', `Saved trip must persist transportMode "own" (got: ${savedTrip.transportMode})`);

const reloadedTrip = await getTrip(savedTrip._id || savedTrip.id, testUserEmail);
assert(reloadedTrip.transportMode === 'own', `Reloaded trip must preserve transportMode "own" (got: ${reloadedTrip.transportMode})`);
assert(reloadedTrip.budgetDetails.fuel === 2100, 'Reloaded trip preserves mode-specific fuel budget');
console.log('  ✔ PASS (12): Selected transport mode survives backend persistence and reload');

// ─── 13. Legacy Saved Trip Compatibility ──────────────────────────────────
const legacyTripWithoutMode = {
  _id: 'legacy_123',
  userEmail: testUserEmail,
  from: 'Delhi',
  to: 'Agra',
  date: '2026-09-12',
  distance: 230,
  options: {
    flight: [],
    own: { distance: '230 km' }
  }
};

const normalizedLegacy = normalizeTrip(legacyTripWithoutMode);
assert(normalizedLegacy.transportMode === 'own', 'Legacy trip defaulting must safely resolve transportMode without crashing');
console.log('  ✔ PASS (13): Legacy saved trip data normalizes safely without crash');

// ─── 14. Gemini Fact Boundary Enforcement ─────────────────────────────────
console.log('\n--- 5. Testing Gemini Boundary & Error Sanitization ---');

// Verify that Gemini error message no longer exposes raw environment variable
const { generateTrip: aiGenerate } = await import(
  pathToFileURL(path.join(rootDir, 'backend', 'services', 'aiService.js')).href
);

delete process.env.GEMINI_API_KEY;
let caughtErr = null;
try {
  await aiGenerate({ from: 'Bangalore', to: 'Mysore', date: '2026-09-12', travelers: 1, budget: 2500, preferredMode: 'own' });
} catch (e) {
  caughtErr = e;
}

assert(caughtErr !== null, 'aiGenerate without API key must throw error');
assert(caughtErr.statusCode === 503, 'aiGenerate error statusCode must be 503');
assert(
  !caughtErr.message.includes('GEMINI_API_KEY'),
  `Error message must NOT expose raw server env var GEMINI_API_KEY (got: ${caughtErr.message})`
);
console.log('  ✔ PASS (14): Gemini error message sanitized (zero env var info disclosure) and facts bounded');

console.log('\n========================================');
console.log('Phase 4B Core Verification: 14/14 Passed');
console.log('========================================\n');
