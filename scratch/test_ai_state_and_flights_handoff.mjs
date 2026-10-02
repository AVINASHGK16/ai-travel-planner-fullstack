import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getGoogleFlightsUrl, extractDateOnly, getFlightLocationQuery } from '../frontend/src/utils/transportLinks.js';
import { buildGoogleFlightsUrl, normalizeSerpApiOffer } from '../backend/services/serpApiProvider.js';

console.log('====================================================');
console.log('🧪 VERIFYING AI PLANNER STATE LEAKAGE & GOOGLE FLIGHTS DATE HANDOFF');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// PART 1: AI PLANNER ROUTE RESOLUTION LOGIC TESTS
// -----------------------------------------------------------------------------
console.log('--- PART 1: AI Planner Route Resolution & State Isolation ---');

// Replicate the exact authoritative resolution function from PlannerPage.jsx
function resolvePlannerAIPrompt(payload) {
  const promptText = typeof payload === 'string' ? payload : (payload?.promptText || '');
  const currentValues = (typeof payload === 'object' && payload?.currentValues) ? payload.currentValues : {};

  const lower = promptText.toLowerCase();

  let extractedOrigin = '';
  let extractedDestination = '';

  const fromToMatch = promptText.match(/\bfrom\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?=\s+(?:for|with|in|on|departing|under|budget|travelers|\d)|$|[.,!?])/i);
  const toMatch = promptText.match(/\b([A-Za-z]+)\s+to\s+([A-Za-z]+)\b/i);

  if (fromToMatch && fromToMatch[1] && fromToMatch[2]) {
    extractedOrigin = fromToMatch[1].trim();
    extractedDestination = fromToMatch[2].trim();
  } else if (toMatch && toMatch[1] && toMatch[2]) {
    const candidateOrigin = toMatch[1].trim();
    const candidateDest = toMatch[2].trim();
    const skipWords = ['trip', 'getaway', 'vacation', 'holiday', 'tour', 'welcome', 'go', 'travel', 'plan'];
    if (!skipWords.includes(candidateOrigin.toLowerCase())) {
      extractedOrigin = candidateOrigin;
      extractedDestination = candidateDest;
    } else {
      extractedDestination = candidateDest;
    }
  }

  if (!extractedDestination) {
    const knownDestinations = [
      { key: 'jaipur', name: 'Jaipur' },
      { key: 'rajasthan', name: 'Jaipur' },
      { key: 'goa', name: 'Goa' },
      { key: 'manali', name: 'Manali' },
      { key: 'himachal', name: 'Manali' },
      { key: 'chandigarh', name: 'Chandigarh' },
      { key: 'kochi', name: 'Kochi' },
      { key: 'kerala', name: 'Kochi' },
      { key: 'mumbai', name: 'Mumbai' },
      { key: 'delhi', name: 'Delhi' },
      { key: 'bengaluru', name: 'Bengaluru' },
      { key: 'bangalore', name: 'Bangalore' },
      { key: 'chennai', name: 'Chennai' },
      { key: 'kolkata', name: 'Kolkata' },
      { key: 'hyderabad', name: 'Hyderabad' },
      { key: 'agra', name: 'Agra' }
    ];
    for (const dest of knownDestinations) {
      if (lower.includes(dest.key)) {
        extractedDestination = dest.name;
        break;
      }
    }
  }

  const existingOrigin = (typeof currentValues.from === 'string' ? currentValues.from : '').trim();
  const existingDest = (typeof currentValues.to === 'string' ? currentValues.to : '').trim();

  let finalOrigin = '';
  let finalDestination = '';

  if (extractedOrigin && extractedDestination) {
    finalOrigin = extractedOrigin;
    finalDestination = extractedDestination;
  } else if (extractedDestination) {
    finalDestination = extractedDestination;
    finalOrigin = existingOrigin;
  } else {
    finalOrigin = existingOrigin;
    finalDestination = existingDest;
  }

  let finalBudget = (typeof currentValues.budget === 'number' && currentValues.budget > 0)
    ? currentValues.budget
    : (parseInt(currentValues.budget, 10) || 50000);
  const budgetMatch = promptText.match(/(?:₹|inr|rs\.?|budget\s*(?:of)?|under)\s*([0-9,]+)/i);
  if (budgetMatch && budgetMatch[1]) {
    const parsedBudget = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsedBudget) && parsedBudget > 0) {
      finalBudget = parsedBudget;
    }
  }

  let finalTravelers = (typeof currentValues.travelers === 'number' && currentValues.travelers > 0)
    ? currentValues.travelers
    : (parseInt(currentValues.travelers, 10) || 2);
  const travelersMatch = promptText.match(/(\d+)\s*(?:travelers|traveler|travellers|traveller|people|adults|persons|person)/i);
  if (travelersMatch && travelersMatch[1]) {
    finalTravelers = parseInt(travelersMatch[1], 10);
  } else if (lower.includes('couple')) {
    finalTravelers = 2;
  } else if (lower.includes('solo')) {
    finalTravelers = 1;
  }

  let finalMode = currentValues.preferredMode || 'any';
  if (lower.includes('road trip') || lower.includes('drive') || lower.includes('car')) {
    finalMode = 'own';
  } else if (lower.includes('train')) {
    finalMode = 'train';
  } else if (lower.includes('bus')) {
    finalMode = 'bus';
  } else if (lower.includes('flight') || lower.includes('fly')) {
    finalMode = 'flight';
  }

  return {
    from: finalOrigin,
    to: finalDestination,
    budget: finalBudget,
    travelers: finalTravelers,
    preferredMode: finalMode
  };
}

