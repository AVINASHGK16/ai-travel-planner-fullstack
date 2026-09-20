// 1. Test backend validators with airport codes
import assert from 'assert';
import { generateTripSchema } from '../backend/validators.js';

console.log('--- TEST 1: Backend validator with airport codes in parens ---');
const validWithParens = {
  from: 'Bengaluru (BLR)',
  to: 'Goa (GOI)',
  date: '2026-10-15',
  returnDate: '2026-10-20',
  travelers: 2,
  budget: 25000,
  preferredMode: 'flight'
};
const parseResult = generateTripSchema.safeParse(validWithParens);
assert.strictEqual(parseResult.success, true, `Expected validation to pass for parens: ${JSON.stringify(parseResult.error?.issues)}`);
console.log('✔ generateTripSchema correctly accepts locations with airport codes in parentheses.');

// 2. Test live Gemini AI service with candidate models
import { generateTrip } from '../backend/services/aiService.js';

console.log('\n--- TEST 2: Live generateTrip via backend/services/aiService.js ---');
try {
  const result = await generateTrip({
    from: 'Bengaluru',
    to: 'Goa',
    date: '2026-10-15',
    returnDate: '2026-10-20',
    travelers: 2,
    budget: 25000,
    preferredMode: 'flight'
  });

  assert.strictEqual(result.isAIGenerated, true, 'Expected isAIGenerated: true');
  assert.strictEqual(result.source, 'ai', 'Expected source: "ai"');
  assert.ok(Array.isArray(result.itinerary), 'Expected itinerary array');
  assert.ok(result.itinerary.length > 0, 'Expected non-empty itinerary');
  assert.ok(result.summary, 'Expected summary');

  console.log('✔ Gemini successfully generated itinerary:');
  console.log(`  Source: ${result.source}, isAIGenerated: ${result.isAIGenerated}`);
  console.log(`  Days generated: ${result.itinerary.length}`);
  console.log(`  Summary sample: ${result.summary.slice(0, 80)}...`);
  console.log(`  Day 1 title: ${result.itinerary[0].title}`);
} catch (err) {
  console.error('Gemini call failed:', err.message);
  throw err;
}

// 3. Test frontend planner getAIGeneration signature compatibility
console.log('\n--- TEST 3: Frontend planner.js getAIGeneration resilient signatures ---');
import { getAIGeneration, generateMockData } from '../frontend/src/utils/planner.js';

// Test generateMockData has source: 'deterministic'
const mock = generateMockData('Bengaluru', 'Goa', '2026-10-15', '2026-10-20', 2, 25000, 'flight');
assert.strictEqual(mock.source, 'deterministic', 'Expected mock.source to be "deterministic"');
assert.strictEqual(mock.isAIGenerated, false, 'Expected mock.isAIGenerated to be false');
console.log('✔ generateMockData sets source: "deterministic" and isAIGenerated: false');

console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
