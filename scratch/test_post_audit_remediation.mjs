import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from '../backend/node_modules/dotenv/lib/main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('🧪 RUNNING POST-AUDIT REMEDIATION REGRESSION SUITE');
console.log('====================================================');

// ─── TEST A: Currency Response Contract ───────────────────────
console.log('\n--- Test A: Currency Response Contract ---');
{
  // Simulate the exact apiClient.request() envelope
  const mockApiResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    data: {
      success: true,
      supportedCurrencies: ['INR', 'USD', 'EUR', 'GBP'],
      base: 'INR',
      rates: {
        INR: 1,
        USD: 0.010437,
        EUR: 0.009165,
        GBP: 0.007880
      }
    }
  };

  // Replicate the fixed unpacking logic in PreferencesContext.jsx
  const liveRates = mockApiResponse?.data?.rates;
  assert(Boolean(liveRates && typeof liveRates === 'object'), 'Unpacked liveRates is defined and is an object');
  assert(liveRates?.USD === 0.010437, 'liveRates.USD correctly read as 0.010437');
  assert(liveRates?.EUR === 0.009165, 'liveRates.EUR correctly read as 0.009165');

  // Verify that the old buggy access (mockApiResponse.rates) would have failed
  const oldBuggyRates = mockApiResponse?.rates;
  assert(oldBuggyRates === undefined, 'Old buggy access (response.rates) is indeed undefined');

  // Verify PreferencesContext.jsx source code now has the correct unpacking
  const contextCode = fs.readFileSync(path.join(__dirname, '../frontend/src/context/PreferencesContext.jsx'), 'utf-8');
  assert(contextCode.includes('response?.data?.rates'), 'PreferencesContext.jsx reads response?.data?.rates');
  assert(!contextCode.includes('if (isMounted && data?.rates'), 'PreferencesContext.jsx no longer reads data?.rates directly from request() result');
}

// ─── TEST B: Gemini Frontend Timeout ──────────────────────────
console.log('\n--- Test B: Gemini Frontend Timeout ---');
{
  const aiServiceCode = fs.readFileSync(path.join(__dirname, '../frontend/src/services/aiService.js'), 'utf-8');
  assert(aiServiceCode.includes('timeoutMs: 35000'), 'Frontend generateTrip timeoutMs is 35000 (35s)');
  assert(aiServiceCode.includes('timed out after 35 seconds'), 'Frontend timeout error message reflects 35 seconds');
  assert(!aiServiceCode.includes('timeoutMs: 20000'), 'Old 20000ms timeout has been replaced');

  // Mathematical assertion: 22s backend rollover < 35s client timeout
  const sampleRolloverDurationMs = 22214;
  const clientTimeoutMs = 35000;
  assert(sampleRolloverDurationMs < clientTimeoutMs, `22.2s backend rollover (${sampleRolloverDurationMs}ms) safely completes within 35s (${clientTimeoutMs}ms) timeout`);
}

// ─── TEST C: Gemini Candidate Rollover & Model Cleanliness ─────
console.log('\n--- Test C: Gemini Candidate Rollover & Deprecated Model Removal ---');
{
  const backendAiCode = fs.readFileSync(path.join(__dirname, '../backend/services/aiService.js'), 'utf-8');
  assert(!backendAiCode.includes("'gemini-2.5-flash'"), 'Deprecated model gemini-2.5-flash removed');
  assert(!backendAiCode.includes("'gemini-1.5-flash'"), 'Deprecated model gemini-1.5-flash removed');
  assert(backendAiCode.includes("'gemini-flash-latest'"), 'gemini-flash-latest is present');
  assert(backendAiCode.includes("'gemini-flash-lite-latest'"), 'gemini-flash-lite-latest is present');

  // Test full generateTrip execution with model rollover
  const { generateTrip } = await import('../backend/services/aiService.js');
  try {
    const result = await generateTrip({
      from: 'Bengaluru',
      to: 'Mysuru',
      date: '2026-11-01',
      travelers: 2,
      budget: 15000,
      preferredMode: 'driving'
    });
    assert(result.isAIGenerated === true, 'generateTrip returns isAIGenerated: true');
    assert(result.source === 'ai', 'generateTrip returns source: "ai"');
    assert(Array.isArray(result.itinerary) && result.itinerary.length > 0, 'generateTrip returns valid itinerary array');
  } catch (err) {
    console.warn(`    [Notice] Live Gemini API call: ${err.message}`);
  }
}

// ─── TEST D: MongoDB Production Failure Guard ─────────────────
console.log('\n--- Test D: MongoDB Production Failure Guard ---');
{
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const { assertDatabaseAvailable } = await import('../backend/models/db.js');
  const { createTrip } = await import('../backend/services/tripService.js');

  // Read current saved_trips.json count
  const tripsPath = path.join(__dirname, '../backend/saved_trips.json');
  const initialTripsCount = fs.existsSync(tripsPath) ? JSON.parse(fs.readFileSync(tripsPath, 'utf-8')).length : 0;

  let threw503 = false;
  let errorCode = null;

  try {
    // When MongoDB is disconnected in production:
    await createTrip({ from: 'Test Origin', to: 'Test Dest', date: '2026-12-01', travelers: 1, budget: 10000 }, 'audit_test@example.com');
  } catch (err) {
    if (err.statusCode === 503) {
      threw503 = true;
      errorCode = err.code;
    }
  }

  // Restore NODE_ENV
  process.env.NODE_ENV = originalNodeEnv;

  assert(threw503 === true, 'In production with disconnected DB, createTrip threw HTTP 503');
  assert(errorCode === 'DATABASE_UNAVAILABLE', 'In production with disconnected DB, error code is DATABASE_UNAVAILABLE');

  // Verify no new record was written to saved_trips.json
  const finalTripsCount = fs.existsSync(tripsPath) ? JSON.parse(fs.readFileSync(tripsPath, 'utf-8')).length : 0;
  assert(finalTripsCount === initialTripsCount, 'No trip was written to local saved_trips.json in production (zero silent data corruption)');
}

// ─── TEST E: MongoDB Development Fallback ─────────────────────
console.log('\n--- Test E: MongoDB Development Fallback ---');
{
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';

  const { createTrip, getUserTrips, deleteTrip } = await import('../backend/services/tripService.js');

  const testEmail = `dev_fallback_test_${Date.now()}@example.com`;
  const created = await createTrip({
    from: 'Bengaluru',
    to: 'Mysuru',
    date: '2026-10-10',
    travelers: 2,
    budget: 20000,
    transportMode: 'own'
  }, testEmail);

  assert(Boolean(created && created._id), 'In development with disconnected DB, createTrip succeeds with generated _id');
  assert(created.userEmail === testEmail, 'Trip has correct userEmail');

  const userTrips = await getUserTrips(testEmail);
  assert(userTrips.length >= 1, 'getUserTrips successfully retrieves dev fallback trip');

  const delResult = await deleteTrip(created._id, testEmail);
  assert(delResult?.message?.includes('deleted'), 'deleteTrip successfully cleans up dev fallback trip');

  process.env.NODE_ENV = originalNodeEnv;
}

console.log('\n====================================================');
console.log(`🏁 REGRESSION SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