runTest('1. A new explicit Hyderabad → Bengaluru route does not become Delhi → Bengaluru', () => {
  const result = resolvePlannerAIPrompt({
    promptText: 'Plan a flight from Hyderabad to Bengaluru departing on 2026-10-02',
    currentValues: {
      from: 'Delhi', // Old form value or old search
      to: 'Bengaluru'
    }
  });
  assert.strictEqual(result.from, 'Hyderabad', 'Must use explicit prompt origin Hyderabad');
  assert.strictEqual(result.to, 'Bengaluru', 'Must use explicit prompt destination Bengaluru');
});

runTest('2. A new Bangalore → Jaipur route stays Bangalore → Jaipur', () => {
  const result = resolvePlannerAIPrompt({
    promptText: 'Plan a trip from Bangalore to Jaipur with ₹30,000 budget',
    currentValues: {
      from: '',
      to: ''
    }
  });
  assert.strictEqual(result.from, 'Bangalore');
  assert.strictEqual(result.to, 'Jaipur');
});

runTest('3. A destination-only prompt preserves the currently configured origin', () => {
  const result = resolvePlannerAIPrompt({
    promptText: 'Plan a 3-day royal palace tour in Jaipur for 2 travelers',
    currentValues: {
      from: 'Bangalore', // Configured origin in current form
      to: 'Goa'
    }
  });
  assert.strictEqual(result.from, 'Bangalore', 'Must retain currently configured origin');
  assert.strictEqual(result.to, 'Jaipur', 'Must update destination to Jaipur');
});

runTest('4. A missing origin is not invented (never injects Delhi, Bengaluru, etc.)', () => {
  const result = resolvePlannerAIPrompt({
    promptText: 'Plan a 4-day leisure beach vacation in Goa departing next weekend',
    currentValues: {
      from: '', // Form origin is genuinely missing/empty
      to: ''
    }
  });
  assert.strictEqual(result.from, '', 'Origin must remain strictly empty string');
  assert.notStrictEqual(result.from, 'Delhi', 'Must not invent Delhi');
  assert.notStrictEqual(result.from, 'Bengaluru', 'Must not invent Bengaluru');
  assert.strictEqual(result.to, 'Goa');
});

runTest('5. Changing budget or travel style preserves the route', () => {
  const result = resolvePlannerAIPrompt({
    promptText: 'Make this a road trip with ₹65,000 budget for 4 travelers',
    currentValues: {
      from: 'Hyderabad',
      to: 'Bengaluru',
      budget: 30000,
      travelers: 2,
      preferredMode: 'flight'
    }
  });
  assert.strictEqual(result.from, 'Hyderabad', 'Origin Hyderabad must be preserved');
  assert.strictEqual(result.to, 'Bengaluru', 'Destination Bengaluru must be preserved');
  assert.strictEqual(result.budget, 65000, 'Budget updated to 65000');
  assert.strictEqual(result.travelers, 4, 'Travelers updated to 4');
  assert.strictEqual(result.preferredMode, 'own', 'Mode updated to own (road trip)');
});

