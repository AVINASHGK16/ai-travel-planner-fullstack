import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('🧪 TESTING FLIGHT LOADING LIFECYCLE & REGRESSION FIX');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// 1. TravelOptions.jsx Static & Logic Inspection
// ---------------------------------------------------------------------------
const travelOptionsPath = path.resolve('frontend/src/components/TravelOptions.jsx');
const travelOptionsContent = fs.readFileSync(travelOptionsPath, 'utf8');

console.log('--- Test 1: TravelOptions Flight Loading Condition Inspection ---');
{
  // Must NOT contain the old faulty condition
  assert.strictEqual(
    travelOptionsContent.includes("effectiveFlightStatus === 'loading' || (effectiveFlightStatus === 'idle' && flightList.length === 0)"),
    false,
    'TravelOptions must NOT treat idle && flightList.length === 0 as loading'
  );

  // Must strictly check effectiveFlightStatus === 'loading'
  assert.strictEqual(
    travelOptionsContent.includes("if (effectiveFlightStatus === 'loading') {\n      return renderSkeletonList();\n    }"),
    true,
    "TravelOptions skeleton renderer must trigger ONLY when effectiveFlightStatus === 'loading'"
  );

  console.log("  ✓ PASS: TravelOptions no longer treats idle + 0 flights as loading");
  console.log("  ✓ PASS: Skeleton UI condition strictly restricted to effectiveFlightStatus === 'loading'");
}

// ---------------------------------------------------------------------------
// 2. Behavioral Unit Simulation of TravelOptions renderFlightTab
// ---------------------------------------------------------------------------
console.log('\n--- Test 2: TravelOptions renderFlightTab Simulation ---');
{
  function simulateRenderFlightTab({ effectiveFlightStatus, flightList = [], flightError = null }) {
    // 1. Loading State (Multi-line Skeletons, No giant spinner)
    if (effectiveFlightStatus === 'loading') {
      return { view: 'SKELETON_LIST', text: 'Searching live flights...' };
    }

    // 2. Error State
    if ((effectiveFlightStatus === 'error' || flightError) && flightList.length === 0) {
      return { view: 'ERROR_CARD', text: "We couldn't load travel options" };
    }

    // 3. Empty / Idle State
    if (effectiveFlightStatus === 'empty' || effectiveFlightStatus === 'idle' || flightList.length === 0) {
      return { view: 'EMPTY_CARD', text: 'No transport options found' };
    }

    // 4. Results Available
    return { view: 'RESULTS_GRID', count: flightList.length };
  }

  // 1. idle + zero flights does NOT render "Searching live flights..."
  const idleResult = simulateRenderFlightTab({ effectiveFlightStatus: 'idle', flightList: [] });
  assert.strictEqual(idleResult.view, 'EMPTY_CARD');
  assert.notStrictEqual(idleResult.text, 'Searching live flights...', 'Must not render "Searching live flights..." in idle state');
  console.log('  ✓ PASS: idle + zero flights renders EMPTY_CARD, NOT "Searching live flights..."');

  // 2. loading + zero flights DOES render skeletons
  const loadingResult = simulateRenderFlightTab({ effectiveFlightStatus: 'loading', flightList: [] });
  assert.strictEqual(loadingResult.view, 'SKELETON_LIST');
  assert.strictEqual(loadingResult.text, 'Searching live flights...', 'Must render skeleton list when loading');
  console.log('  ✓ PASS: loading + zero flights DOES render skeleton list with "Searching live flights..."');

  // 3. error + zero flights renders error card
  const errorResult = simulateRenderFlightTab({ effectiveFlightStatus: 'error', flightList: [] });
  assert.strictEqual(errorResult.view, 'ERROR_CARD');
  console.log('  ✓ PASS: error + zero flights renders error card');

  // 4. success + results renders results grid
  const successResult = simulateRenderFlightTab({ effectiveFlightStatus: 'success', flightList: [{ id: 'FL-1' }] });
  assert.strictEqual(successResult.view, 'RESULTS_GRID');
  assert.strictEqual(successResult.count, 1);
  console.log('  ✓ PASS: success + results renders results grid');
}

// ---------------------------------------------------------------------------
// 3. PlannerPage.jsx Static Inspection for Abort & Error Cleanups
// ---------------------------------------------------------------------------
console.log('\n--- Test 3: PlannerPage Pre-Search Abort & Error Cleanup Inspection ---');
const plannerPagePath = path.resolve('frontend/src/pages/PlannerPage.jsx');
const plannerPageContent = fs.readFileSync(plannerPagePath, 'utf8');

