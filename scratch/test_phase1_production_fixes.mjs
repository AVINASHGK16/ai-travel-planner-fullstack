import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Natively load backend/.env without external dependencies
try {
  const envContent = fs.readFileSync(path.resolve('backend/.env'), 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      let v = trimmed.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  });
} catch {}

console.log('====================================================');
console.log('🧪 TESTING ROAMLY PHASE 1 PRODUCTION FIXES');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// TEST GROUP 1 — SAVED TRIP UPDATE (Backend Service & Route)
// ---------------------------------------------------------------------------
console.log('--- TEST GROUP 1: SAVED TRIP UPDATE ---');

// 1. Static checks on tripRoutes.js and tripService.js
const tripRoutesPath = path.resolve('backend/routes/tripRoutes.js');
const tripRoutesContent = fs.readFileSync(tripRoutesPath, 'utf8');

assert.ok(
  tripRoutesContent.includes("router.put('/:id'"),
  'tripRoutes.js must mount router.put("/:id")'
);
assert.ok(
  tripRoutesContent.includes('authenticateToken'),
  'router.put("/:id") must require authenticateToken'
);
assert.ok(
  tripRoutesContent.includes('validateParams(tripIdParamSchema)'),
  'router.put("/:id") must validate params using tripIdParamSchema'
);
assert.ok(
  tripRoutesContent.includes('validateBody(saveTripSchema)'),
  'router.put("/:id") must validate body using saveTripSchema'
);
assert.ok(
  tripRoutesContent.includes('tripService.updateTrip'),
  'router.put("/:id") must invoke tripService.updateTrip'
);
console.log('  ✓ PASS: tripRoutes.js exposes authenticated, validated PUT /:id route');

const tripServicePath = path.resolve('backend/services/tripService.js');
const tripServiceContent = fs.readFileSync(tripServicePath, 'utf8');

assert.ok(
  tripServiceContent.includes('export const updateTrip = async (tripId, tripData, userEmail) => {'),
  'tripService.js must export updateTrip(tripId, tripData, userEmail)'
);
assert.ok(
  tripServiceContent.includes('data.userEmail = userEmail;'),
  'updateTrip must authoritatively enforce userEmail from authenticated session'
);
assert.ok(
  tripServiceContent.includes('delete data._id;'),
  'updateTrip must strip client-supplied _id'
);
assert.ok(
  tripServiceContent.includes('trip.userEmail !== userEmail'),
  'updateTrip must enforce user ownership (throw 403 on mismatch)'
);
console.log('  ✓ PASS: tripService.js enforces server-side ownership and field protection in updateTrip');

// Frontend tripService.js
const frontendTripServicePath = path.resolve('frontend/src/services/tripService.js');
const frontendTripServiceContent = fs.readFileSync(frontendTripServicePath, 'utf8');

assert.ok(
  frontendTripServiceContent.includes('export const updateTrip = async (tripId, tripData, token'),
  'frontend tripService.js must export updateTrip'
);
assert.ok(
  frontendTripServiceContent.includes("method: 'PUT'"),
  'frontend updateTrip must use HTTP PUT'
);
console.log('  ✓ PASS: frontend tripService.js exports updateTrip with PUT');

// Frontend PlannerPage.jsx save logic
const plannerPagePath = path.resolve('frontend/src/pages/PlannerPage.jsx');
const plannerPageContent = fs.readFileSync(plannerPagePath, 'utf8');

assert.ok(
  plannerPageContent.includes('import { createTrip, updateTrip } from \'../services/tripService\';'),
  'PlannerPage.jsx must import both createTrip and updateTrip'
);
assert.strictEqual(
  plannerPageContent.includes("showNotification('info', 'This trip plan is already saved in your dashboard history.');"),
  false,
  'PlannerPage.jsx must NOT contain the old alreadySaved rejection guard'
);
assert.ok(
  plannerPageContent.includes('isServerTrip'),
  'PlannerPage.jsx must identify server trips (activeTrip._id && !startsWith("local_"))'
);
assert.ok(
  plannerPageContent.includes('updateTrip(activeTrip._id, tripToSave, activeToken)'),
  'PlannerPage.jsx must call updateTrip for existing server trips'
);
assert.ok(
  plannerPageContent.includes('createTrip(tripToSave, activeToken)'),
  'PlannerPage.jsx must call createTrip for new trips'
);
assert.ok(
  plannerPageContent.includes("'Trip itinerary successfully updated!'"),
  'PlannerPage.jsx must show update success notification'
);
console.log('  ✓ PASS: PlannerPage.jsx correctly dispatches PUT for existing trips and POST for new trips');