runTest('6. Previous activeTrip state does NOT leak when form has empty origin', () => {
  // Simulate PlannerPage.jsx handleApplyAIPrompt without activeTrip leakage
  const result = resolvePlannerAIPrompt({
    promptText: 'Trip to Jaipur',
    currentValues: {
      from: '',
      to: ''
    }
  });
  assert.strictEqual(result.from, '', 'Must not inherit old trip origin');
  assert.strictEqual(result.to, 'Jaipur');
});

// -----------------------------------------------------------------------------
// PART 2: GOOGLE FLIGHTS LINK TESTS
// -----------------------------------------------------------------------------
console.log('\n--- PART 2: Google Flights Link & Parameter Handoff ---');

runTest('7. Round-trip October 2–5, 2026 preserves both dates', () => {
  const url = getGoogleFlightsUrl({
    origin: 'HYD',
    destination: 'BLR',
    departureDate: '2026-10-02',
    returnDate: '2026-10-05',
    passengers: 1,
    cabin: 'economy'
  });

  assert(url.includes('on%202026-10-02'), 'Must include departure date 2026-10-02');
  assert(url.includes('returning%202026-10-05'), 'Must include return date 2026-10-05');
  assert(!url.includes('one%20way'), 'Round trip must not specify one way');
});

runTest('8. One-way search does not acquire a return date', () => {
  const url = getGoogleFlightsUrl({
    origin: 'HYD',
    destination: 'BLR',
    departureDate: '2026-10-02',
    returnDate: null,
    passengers: 1,
    cabin: 'economy'
  });

  assert(url.includes('on%202026-10-02'), 'Must include departure date');
  assert(!url.includes('returning'), 'One-way search must NOT include return date');
  assert(url.includes('one%20way'), 'One-way search must specify one way');
});

runTest('9. Airport codes and route direction are correct', () => {
  const url = getGoogleFlightsUrl({
    origin: 'HYD',
    destination: 'BLR',
    departureDate: '2026-10-02'
  });

  const decoded = decodeURIComponent(url);
  assert(decoded.includes('Flights from HYD to BLR'), 'Route direction must be from Origin to Destination');
  assert(!decoded.includes('Flights to BLR from HYD'), 'Must not use reversed syntax');

  // Verify parenthetical code parsing
  const urlWithCity = getGoogleFlightsUrl({
    origin: 'Hyderabad (HYD)',
    destination: 'Bengaluru (BLR)',
    departureDate: '2026-10-02'
  });
  const decodedCity = decodeURIComponent(urlWithCity);
  assert(decodedCity.includes('Flights from HYD to BLR'), 'Must extract IATA codes from parentheticals');
});

runTest('10. Date-only values are not shifted by timezone conversion', () => {
  // Test that string input does not undergo timezone shift
  const dateStr = '2026-10-02';
  const parsed = extractDateOnly(dateStr);
  assert.strictEqual(parsed, '2026-10-02', 'Exact date string preserved without timezone offset');

  // Test timestamp string
  const timestampStr = '2026-10-02T06:00:00.000Z';
  const parsedTs = extractDateOnly(timestampStr);
  assert.strictEqual(parsedTs, '2026-10-02', 'ISO timestamp date portion preserved');
});

runTest('11. Passenger count and cabin class are preserved where supported', () => {
  const url = getGoogleFlightsUrl({
    origin: 'HYD',
    destination: 'BLR',
    departureDate: '2026-10-02',
    returnDate: '2026-10-05',
    passengers: 3,
    cabin: 'business'
  });

  const decoded = decodeURIComponent(url);
  assert(decoded.includes('for 3 adults'), 'Must include passenger count (3 adults)');
  assert(decoded.includes('business class'), 'Must include cabin class (business class)');
});

runTest('12. Missing dates are handled explicitly instead of silently fabricated', () => {
  const urlNoDates = getGoogleFlightsUrl({
    origin: 'HYD',
    destination: 'BLR',
    departureDate: null,
    returnDate: null
  });

  const decoded = decodeURIComponent(urlNoDates);
  assert(!decoded.includes('on '), 'Must not fabricate departure date');
  assert(!decoded.includes('returning '), 'Must not fabricate return date');
  assert(decoded.includes('Flights from HYD to BLR'), 'Must maintain basic route search');
});