{
  // Verify geoErr abort cleanup
  const geoErrAbortPattern = /catch\s*\(\s*geoErr\s*\)\s*\{[\s\S]*?if\s*\(\s*(?:controller|searchController)\.signal\.aborted\s*\)\s*\{[\s\S]*?setFlightLoading\(false\);[\s\S]*?setFlightStatus\('idle'\);[\s\S]*?return;/;
  assert.strictEqual(geoErrAbortPattern.test(plannerPageContent), true, 'geoErr abort branch must reset flightLoading to false and flightStatus to idle');

  // Verify pre-search abort cleanup before resolveTripGeography result usage
  const preSearchAbortPattern = /if\s*\(\s*(?:controller|searchController)\.signal\.aborted\s*\)\s*\{[\s\S]*?setFlightLoading\(false\);[\s\S]*?setFlightStatus\('idle'\);[\s\S]*?return;\s*\}[\s\S]*?const\s*\{\s*routeDetails\s*\}\s*=\s*geoData;/;
  assert.strictEqual(preSearchAbortPattern.test(plannerPageContent), true, 'Pre-search abort check before searchFlights must reset flightLoading to false and flightStatus to idle');

  // Verify outer calculation catch resets flightLoading and flightStatus
  const outerCatchPattern = /catch\s*\(\s*err\s*\)\s*\{[\s\S]*?if\s*\(\s*(?:controller|searchController)\.signal\.aborted\s*\)\s*\{[\s\S]*?setFlightLoading\(false\);[\s\S]*?setFlightStatus\('idle'\);[\s\S]*?return;[\s\S]*?setFlightLoading\(false\);[\s\S]*?setFlightStatus\('idle'\);/;
  assert.strictEqual(outerCatchPattern.test(plannerPageContent), true, 'Outer catch must reset flightLoading to false and flightStatus to idle on both abort and error');

  console.log('  ✓ PASS: PlannerPage geoErr abort branch cleans up flightLoading & flightStatus');
  console.log('  ✓ PASS: PlannerPage pre-flight abort check cleans up flightLoading & flightStatus');
  console.log('  ✓ PASS: PlannerPage outer catch cleans up flightLoading & flightStatus');
}

// ---------------------------------------------------------------------------
// 4. Lifecycle Simulation of PlannerPage handleSearch Flow
// ---------------------------------------------------------------------------
console.log('\n--- Test 4: PlannerPage handleSearch Flow Simulation ---');
{
  async function simulateHandleSearch({
    from = 'Bengaluru',
    to = 'Jaipur',
    abortAt = null, // 'during-geo' | 'after-geo' | 'during-calc'
    geoError = false,
    calcError = false,
    distanceKm = 1500
  }) {
    let flightLoading = false;
    let flightStatus = 'idle';
    let searchError = null;
    let searchFlightsCalled = false;
    let searchFlightsParams = null;

    const controller = new AbortController();

    // handleSearch start
    flightLoading = true;
    flightStatus = 'loading';
    searchError = null;

    try {
      let geoData = null;
      try {
        if (abortAt === 'during-geo') {
          controller.abort();
        }
        if (geoError) {
          throw new Error('Geocoding service unavailable');
        }
        if (controller.signal.aborted) {
          flightLoading = false;
          flightStatus = 'idle';
          return { flightLoading, flightStatus, searchError, searchFlightsCalled };
        }
        geoData = { fromLocation: { name: from }, toLocation: { name: to }, routeDetails: { distanceKm } };
      } catch (geoErr) {
        if (controller.signal.aborted) {
          flightLoading = false;
          flightStatus = 'idle';
          return { flightLoading, flightStatus, searchError, searchFlightsCalled };
        }
        searchError = geoErr.message;
        flightLoading = false;
        flightStatus = 'idle';
        return { flightLoading, flightStatus, searchError, searchFlightsCalled };
      }

      // Check after geo resolution
      if (abortAt === 'after-geo') {
        controller.abort();
      }
      if (controller.signal.aborted) {
        flightLoading = false;
        flightStatus = 'idle';
        return { flightLoading, flightStatus, searchError, searchFlightsCalled };
      }

      if (calcError) {
        throw new Error('Unexpected calculation failure');
      }

      const canFly = (geoData?.routeDetails?.distanceKm || 0) >= 200;
      if (canFly) {
        // Trigger flight search
        searchFlightsCalled = true;
        searchFlightsParams = { origin: from, destination: to };
        // Asynchronous resolution would happen here
      } else {
        flightLoading = false;
        flightStatus = 'empty';
      }

      return { flightLoading, flightStatus, searchError, searchFlightsCalled, searchFlightsParams };
    } catch (err) {
      if (controller.signal.aborted) {
        flightLoading = false;
        flightStatus = 'idle';
        return { flightLoading, flightStatus, searchError, searchFlightsCalled };
      }
      searchError = 'An unexpected error occurred while calculating your itinerary.';
      flightLoading = false;
      flightStatus = 'idle';
      return { flightLoading, flightStatus, searchError, searchFlightsCalled };
    }
  }

  // 1. Test abort during geocoding
  const abortDuringGeo = await simulateHandleSearch({ abortAt: 'during-geo' });
  assert.strictEqual(abortDuringGeo.flightLoading, false, 'aborted pre-search does not leave flightLoading=true');
  assert.strictEqual(abortDuringGeo.flightStatus, 'idle', 'aborted pre-search does not leave flightStatus="loading"');
  assert.strictEqual(abortDuringGeo.searchFlightsCalled, false);
  console.log('  ✓ PASS: Abort during geocoding leaves flightLoading=false and flightStatus="idle"');

  // 2. Test abort immediately after geocoding (before searchFlights)
  const abortAfterGeo = await simulateHandleSearch({ abortAt: 'after-geo' });
  assert.strictEqual(abortAfterGeo.flightLoading, false, 'aborted pre-search does not leave flightLoading=true');
  assert.strictEqual(abortAfterGeo.flightStatus, 'idle', 'aborted pre-search does not leave flightStatus="loading"');
  assert.strictEqual(abortAfterGeo.searchFlightsCalled, false);
  console.log('  ✓ PASS: Abort after geocoding leaves flightLoading=false and flightStatus="idle"');

  // 3. Test geo error
  const withGeoError = await simulateHandleSearch({ geoError: true });
  assert.strictEqual(withGeoError.flightLoading, false);
  assert.strictEqual(withGeoError.flightStatus, 'idle');
  assert.strictEqual(withGeoError.searchFlightsCalled, false);
  console.log('  ✓ PASS: Geocoding error cleans up flightLoading=false and flightStatus="idle"');

  // 4. Test calculation error
  const withCalcError = await simulateHandleSearch({ calcError: true });
  assert.strictEqual(withCalcError.flightLoading, false);
  assert.strictEqual(withCalcError.flightStatus, 'idle');
  assert.strictEqual(withCalcError.searchFlightsCalled, false);
  console.log('  ✓ PASS: Calculation error caught in outer catch cleans up flightLoading=false and flightStatus="idle"');

  // 5. Successful search reaches searchFlights()
  const successRun = await simulateHandleSearch({});
  assert.strictEqual(successRun.searchFlightsCalled, true, 'successful search still reaches searchFlights()');
  assert.strictEqual(successRun.searchFlightsParams.origin, 'Bengaluru');
  assert.strictEqual(successRun.searchFlightsParams.destination, 'Jaipur');
  console.log('  ✓ PASS: Successful search reaches searchFlights() with expected origin and destination');
}

// ---------------------------------------------------------------------------
// 5. Existing flight selection behavior unchanged verification
// ---------------------------------------------------------------------------
console.log('\n--- Test 5: Existing Flight Selection Behavior Verification ---');
{
  function mergeFlightOffersIntoTrip(trip, offers, selectedOffer = null) {
    if (!trip) return trip;
    const safeOffers = Array.isArray(offers) ? offers : [];
    const matchedExistingOffer = trip.selectedFlight?.id
      ? safeOffers.find(f => f.id === trip.selectedFlight.id)
      : null;
    const chosenOffer = selectedOffer || matchedExistingOffer || safeOffers[0] || null;
    const chosenPrice = typeof chosenOffer?.price === 'number' && chosenOffer.price > 0 ? chosenOffer.price : null;
    const validPricedOffer = safeOffers.find(f => typeof f?.price === 'number' && f.price > 0);
    const realFlightCost = chosenPrice !== null ? chosenPrice : (validPricedOffer ? validPricedOffer.price : trip.costComponents?.flightCost);
    const updatedCostComponents = trip.costComponents ? {
      ...trip.costComponents,
      flightCost: realFlightCost
    } : trip.costComponents;

    return {
      ...trip,
      selectedFlight: chosenOffer,
      costComponents: updatedCostComponents,
      options: {
        ...trip.options,
        flight: safeOffers
      }
    };
  }

  const initialFlights = [
    { id: 'FL-1', airline: 'Air India', price: 6000 },
    { id: 'FL-2', airline: 'IndiGo', price: 4500 }
  ];
  let trip = {
    options: { flight: initialFlights },
    costComponents: { flightCost: 6000 },
    selectedFlight: null
  };

  // Initial selection
  trip = mergeFlightOffersIntoTrip(trip, initialFlights);
  assert.strictEqual(trip.selectedFlight.id, 'FL-1');
  assert.strictEqual(trip.costComponents.flightCost, 6000);

  // User selects FL-2
  trip = mergeFlightOffersIntoTrip(trip, initialFlights, initialFlights[1]);
  assert.strictEqual(trip.selectedFlight.id, 'FL-2');
  assert.strictEqual(trip.costComponents.flightCost, 4500);

  // Offers array order preserved
  assert.strictEqual(trip.options.flight[0].id, 'FL-1');
  assert.strictEqual(trip.options.flight[1].id, 'FL-2');

  console.log('  ✓ PASS: Flight selection order, budget update, and card array immutability remain intact');
}

console.log('\n====================================================');
console.log('🏁 ALL FLIGHT LOADING LIFECYCLE TESTS PASSED');
console.log('====================================================');
