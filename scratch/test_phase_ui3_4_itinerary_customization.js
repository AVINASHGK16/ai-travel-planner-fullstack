/**
 * Automated Verification Suite for UI-3.4 Itinerary Customization + Product Experience Polish
 * ROAMLY — Interactive Itinerary Customization (Edit, Add, Remove, Reorder, Cost sync, Persistence, Stitch tokens)
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
console.log('🧪 Running UI-3.4 Itinerary Customization Suite');
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
const plannerPageContent = fs.readFileSync(path.join(FRONTEND_DIR, 'pages', 'PlannerPage.jsx'), 'utf-8');

// ── 1. ARCHITECTURE & PROP INTEGRATION ────────────────────────────────────

runTest('1.1: TripOverview accepts onChangeItinerary prop', () => {
  assert(tripOverviewContent.includes('onChangeItinerary'), 'TripOverview must accept onChangeItinerary prop');
});

runTest('1.2: PlannerPage wires handleChangeItinerary and persists changes to localStorage', () => {
  assert(plannerPageContent.includes('handleChangeItinerary'), 'PlannerPage must define handleChangeItinerary');
  assert(plannerPageContent.includes("onChangeItinerary={handleChangeItinerary}"), 'PlannerPage must pass onChangeItinerary prop to TripOverview');
  assert(plannerPageContent.includes("storage.setJSON('activePlan'"), 'PlannerPage must persist updated itinerary to activePlan in localStorage');
});

// ── 2. STATE & ITINERARY REACTIVITY ───────────────────────────────────────

runTest('2.1: TripOverview manages localItinerary state synchronized with trip prop', () => {
  assert(tripOverviewContent.includes('const [localItinerary, setLocalItinerary] = useState'), 'Must manage localItinerary state');
  assert(tripOverviewContent.includes('setLocalItinerary(trip.itinerary)'), 'Must synchronize localItinerary with trip.itinerary updates');
});

runTest('2.2: Activity costs dynamically aggregate into activitiesCost and budget', () => {
  assert(tripOverviewContent.includes('activitiesSum'), 'Must compute activitiesSum across localItinerary');
  assert(tripOverviewContent.includes('totalEstimatedCost'), 'Must dynamically adjust totalEstimatedCost');
});

// ── 3. INTERACTIVE ACTIONS & REORDERING ───────────────────────────────────

runTest('3.1: TripOverview provides Move Up and Move Down reordering controls', () => {
  assert(tripOverviewContent.includes('handleMoveActivityUp'), 'Must provide handleMoveActivityUp handler');
  assert(tripOverviewContent.includes('handleMoveActivityDown'), 'Must provide handleMoveActivityDown handler');
  assert(tripOverviewContent.includes('aria-label="Move activity up"'), 'Must have accessible Move Up button');
  assert(tripOverviewContent.includes('aria-label="Move activity down"'), 'Must have accessible Move Down button');
});

runTest('3.2: TripOverview provides Edit and Remove activity actions', () => {
  assert(tripOverviewContent.includes('handleOpenEditModal'), 'Must provide handleOpenEditModal handler');
  assert(tripOverviewContent.includes('handleRemoveActivity'), 'Must provide handleRemoveActivity handler');
  assert(tripOverviewContent.includes('aria-label="Edit activity"'), 'Must have accessible Edit button');
  assert(tripOverviewContent.includes('aria-label="Remove activity"'), 'Must have accessible Remove button');
});

// ── 4. STITCH DESIGN SYSTEM ALIGNMENT ─────────────────────────────────────

runTest('4.1: Activity cards include GripVertical six-dot affordance and time badge', () => {
  assert(tripOverviewContent.includes('GripVertical'), 'Must include GripVertical icon for drag/reorder affordance');
  assert(tripOverviewContent.includes('activity.time'), 'Must display activity time');
  assert(tripOverviewContent.includes('activity.title'), 'Must display dominant title');
  assert(tripOverviewContent.includes('activityDuration'), 'Must display activity duration');
});

runTest('4.2: Day timeline provides visual + Add Activity insertion node', () => {
  assert(tripOverviewContent.includes('+ Add Activity to Day {selectedDay}'), 'Must have timeline + Add Activity node for current day');
  assert(tripOverviewContent.includes('handleOpenAddModal'), 'Must attach handleOpenAddModal to insertion node');
});

// ── 5. ADD / EDIT ACTIVITY MODAL ──────────────────────────────────────────

runTest('5.1: Modal provides complete activity form using Roamly UI primitives', () => {
  assert(tripOverviewContent.includes('isOpen={activityModalOpen}'), 'Modal must bind to activityModalOpen');
  assert(tripOverviewContent.includes('handleSaveActivityModal'), 'Form must bind to handleSaveActivityModal');
  assert(tripOverviewContent.includes('<Input'), 'Form must use Roamly Input primitive');
  assert(tripOverviewContent.includes('<Select'), 'Form must use Roamly Select primitive');
  assert(tripOverviewContent.includes('activityCategoryOptions'), 'Form must provide category options');
});

runTest('5.2: Modal title adapts to Edit vs Add mode', () => {
  assert(tripOverviewContent.includes("modalMode === 'edit' ? `Edit Activity (Day ${selectedDay})` : `Add Activity to Day ${selectedDay}`"), 'Modal title must reflect Edit vs Add mode');
});

// ── 7. REVIEW FIXES VERIFICATION ──────────────────────────────────────────

const heroSearchContent = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'HeroSearch.jsx'), 'utf-8');

runTest('7.1: HeroSearch voice callbacks guard against replaced recognition instances', () => {
  assert(heroSearchContent.includes('if (recognitionRef.current !== recognition) return;'), 'Voice callbacks must guard against stale recognition instances');
  assert(heroSearchContent.includes('if (recognitionRef.current === recognition)'), 'Error/stop cleanup must only clear ref when current');
});

runTest('7.2: HeroSearch form includes noValidate for custom inline error validation', () => {
  assert(heroSearchContent.includes('noValidate'), 'HeroSearch form must have noValidate attribute');
});

runTest('7.3: TripOverview activitiesSum handles zero costs and customization state accurately', () => {
  assert(tripOverviewContent.includes('isItineraryCustomized'), 'TripOverview must track itinerary customization state');
  assert(tripOverviewContent.includes('hasAuthoritativeCosts || isItineraryCustomized'), 'activitiesSum must return 0 when costs are 0 or activities customized');
  assert(tripOverviewContent.includes('activitiesSum !== undefined ? Math.max(0, baseTotalCost - initialActivitiesCost + activitiesSum) : baseTotalCost'), 'totalEstimatedCost must preserve customized zero-sum activities without restoring initial food/misc costs');
});

console.log(`\n====================================================`);
console.log(`🏁 Results: ${passedTests}/${totalTests} tests passed`);
console.log(`====================================================`);

if (passedTests !== totalTests) {
  process.exit(1);
}