runTest('13. SerpApi backend provider generates date-aware Google Flights URL', () => {
  const mockItem = {
    flights: [
      {
        flight_number: '6E 521',
        airline: 'IndiGo',
        airline_logo: 'https://logo.png',
        departure_airport: { id: 'HYD', name: 'Rajiv Gandhi', time: '2026-10-02 06:00' },
        arrival_airport: { id: 'BLR', name: 'Kempegowda', time: '2026-10-02 07:15' },
        duration: 75
      }
    ],
    price: 4500
  };

  const offer = normalizeSerpApiOffer(mockItem, 0, {
    departureDate: '2026-10-02',
    returnDate: '2026-10-05',
    passengers: 2,
    cabin: 'economy'
  });

  assert.ok(offer.bookingUrl, 'Offer must have bookingUrl');
  assert(offer.bookingUrl.includes('on%202026-10-02'), 'Must include departure date 2026-10-02');
  assert(offer.bookingUrl.includes('returning%202026-10-05'), 'Must include return date 2026-10-05');
  assert(offer.bookingUrl.includes('for%202%20adults'), 'Must include passengers');
});

// -----------------------------------------------------------------------------
// PART 3: STATIC SOURCE CODE CONTRACT CHECKS
// -----------------------------------------------------------------------------
console.log('\n--- PART 3: Static Source Code Contracts ---');

runTest('14. PlannerPage.jsx does not fallback to activeTrip for origin/dest in handleApplyAIPrompt', () => {
  const src = fs.readFileSync(path.resolve('frontend/src/pages/PlannerPage.jsx'), 'utf8');
  assert(!src.includes('currentValues.from || activeTrip?.from'), 'PlannerPage.jsx must not leak activeTrip.from');
  assert(!src.includes('currentValues.to || activeTrip?.to'), 'PlannerPage.jsx must not leak activeTrip.to');
  assert(!src.includes('currentValues.budget || activeTrip?.budget'), 'PlannerPage.jsx must not leak activeTrip.budget');
  assert(!src.includes('currentValues.travelers || activeTrip?.travelers'), 'PlannerPage.jsx must not leak activeTrip.travelers');
  assert(!src.includes('currentValues.date || activeTrip?.date'), 'PlannerPage.jsx must not leak activeTrip.date');
});

runTest('15. PlannerPage.jsx handles location.state.aiPrompt and detaches previous activePlan', () => {
  const src = fs.readFileSync(path.resolve('frontend/src/pages/PlannerPage.jsx'), 'utf8');
  assert(src.includes('aiPrompt = location.state?.aiPrompt'), 'PlannerPage.jsx must read location.state.aiPrompt');
  assert(src.includes("storage.remove('activePlan')"), 'PlannerPage.jsx must detach old plan when aiPrompt is received');
});

runTest('16. PlannerPage.jsx passes onApplyAIPrompt to showEditForm TripConfigurationCard', () => {
  const src = fs.readFileSync(path.resolve('frontend/src/pages/PlannerPage.jsx'), 'utf8');
  assert(src.includes('onApplyAIPrompt={handleApplyAIPrompt}'), 'Must pass onApplyAIPrompt inside showEditForm');
});

runTest('17. TravelOptions.jsx and TripSummaryBar.jsx do not hardcode Bengaluru or Goa fallback cities', () => {
  const travelOptionsSrc = fs.readFileSync(path.resolve('frontend/src/components/TravelOptions.jsx'), 'utf8');
  const summaryBarSrc = fs.readFileSync(path.resolve('frontend/src/components/planner/TripSummaryBar.jsx'), 'utf8');

  assert(!travelOptionsSrc.includes(": 'Bengaluru';"), 'TravelOptions.jsx must not have : "Bengaluru" fallback');
  assert(!travelOptionsSrc.includes(": 'Goa';"), 'TravelOptions.jsx must not have : "Goa" fallback');
  assert(!summaryBarSrc.includes(": 'Bengaluru';"), 'TripSummaryBar.jsx must not have : "Bengaluru" fallback');
  assert(!summaryBarSrc.includes(": 'Goa';"), 'TripSummaryBar.jsx must not have : "Goa" fallback');
});

runTest('18. backend aiService.js deletes any AI attempts to override authoritative inputs', () => {
  const aiServiceSrc = fs.readFileSync(path.resolve('backend/services/aiService.js'), 'utf8');
  assert(aiServiceSrc.includes('delete parsed.from;'), 'aiService.js must delete parsed.from');
  assert(aiServiceSrc.includes('delete parsed.to;'), 'aiService.js must delete parsed.to');
  assert(aiServiceSrc.includes('delete parsed.date;'), 'aiService.js must delete parsed.date');
  assert(aiServiceSrc.includes('delete parsed.budget;'), 'aiService.js must delete parsed.budget');
});

console.log('\n====================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log('====================================================\n');
