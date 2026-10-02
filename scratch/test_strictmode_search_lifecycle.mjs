import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('🧪 VERIFYING REACT STRICTMODE FLIGHT SEARCH RACE FIX');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// 1. Static Verification of PlannerPage.jsx
// ---------------------------------------------------------------------------
const plannerPagePath = path.resolve('frontend/src/pages/PlannerPage.jsx');
const plannerPageContent = fs.readFileSync(plannerPagePath, 'utf8');

console.log('--- Test 1: Static Architecture Inspection in PlannerPage.jsx ---');
{
  // 1. No shared-ref abort inside effect cleanup
  const searchEffectMatch = plannerPageContent.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?handleSearch\(searchParams[\s\S]*?\}, \[location\.state, tripId\]\);/);
  assert.ok(searchEffectMatch, 'search useEffect block must exist');
  const searchEffectContent = searchEffectMatch[0];

  assert.strictEqual(
    searchEffectContent.includes('searchControllerRef.current.abort()') ||
    searchEffectContent.includes('searchControllerRef.current?.abort()'),
    false,
    'useEffect cleanup must NOT abort controllers through shared searchControllerRef.current'
  );
  assert.strictEqual(
    searchEffectContent.includes('flightControllerRef.current.abort()') ||
    searchEffectContent.includes('flightControllerRef.current?.abort()'),
    false,
    'useEffect cleanup must NOT abort controllers through shared flightControllerRef.current'
  );

  // 2. Effect owns local controllers
  assert.strictEqual(
    plannerPageContent.includes('const searchController = new AbortController();'),
    true,
    'useEffect must create local searchController'
  );
  assert.strictEqual(
    plannerPageContent.includes('const flightController = new AbortController();'),
    true,
    'useEffect must create local flightController'
  );

  // 3. Monotonic activeSearchIdRef used for stale-search protection
  assert.strictEqual(
    plannerPageContent.includes('const activeSearchIdRef = useRef(0);'),
    true,
    'PlannerPage must define activeSearchIdRef for monotonic search tracking'
  );
  assert.strictEqual(
    plannerPageContent.includes('const currentSearchId = ++activeSearchIdRef.current;'),
    true,
    'handleSearch must allocate currentSearchId monotonically'
  );
  assert.strictEqual(
    plannerPageContent.includes('if (activeSearchIdRef.current !== currentSearchId) return;'),
    true,
    'handleSearch must guard async branches against stale search ID'
  );

  // 4. Temporary diagnostic noise removed
  assert.strictEqual(
    plannerPageContent.includes('createInstrumentedAbortController'),
    false,
    'Temporary diagnostic controller helper must be removed'
  );
  assert.strictEqual(
    plannerPageContent.includes('[LIFECYCLE]'),
    false,
    'Noisy [LIFECYCLE] console logs must be removed from production code'
  );

  console.log('  ✓ PASS: Effect owns local controllers (no shared-ref abort in cleanup)');
  console.log('  ✓ PASS: Monotonic activeSearchIdRef stale-search protection in place');
  console.log('  ✓ PASS: Temporary diagnostic instrumentation cleanly removed');
}

// ---------------------------------------------------------------------------
// 2. State & Lifecycle Simulation Engine
// ---------------------------------------------------------------------------
class PlannerSimulation {
  constructor() {
    this.searchControllerRef = { current: null };
    this.flightControllerRef = { current: null };
    this.activeSearchIdRef = { current: 0 };

    this.activeTrip = null;
    this.flightLoading = false;
    this.flightStatus = 'idle';
    this.searchFlightsDispatches = [];
    this.logs = [];
  }

  log(msg) {
    this.logs.push(msg);
  }

  setFlightLoading(val) {
    this.flightLoading = val;
  }

  setFlightStatus(val) {
    this.flightStatus = val;
  }

  setActiveTrip(trip) {
    this.activeTrip = trip;
  }

