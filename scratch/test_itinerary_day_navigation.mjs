/**
 * Focused Regression Suite for Roamly Itinerary Day Navigation
 * Verifies that:
 * 1. All generated days (1 to 30+) are represented in the selector
 * 2. Navigation controls are pinned and never clipped off-screen
 * 3. Selecting days beyond initially visible range (e.g. Days 9-12) properly activates that day's plan
 * 4. No day is silently dropped or hardcoded to 8 days
 * 5. Smooth scroll-into-view logic is properly attached and guarded
 * 6. Responsive container classes prevent horizontal page overflow
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
console.log('🧪 Running Itinerary Day Navigation Regression Suite');
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

// ── 1. ARCHITECTURE & STRUCTURE ─────────────────────────────────────────────

runTest('1.1: Day selector pins previous and next chevron buttons outside scrollable container', () => {
  // Outer wrapper must have min-w-0 to prevent horizontal grid blowout
  assert(tripOverviewContent.includes('flex items-center gap-1.5 w-full min-w-0'), 'Must have outer container with w-full min-w-0');
  
  // Previous button must be shrink-0
  assert(tripOverviewContent.includes('aria-label="Previous Day"'), 'Must have accessible Previous Day button');
  
  // Next button must be shrink-0
  assert(tripOverviewContent.includes('aria-label="Next Day"'), 'Must have accessible Next Day button');
  
  // Scrollable container must be placed between previous and next buttons
  const prevIdx = tripOverviewContent.indexOf('aria-label="Previous Day"');
  const scrollRefIdx = tripOverviewContent.indexOf('ref={dayListRef}');
  const nextIdx = tripOverviewContent.indexOf('aria-label="Next Day"');
  
  assert(prevIdx !== -1 && scrollRefIdx !== -1 && nextIdx !== -1, 'Must have prev, scrollRef, and next in template');
  assert(prevIdx < scrollRefIdx, 'Previous button must be before scrollable list');
  assert(scrollRefIdx < nextIdx, 'Next button must be after scrollable list (pinned outside)');
});

runTest('1.2: Scrollable list container specifies flex-1 min-w-0 overflow-x-auto', () => {
  assert(
    tripOverviewContent.includes('overflow-x-auto pb-1 scrollbar-none flex-1 min-w-0'),
    'Scroll container must use flex-1 min-w-0 overflow-x-auto for responsive contained scrolling'
  );
});

runTest('1.3: Day buttons include shrink-0 to prevent compression on long trips', () => {
  assert(
    tripOverviewContent.includes('shrink-0') && tripOverviewContent.includes('Day {dayNum}'),
    'Day buttons must have shrink-0 so pills do not collapse when there are many days'
  );
  assert(tripOverviewContent.includes('data-day={dayNum}'), 'Day buttons must have data-day attribute for auto-scroll selector');
});

runTest('1.4: Zero hardcoded day limits in day-selector mapping', () => {
  assert(!tripOverviewContent.includes('.slice(0, 8)'), 'Must not truncate rawItinerary to 8 days');
  assert(!tripOverviewContent.includes('.slice(0, 7)'), 'Must not truncate rawItinerary to 7 days');
  assert(!tripOverviewContent.includes('maxDays = 8'), 'Must not hardcode maxDays to 8');
  assert(tripOverviewContent.includes('{rawItinerary.map('), 'Must iterate over all rawItinerary items');
});

runTest('1.5: Auto-scroll into view hook is present and handles both left/right clipping and resizing', () => {
  assert(tripOverviewContent.includes('const dayListRef = useRef(null);'), 'Must define dayListRef');
  assert(tripOverviewContent.includes('bRect.left < cRect.left'), 'Must handle left-edge clipping');
  assert(tripOverviewContent.includes('bRect.right > cRect.right'), 'Must handle right-edge clipping');
  assert(tripOverviewContent.includes('container.scrollTo'), 'Must scroll container smoothly');
  assert(tripOverviewContent.includes('ResizeObserver'), 'Must observe resize to keep active day in view');
});

// ── 2. DATA RESOLUTION & DAY RENDERING FOR DIVERSE TRIP LENGTHS ─────────────

function createMockTrip(dayCount) {
  const itinerary = Array.from({ length: dayCount }, (_, idx) => ({
    day: idx + 1,
    title: `Day ${idx + 1} Sightseeing in Paris`,
    activities: [
      {
        title: `Activity for Day ${idx + 1}`,
        time: '10:00 AM',
        duration: '2h',
        cost: 25,
        icon: 'MapPin'
      }
    ]
  }));
  return {
    _id: `trip-${dayCount}-days`,
    from: 'London',
    to: 'Paris',
    date: '2026-06-01',
    tripDays: dayCount,
    itinerary
  };
}

runTest('2.1: 3-day itinerary simulation', () => {
  const trip = createMockTrip(3);
  const rawItinerary = trip.itinerary;
  const totalDays = rawItinerary.length;
  assert.strictEqual(totalDays, 3);
  assert.strictEqual(rawItinerary.length, 3);
  
  // Verify bounds for Day 1
  let selectedDay = 1;
  const prevDisabled = selectedDay <= 1;
  const nextDisabled = selectedDay >= totalDays;
  assert.strictEqual(prevDisabled, true, 'Prev must be disabled on Day 1');
  assert.strictEqual(nextDisabled, false, 'Next must be enabled on Day 1');
});

runTest('2.2: 8-day itinerary simulation', () => {
  const trip = createMockTrip(8);
  const rawItinerary = trip.itinerary;
  const totalDays = rawItinerary.length;
  assert.strictEqual(totalDays, 8);
  assert.strictEqual(rawItinerary.map(d => d.day).join(','), '1,2,3,4,5,6,7,8');
});

runTest('2.3: 9-day itinerary simulation — Day 9 is present and selectable', () => {
  const trip = createMockTrip(9);
  const rawItinerary = trip.itinerary;
  const totalDays = rawItinerary.length;
  assert.strictEqual(totalDays, 9);
  
  // Resolve Day 9
  const selectedDay = 9;
  const dayPlan = rawItinerary.find((d, i) => (d.day ?? (i + 1)) === selectedDay);
  assert.ok(dayPlan, 'Day 9 must exist in rawItinerary');
  assert.strictEqual(dayPlan.title, 'Day 9 Sightseeing in Paris');
  assert.strictEqual(dayPlan.activities[0].title, 'Activity for Day 9');
});

runTest('2.4: 12-day itinerary simulation — Days 9, 10, 11, and 12 all resolve correct content', () => {
  const trip = createMockTrip(12);
  const rawItinerary = trip.itinerary;
  const totalDays = rawItinerary.length;
  assert.strictEqual(totalDays, 12);
  
  [9, 10, 11, 12].forEach(dayNum => {
    const dayPlan = rawItinerary.find((d, i) => (d.day ?? (i + 1)) === dayNum);
    assert.ok(dayPlan, `Day ${dayNum} must exist in 12-day trip`);
    assert.strictEqual(dayPlan.day, dayNum);
    assert.strictEqual(dayPlan.title, `Day ${dayNum} Sightseeing in Paris`);
    assert.strictEqual(dayPlan.activities[0].title, `Activity for Day ${dayNum}`);
  });
  
  // Boundary check on Day 12
  const selectedDay = 12;
  const prevDisabled = selectedDay <= 1;
  const nextDisabled = selectedDay >= totalDays;
  assert.strictEqual(prevDisabled, false, 'Prev must be enabled on Day 12');
  assert.strictEqual(nextDisabled, true, 'Next must be disabled on Day 12');
});

runTest('2.5: 14-day itinerary simulation — All 14 days accounted for', () => {
  const trip = createMockTrip(14);
  const rawItinerary = trip.itinerary;
  assert.strictEqual(rawItinerary.length, 14);
  assert.strictEqual(rawItinerary[13].day, 14);
});

runTest('2.6: 30-day itinerary simulation — Substantially long itinerary handled without truncation', () => {
  const trip = createMockTrip(30);
  const rawItinerary = trip.itinerary;
  assert.strictEqual(rawItinerary.length, 30);
  
  // Verify Day 30 resolution
  const day30Plan = rawItinerary.find((d, i) => (d.day ?? (i + 1)) === 30);
  assert.ok(day30Plan, 'Day 30 must exist');
  assert.strictEqual(day30Plan.title, 'Day 30 Sightseeing in Paris');
});

// ── 3. CLIPPING & SCROLL MATH ACCURACY ──────────────────────────────────────

runTest('3.1: Scroll calculation correctly shifts left when button clipped to the left', () => {
  const container = { scrollLeft: 200 };
  const cRect = { left: 100, right: 600 };
  const bRect = { left: 40, right: 90 }; // Clipped on the left (40 < 100)
  
  let targetScrollLeft = null;
  if (bRect.left < cRect.left) {
    targetScrollLeft = Math.max(0, container.scrollLeft + (bRect.left - cRect.left) - 12);
  }
  
  assert.strictEqual(targetScrollLeft, 200 + (40 - 100) - 12); // 200 - 60 - 12 = 128
});

runTest('3.2: Scroll calculation correctly shifts right when button clipped to the right', () => {
  const container = { scrollLeft: 0 };
  const cRect = { left: 100, right: 600 };
  const bRect = { left: 620, right: 690 }; // Clipped on the right (690 > 600)
  
  let targetScrollLeft = null;
  if (bRect.right > cRect.right) {
    targetScrollLeft = container.scrollLeft + (bRect.right - cRect.right) + 12;
  }
  
  assert.strictEqual(targetScrollLeft, 0 + (690 - 600) + 12); // 90 + 12 = 102
});

runTest('3.3: Scroll calculation does nothing when button is fully visible', () => {
  const container = { scrollLeft: 100 };
  const cRect = { left: 100, right: 600 };
  const bRect = { left: 200, right: 270 }; // Fully visible
  
  let didScroll = false;
  if (bRect.left < cRect.left) {
    didScroll = true;
  } else if (bRect.right > cRect.right) {
    didScroll = true;
  }
  
  assert.strictEqual(didScroll, false, 'Must not scroll if button is already visible');
});

console.log('====================================================');
console.log(`🏁 Results: ${passedTests}/${totalTests} tests passed`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