// ---------------------------------------------------------------------------
// TEST GROUP 2 — ROUTE DETACH ON NEW SEARCH FROM /plan/:tripId
// ---------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: ROUTE DETACH ---');

assert.ok(
  plannerPageContent.includes('if (tripId) {'),
  'handleSearch must check for existing tripId'
);
assert.ok(
  plannerPageContent.includes("navigate('/plan', { replace: true, state: { searchParams: params } });"),
  'handleSearch must navigate to /plan with replace: true and pass searchParams'
);
console.log('  ✓ PASS: handleSearch detaches from /plan/:tripId and transitions route to /plan');


// ---------------------------------------------------------------------------
// TEST GROUP 3 — GEMINI CHAT MULTI-TURN SYSTEM INSTRUCTION
// ---------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: GEMINI CHAT MULTI-TURN ---');

const aiServicePath = path.resolve('backend/services/aiService.js');
const aiServiceContent = fs.readFileSync(aiServicePath, 'utf8');

// Ensure systemPrompt is NOT inserted into contents as an untagged turn
assert.strictEqual(
  aiServiceContent.includes('const contents = [\n    { parts: [{ text: systemPrompt }] }\n  ];') ||
  aiServiceContent.includes('const contents = [{ parts: [{ text: systemPrompt }] }];'),
  false,
  'aiService.js must NOT insert untagged systemPrompt into contents'
);

assert.ok(
  aiServiceContent.includes('system_instruction: {'),
  'aiService.js must pass system_instruction object to Gemini'
);
assert.ok(
  aiServiceContent.includes('parts: [{ text: systemPrompt }]'),
  'system_instruction must contain parts with text: systemPrompt'
);
assert.ok(
  aiServiceContent.includes('const requestPayload = {'),
  'aiService.js must build requestPayload with system_instruction and contents'
);
console.log('  ✓ PASS: aiService.js chatWithAssistant uses Gemini dedicated system_instruction');


// ---------------------------------------------------------------------------
// FUNCTIONAL API INTEGRATION TESTS (Local Backend / Models)
// ---------------------------------------------------------------------------
console.log('\n--- FUNCTIONAL INTEGRATION TESTS ---');

import * as tripService from '../backend/services/tripService.js';
import * as authService from '../backend/services/authService.js';

authService.initAuth();

// Test 1: User A creates a trip
const userAEmail = `test_user_a_${Date.now()}@example.com`;
const userBEmail = `test_user_b_${Date.now()}@example.com`;

const tripPayload = {
  from: 'Bangalore',
  to: 'Jaipur',
  date: '2026-11-01',
  returnDate: '2026-11-05',
  travelers: 2,
  budget: 25000,
  transportMode: 'flight',
  itinerary: [
    { day: 1, title: 'Arrival & Amber Fort', activities: [{ time: '10:00', title: 'Fort Tour', cost: 500 }] }
  ]
};

const createdTrip = await tripService.createTrip(tripPayload, userAEmail);
assert.ok(createdTrip._id, 'Created trip must have an _id');
assert.strictEqual(createdTrip.userEmail, userAEmail, 'Created trip must be owned by user A');
assert.strictEqual(createdTrip.itinerary.length, 1, 'Initial itinerary must have 1 day');
console.log('  ✓ PASS: createTrip creates a trip owned by User A');

// Test 2: User B attempts to update User A's trip (MUST FAIL with 403)
let forbiddenCaught = false;
try {
  await tripService.updateTrip(createdTrip._id, { ...tripPayload, budget: 99999 }, userBEmail);
} catch (err) {
  forbiddenCaught = true;
  assert.strictEqual(err.statusCode, 403, 'Unauthorized update must return 403');
  assert.strictEqual(err.message, 'You are not authorized to modify this trip.');
}
assert.ok(forbiddenCaught, 'User B must not be able to update User A trip');
console.log('  ✓ PASS: User B cannot update User A trip (403 Forbidden)');