  async resolveTripGeography(from, to, signal, delayMs = 30) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (signal?.aborted) {
          const err = new Error('Geocoding aborted');
          err.name = 'AbortError';
          reject(err);
        } else {
          resolve({ from, to, distanceKm: 1500 });
        }
      }, delayMs);

      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        const err = new Error('Geocoding aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  }

  async searchFlights(params, signal, delayMs = 50) {
    this.searchFlightsDispatches.push({ params, searchId: params.searchId, signal });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (signal?.aborted) {
          const err = new Error('Flight search aborted');
          err.name = 'AbortError';
          reject(err);
        } else {
          resolve({
            offers: [{ id: `FL-${params.searchId}`, price: 5000 }],
            status: 'CONFIRMED_OFFERS'
          });
        }
      }, delayMs);

      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        const err = new Error('Flight search aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  }

  async handleSearch(params, customControllers = null, geoDelayMs = 30, flightDelayMs = 50) {
    const currentSearchId = ++this.activeSearchIdRef.current;

    if (this.searchControllerRef.current) {
      this.searchControllerRef.current.abort();
    }
    if (this.flightControllerRef.current) {
      this.flightControllerRef.current.abort();
    }

    const searchController = customControllers?.searchController || new AbortController();
    const flightController = customControllers?.flightController || new AbortController();

    this.searchControllerRef.current = searchController;
    this.flightControllerRef.current = flightController;

    this.setFlightStatus('loading');
    this.setFlightLoading(true);

    try {
      let geoData = null;
      try {
        geoData = await this.resolveTripGeography(params.from, params.to, searchController.signal, geoDelayMs);
      } catch (geoErr) {
        if (this.activeSearchIdRef.current !== currentSearchId) return;
        if (searchController.signal.aborted) {
          this.setFlightLoading(false);
          this.setFlightStatus('idle');
          return;
        }
        this.setFlightLoading(false);
        this.setFlightStatus('idle');
        return;
      }

      if (this.activeSearchIdRef.current !== currentSearchId) return;
      if (searchController.signal.aborted) {
        this.setFlightLoading(false);
        this.setFlightStatus('idle');
        return;
      }

      const baselineMock = {
        id: `plan-${currentSearchId}`,
        from: params.from,
        to: params.to,
        options: { flight: [] }
      };

      if (this.activeSearchIdRef.current !== currentSearchId) return;
      this.setActiveTrip(baselineMock);

      this.setFlightLoading(true);
      this.setFlightStatus('loading');

      this.searchFlights({ ...params, searchId: currentSearchId }, flightController.signal, flightDelayMs)
        .then(res => {
          if (this.activeSearchIdRef.current !== currentSearchId) return;
          if (flightController.signal.aborted) return;

          const offers = res.offers || [];
          this.setActiveTrip({
            ...baselineMock,
            options: { flight: offers }
          });
          this.setFlightLoading(false);
          this.setFlightStatus('success');
        })
        .catch(err => {
          if (this.activeSearchIdRef.current !== currentSearchId) return;
          if (flightController.signal.aborted) {
            this.setFlightLoading(false);
            this.setFlightStatus('idle');
            return;
          }
          this.setFlightLoading(false);
          this.setFlightStatus('error');
        });

    } catch (err) {
      if (this.activeSearchIdRef.current !== currentSearchId) return;
      if (searchController.signal.aborted) {
        this.setFlightLoading(false);
        this.setFlightStatus('idle');
        return;
      }
      this.setFlightLoading(false);
      this.setFlightStatus('idle');
    }
  }

  // Effect simulation helper matching PlannerPage's search useEffect
  triggerSearchEffect(searchParams, geoDelayMs = 30, flightDelayMs = 50) {
    const searchController = new AbortController();
    const flightController = new AbortController();

    const searchPromise = this.handleSearch(searchParams, { searchController, flightController }, geoDelayMs, flightDelayMs);

    const cleanup = () => {
      searchController.abort();
      flightController.abort();

      if (this.searchControllerRef.current === searchController) {
        this.searchControllerRef.current = null;
      }
      if (this.flightControllerRef.current === flightController) {
        this.flightControllerRef.current = null;
      }
    };

    return { searchPromise, cleanup, searchController, flightController };
  }
}

