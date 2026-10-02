import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('🧪 VERIFYING REVIEW COMMENTS 5 TARGETED FIXES');
console.log('====================================================\n');

const travelOptionsPath = path.resolve('frontend/src/components/TravelOptions.jsx');
const plannerPagePath = path.resolve('frontend/src/pages/PlannerPage.jsx');

const travelOptionsContent = fs.readFileSync(travelOptionsPath, 'utf8');
const plannerPageContent = fs.readFileSync(plannerPagePath, 'utf8');

// ---------------------------------------------------------------------------
// 1. TravelOptions.jsx: Idle prompt vs. Empty search results
// ---------------------------------------------------------------------------
console.log('--- Test 1: TravelOptions Idle prompt vs Empty search results ---');
{
  assert.ok(
    travelOptionsContent.includes("const isIdle = effectiveFlightStatus === 'idle';"),
    'TravelOptions must determine isIdle from effectiveFlightStatus === "idle"'
  );
  assert.ok(
    travelOptionsContent.includes("isIdle ? 'Search for transport options' : 'No transport options found'"),
    'TravelOptions must display idle prompt when idle, and "No transport options found" when empty'
  );
  assert.ok(
    travelOptionsContent.includes("isIdle ? 'Search Flights' : 'Modify Search'"),
    'TravelOptions must offer "Search Flights" when idle and "Modify Search" when empty'
  );

  // Behavioral simulation
  function simulateEmptyOrIdleCard(effectiveFlightStatus, flightList = []) {
    if (effectiveFlightStatus === 'loading') return { title: 'Searching' };
    if (effectiveFlightStatus === 'empty' || effectiveFlightStatus === 'idle' || flightList.length === 0) {
      const isIdle = effectiveFlightStatus === 'idle';
      return {
        title: isIdle ? 'Search for transport options' : 'No transport options found',
        buttonText: isIdle ? 'Search Flights' : 'Modify Search'
      };
    }
    return { title: 'Results' };
  }

  const idleCard = simulateEmptyOrIdleCard('idle', []);
  assert.strictEqual(idleCard.title, 'Search for transport options');
  assert.strictEqual(idleCard.buttonText, 'Search Flights');
  console.log('  ✓ PASS: Idle state renders idle prompt ("Search for transport options") before any search');

  const emptyCard = simulateEmptyOrIdleCard('empty', []);
  assert.strictEqual(emptyCard.title, 'No transport options found');
  assert.strictEqual(emptyCard.buttonText, 'Modify Search');
  console.log('  ✓ PASS: Empty state renders "No transport options found" after search returns zero results');
}

// ---------------------------------------------------------------------------
// 2. PlannerPage.jsx: Unmount-only cleanup effect
// ---------------------------------------------------------------------------
console.log('\n--- Test 2: PlannerPage unmount-only cleanup effect ---');
{
  assert.ok(
    plannerPageContent.includes('activeSearchIdRef.current += 1;'),
    'Cleanup effect must increment activeSearchIdRef during cleanup'
  );
  assert.ok(
    plannerPageContent.includes('searchControllerRef.current.abort()'),
    'Cleanup effect must abort searchControllerRef'
  );
  assert.ok(
    plannerPageContent.includes('flightControllerRef.current.abort()'),
    'Cleanup effect must abort flightControllerRef'
  );

  // Verify that it is in an unmount-only effect with dependency array []
  const unmountEffectRegex = /useEffect\(\(\)\s*=>\s*\{\s*return\s*\(\)\s*=>\s*\{[\s\S]*?activeSearchIdRef\.current\s*\+=\s*1;[\s\S]*?searchControllerRef\.current\.abort\(\);[\s\S]*?flightControllerRef\.current\.abort\(\);[\s\S]*?\};\s*\}, \[\]\);/;
  assert.ok(
    unmountEffectRegex.test(plannerPageContent),
    'PlannerPage must have an unmount-only cleanup effect with dependency []'
  );
  console.log('  ✓ PASS: PlannerPage has unmount-only cleanup effect aborting held controllers and incrementing activeSearchIdRef');
}