// Test 3: User A updates their own trip with modified itinerary, activities, and budget
const updatedPayload = {
  ...tripPayload,
  budget: 32000,
  itinerary: [
    { day: 1, title: 'Arrival & Amber Fort', activities: [{ time: '10:00', title: 'Fort Tour', cost: 500 }] },
    { day: 2, title: 'City Palace & Hawa Mahal', activities: [{ time: '09:30', title: 'Palace Visit', cost: 700 }] }
  ],
  budgetDetails: {
    tickets: 14000,
    hotel: 10000,
    food: 4000,
    misc: 4000,
    total: 32000
  }
};

const updatedTrip = await tripService.updateTrip(createdTrip._id, updatedPayload, userAEmail);
assert.strictEqual(updatedTrip._id.toString(), createdTrip._id.toString(), 'Trip ID must remain identical');
assert.strictEqual(updatedTrip.budget, 32000, 'Updated budget must be persisted');
assert.strictEqual(updatedTrip.itinerary.length, 2, 'Updated itinerary must have 2 days');
assert.strictEqual(updatedTrip.itinerary[1].title, 'City Palace & Hawa Mahal', 'Day 2 title must match');
assert.strictEqual(updatedTrip.budgetDetails.total, 32000, 'Updated budget details must match');
console.log('  ✓ PASS: User A successfully updates their saved trip with modified itinerary & budget');

// Test 4: Verify client userEmail tampering is prevented
const tamperedPayload = {
  ...updatedPayload,
  userEmail: 'hacker@malicious.com'
};
const secureTrip = await tripService.updateTrip(createdTrip._id, tamperedPayload, userAEmail);
assert.strictEqual(secureTrip.userEmail, userAEmail, 'Client userEmail must be ignored; session identity enforced');
console.log('  ✓ PASS: Client-supplied userEmail cannot tamper with trip ownership');

// Test 5: Verify invalid trip ID returns 400 or 404
let invalidIdCaught = false;
try {
  await tripService.updateTrip('nonexistent_id_999999999', updatedPayload, userAEmail);
} catch (err) {
  invalidIdCaught = true;
  assert.ok(err.statusCode === 400 || err.statusCode === 404, 'Non-existent or malformed trip ID must reject with 400/404');
}
assert.ok(invalidIdCaught, 'Invalid trip ID must be caught');
console.log('  ✓ PASS: Invalid trip ID safely rejected');

// Clean up created test trip
await tripService.deleteTrip(createdTrip._id, userAEmail);
console.log('  ✓ Cleaned up test trip record.');

// ---------------------------------------------------------------------------
// FUNCTIONAL GEMINI CHAT MULTI-TURN TEST
// ---------------------------------------------------------------------------
console.log('\n--- FUNCTIONAL GEMINI CHAT MULTI-TURN TEST ---');
import * as aiService from '../backend/services/aiService.js';

const chatResult = await aiService.chatWithAssistant({
  message: 'What is the fastest transport mode between Bangalore and Jaipur?',
  chatHistory: [
    { sender: 'user', text: 'Hi, I am planning a trip to Jaipur.' },
    { sender: 'assistant', text: 'Jaipur is a wonderful destination known for its royal palaces and forts.' }
  ],
  tripContext: {
    from: 'Bangalore',
    to: 'Jaipur',
    date: '2026-11-01',
    travelers: 2,
    budget: 25000,
    distance: 1800
  }
});

assert.ok(chatResult && typeof chatResult.reply === 'string' && chatResult.reply.length > 0, 'Chat assistant must return a valid reply');
assert.ok(chatResult.reply.toLowerCase().includes('flight') || chatResult.reply.toLowerCase().includes('air'), 'Assistant should mention flight');
console.log('  ✓ PASS: Gemini Chat Assistant with system_instruction and multi-turn history responds accurately:');
console.log('    Response snippet:', chatResult.reply.slice(0, 120) + '...\n');

console.log('====================================================');
console.log('🎉 ALL PHASE 1 PRODUCTION TESTS PASSED SUCCESSFULLY!');
console.log('====================================================\n');