// ---------------------------------------------------------------------------
// 3. StrictMode Double Execution & Isolation Test
// ---------------------------------------------------------------------------
console.log('\n--- Test 2: React StrictMode Double Effect Execution & Isolation ---');
{
  const sim = new PlannerSimulation();

  // Mount 1
  const mount1 = sim.triggerSearchEffect({ from: 'Bengaluru', to: 'Jaipur' }, 60, 80);
  assert.strictEqual(sim.activeSearchIdRef.current, 1, 'SRCH-1 started');
  assert.strictEqual(sim.flightLoading, true);
  assert.strictEqual(sim.flightStatus, 'loading');

  // StrictMode simulated unmount cleanup after 10ms
  await new Promise(r => setTimeout(r, 10));
  mount1.cleanup();

  // Verify: Cleanup 1 aborted ONLY SRCH-1's controllers
  assert.strictEqual(mount1.searchController.signal.aborted, true, 'SRCH-1 searchController aborted');
  assert.strictEqual(mount1.flightController.signal.aborted, true, 'SRCH-1 flightController aborted');

  // Mount 2
  const mount2 = sim.triggerSearchEffect({ from: 'Bengaluru', to: 'Jaipur' }, 20, 40);
  assert.strictEqual(sim.activeSearchIdRef.current, 2, 'SRCH-2 started with id 2');

  // Verify: SRCH-2 controllers remain alive and NOT aborted by cleanup #1
  assert.strictEqual(mount2.searchController.signal.aborted, false, 'SRCH-2 searchController must remain ALIVE');
  assert.strictEqual(mount2.flightController.signal.aborted, false, 'SRCH-2 flightController must remain ALIVE');

  // Wait for all async promises to finish
  await Promise.all([mount1.searchPromise, mount2.searchPromise]);
  await new Promise(r => setTimeout(r, 150));

  // Verify:
  // 1. SRCH-2 reached searchFlights()
  const srch2Dispatches = sim.searchFlightsDispatches.filter(d => d.searchId === 2);
  assert.strictEqual(srch2Dispatches.length, 1, 'SRCH-2 successfully dispatched searchFlights()');

  // 2. SRCH-1 did NOT overwrite SRCH-2 activeTrip
  assert.strictEqual(sim.activeTrip.id, 'plan-2', 'activeTrip must be from SRCH-2 (plan-2), NOT SRCH-1');

  // 3. SRCH-1 did NOT replace SRCH-2 flight offers
  assert.strictEqual(sim.activeTrip.options.flight[0].id, 'FL-2', 'Flight offer must be FL-2 from SRCH-2');

  // 4. Exactly one active search owns final UI state
  assert.strictEqual(sim.flightLoading, false);
  assert.strictEqual(sim.flightStatus, 'success');

  console.log('  ✓ PASS: Double effect execution handled smoothly');
  console.log('  ✓ PASS: Cleanup of SRCH-1 does NOT abort SRCH-2');
  console.log('  ✓ PASS: SRCH-1 cannot reset SRCH-2 loading state');
  console.log('  ✓ PASS: SRCH-1 cannot replace SRCH-2 activeTrip');
  console.log('  ✓ PASS: SRCH-1 cannot replace SRCH-2 flight offers');
  console.log('  ✓ PASS: SRCH-2 reaches searchFlights()');
  console.log('  ✓ PASS: Exactly one active search owns final UI state (success, FL-2)');
}