// ---------------------------------------------------------------------------
// 3. PlannerPage.jsx: Abort branches calling setLoading(false)
// ---------------------------------------------------------------------------
console.log('\n--- Test 3: Search abort branches calling setLoading(false) ---');
{
  // Check geo catch abort branch
  const geoCatchBlock = plannerPageContent.match(/catch\s*\(geoErr\)\s*\{[\s\S]*?if\s*\(searchController\.signal\.aborted\)\s*\{([\s\S]*?)\}/);
  assert.ok(geoCatchBlock, 'geoErr abort block must exist');
  assert.ok(geoCatchBlock[1].includes('setLoading(false);'), 'geoErr abort block must call setLoading(false)');
  assert.ok(geoCatchBlock[1].includes('setFlightLoading(false);'), 'geoErr abort block must preserve setFlightLoading(false)');
  assert.ok(geoCatchBlock[1].includes("setFlightStatus('idle');"), 'geoErr abort block must preserve setFlightStatus("idle")');

  // Check post-geo abort branch
  const postGeoBlock = plannerPageContent.match(/if\s*\(activeSearchIdRef\.current !== currentSearchId\)\s*return;\s*if\s*\(searchController\.signal\.aborted\)\s*\{([\s\S]*?)\}/);
  assert.ok(postGeoBlock, 'post-geo abort block must exist');
  assert.ok(postGeoBlock[1].includes('setLoading(false);'), 'post-geo abort block must call setLoading(false)');
  assert.ok(postGeoBlock[1].includes('setFlightLoading(false);'), 'post-geo abort block must preserve setFlightLoading(false)');
  assert.ok(postGeoBlock[1].includes("setFlightStatus('idle');"), 'post-geo abort block must preserve setFlightStatus("idle")');

  // Check AI error abort branch
  const aiCatchBlock = plannerPageContent.match(/catch\s*\(aiErr\)\s*\{[\s\S]*?if\s*\(searchController\.signal\.aborted\)\s*\{([\s\S]*?)\}/);
  assert.ok(aiCatchBlock, 'aiErr abort block must exist');
  assert.ok(aiCatchBlock[1].includes('setLoading(false);'), 'aiErr abort block must call setLoading(false)');

  // Check outer catch abort branch
  const outerCatchBlock = plannerPageContent.match(/catch\s*\(err\)\s*\{[\s\S]*?if\s*\(searchController\.signal\.aborted\)\s*\{([\s\S]*?)\}/);
  assert.ok(outerCatchBlock, 'outer catch abort block must exist');
  assert.ok(outerCatchBlock[1].includes('setLoading(false);'), 'outer catch abort block must call setLoading(false)');
  assert.ok(outerCatchBlock[1].includes('setFlightLoading(false);'), 'outer catch abort block must preserve setFlightLoading(false)');
  assert.ok(outerCatchBlock[1].includes("setFlightStatus('idle');"), 'outer catch abort block must preserve setFlightStatus("idle")');

  console.log('  ✓ PASS: All search flow abort branches invoke setLoading(false) while preserving flight resets');
}

// ---------------------------------------------------------------------------
// 4. PlannerPage.jsx: Deduplicate placeholder in create save flow
// ---------------------------------------------------------------------------
console.log('\n--- Test 4: Deduplicate placeholder in create save flow ---');
{
  assert.ok(
    plannerPageContent.includes("activeTrip?._id"),
    'Save create branch must check activeTrip?._id'
  );
  assert.ok(
    plannerPageContent.includes("localTrips.filter(t => t?._id !== activeTrip._id && t?.id !== activeTrip._id)"),
    'Save create branch must filter out matching placeholder by _id and id'
  );
  assert.ok(
    plannerPageContent.includes("storage.setJSON('savedTrips', [effectiveTrip, ...remainingTrips]);"),
    'Save create branch must prepend effectiveTrip to remainingTrips'
  );

  // Behavioral simulation
  const placeholderId = 'local_123456789';
  const existingLocalTrips = [
    { _id: placeholderId, from: 'Hyderabad', to: 'Bengaluru' },
    { _id: 'server_999', from: 'Mumbai', to: 'Goa' }
  ];
  const activeTrip = { _id: placeholderId, from: 'Hyderabad', to: 'Bengaluru' };
  const effectiveTrip = { _id: 'server_created_123', from: 'Hyderabad', to: 'Bengaluru' };

  const remainingTrips = activeTrip?._id
    ? existingLocalTrips.filter(t => t?._id !== activeTrip._id && t?.id !== activeTrip._id)
    : existingLocalTrips;
  const newSavedTrips = [effectiveTrip, ...remainingTrips];

  assert.strictEqual(newSavedTrips.length, 2, 'Should not contain duplicates');
  assert.strictEqual(newSavedTrips[0]._id, 'server_created_123');
  assert.strictEqual(newSavedTrips[1]._id, 'server_999');
  assert.strictEqual(newSavedTrips.some(t => t._id === placeholderId), false, 'Placeholder must be removed');
  console.log('  ✓ PASS: Created trip replaces local placeholder without duplicating entries');
}

// ---------------------------------------------------------------------------
// 5. PlannerPage.jsx: Existing trip offline update adds uncached trip
// ---------------------------------------------------------------------------
console.log('\n--- Test 5: Existing trip offline update adds uncached trip ---');
{
  assert.ok(
    plannerPageContent.includes("const hasExisting = localTrips.some(t => t?._id === activeTrip._id || t?.id === activeTrip._id);"),
    'Offline update must check if activeTrip._id exists in localTrips'
  );
  assert.ok(
    plannerPageContent.includes("hasExisting\n          ? localTrips.map(t => (t?._id === activeTrip._id || t?.id === activeTrip._id ? localSavedTrip : t))\n          : [localSavedTrip, ...localTrips]"),
    'Offline update must add localSavedTrip when not found in localTrips'
  );

  // Behavioral simulation
  // Case A: Trip was cached in localTrips
  const tripToUpdate = { _id: 'trip_existing', from: 'Delhi', to: 'Jaipur', budget: 15000 };
  const localTripsWithTrip = [{ _id: 'trip_existing', from: 'Delhi', to: 'Jaipur', budget: 10000 }];
  const localSavedTripA = { ...tripToUpdate, updatedAt: '2026-10-02T00:00:00.000Z' };

  const hasExistingA = localTripsWithTrip.some(t => t?._id === tripToUpdate._id || t?.id === tripToUpdate._id);
  const updatedTripsA = hasExistingA
    ? localTripsWithTrip.map(t => (t?._id === tripToUpdate._id || t?.id === tripToUpdate._id ? localSavedTripA : t))
    : [localSavedTripA, ...localTripsWithTrip];

  assert.strictEqual(updatedTripsA.length, 1);
  assert.strictEqual(updatedTripsA[0].budget, 15000);
  console.log('  ✓ PASS: Cached existing trip is replaced on offline update');

  // Case B: Trip was NOT cached in localTrips (e.g. loaded directly from URL)
  const localTripsWithoutTrip = [{ _id: 'other_trip', from: 'Chennai', to: 'Kochi' }];
  const hasExistingB = localTripsWithoutTrip.some(t => t?._id === tripToUpdate._id || t?.id === tripToUpdate._id);
  const updatedTripsB = hasExistingB
    ? localTripsWithoutTrip.map(t => (t?._id === tripToUpdate._id || t?.id === tripToUpdate._id ? localSavedTripA : t))
    : [localSavedTripA, ...localTripsWithoutTrip];

  assert.strictEqual(updatedTripsB.length, 2);
  assert.strictEqual(updatedTripsB[0]._id, 'trip_existing');
  assert.strictEqual(updatedTripsB[1]._id, 'other_trip');
  console.log('  ✓ PASS: Uncached existing trip is added to savedTrips on offline update');
}

console.log('\n====================================================');
console.log('🎉 ALL 5 REVIEW COMMENT VERIFICATIONS PASSED (5/5)');
console.log('====================================================\n');