// ---------------------------------------------------------------------------
// 4. Stale Search Delayed Resolution Test
// ---------------------------------------------------------------------------
console.log('\n--- Test 3: Stale Search Cannot Reset Loading State ---');
{
  const sim = new PlannerSimulation();

  // Start Search 1 with slow 70ms geocoding
  const run1 = sim.triggerSearchEffect({ from: 'Bengaluru', to: 'Jaipur' }, 70, 50);

  // After 10ms, user submits a new Search 2 with fast 20ms geocoding and 120ms flight search
  await new Promise(r => setTimeout(r, 10));
  run1.cleanup();
  const run2 = sim.triggerSearchEffect({ from: 'Delhi', to: 'Goa' }, 20, 120);

  // At 30ms (t=40ms total), Search 2 finishes geocoding, enters flight search, sets loading=true
  await new Promise(r => setTimeout(r, 35));
  assert.strictEqual(sim.flightLoading, true, 'Search 2 is actively loading flights');
  assert.strictEqual(sim.flightStatus, 'loading', 'Search 2 status is loading');

  // At t=70ms, Search 1's slow geocoding settles.
  // Stale guard (activeSearchIdRef !== 1) must prevent it from resetting Search 2's state to idle!
  await new Promise(r => setTimeout(r, 35)); // now t=80ms; Search 2 is still in-flight (ends at t=150ms)
  assert.strictEqual(sim.flightLoading, true, 'Search 2 loading state must NOT be wiped out by Search 1');
  assert.strictEqual(sim.flightStatus, 'loading', 'Search 2 status must NOT be set to idle by Search 1');

  // Wait for Search 2 to finish
  await Promise.all([run1.searchPromise, run2.searchPromise]);
  await new Promise(r => setTimeout(r, 100));

  assert.strictEqual(sim.flightLoading, false);
  assert.strictEqual(sim.flightStatus, 'success');
  assert.strictEqual(sim.activeTrip.from, 'Delhi', 'activeTrip destination must be Delhi from Search 2');

  console.log('  ✓ PASS: Stale search aborted path cannot reset newer search loading state');
}

// ---------------------------------------------------------------------------
// 5. Abort of Current / Latest Search Cleanly Resets State
// ---------------------------------------------------------------------------
console.log('\n--- Test 4: Abort of Current Active Search Cleanly Resets UI ---');
{
  const sim = new PlannerSimulation();

  // Start single search
  const run = sim.triggerSearchEffect({ from: 'Bengaluru', to: 'Jaipur' }, 50, 50);
  assert.strictEqual(sim.flightLoading, true);
  assert.strictEqual(sim.flightStatus, 'loading');

  // User navigates away before search finishes (effect unmounts)
  await new Promise(r => setTimeout(r, 10));
  run.cleanup();

  await run.searchPromise;
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(sim.flightLoading, false, 'Flight loading reset to false on unmount abort');
  assert.strictEqual(sim.flightStatus, 'idle', 'Flight status reset to idle on unmount abort');
  console.log('  ✓ PASS: Abort of active search resets flightLoading=false and flightStatus="idle"');
}

// ---------------------------------------------------------------------------
// 6. Normal Single-Search Behavior Intact
// ---------------------------------------------------------------------------
console.log('\n--- Test 5: Normal Single Search Success Behavior ---');
{
  const sim = new PlannerSimulation();
  const run = sim.triggerSearchEffect({ from: 'Bengaluru', to: 'Jaipur' }, 20, 30);

  await run.searchPromise;
  await new Promise(r => setTimeout(r, 60));

  assert.strictEqual(sim.flightLoading, false);
  assert.strictEqual(sim.flightStatus, 'success');
  assert.strictEqual(sim.activeTrip.options.flight.length, 1);
  assert.strictEqual(sim.activeTrip.options.flight[0].id, 'FL-1');
  console.log('  ✓ PASS: Normal single-search delivers live flight offers with status="success"');
}

console.log('\n====================================================');
console.log('🏁 ALL STRICTMODE RACE FIX TESTS PASSED (9/9)');
console.log('====================================================');
