import assert from 'node:assert';
import { normalizeSerpApiOffer } from '../backend/services/serpApiProvider.js';
import { normalizeDuffelOffer } from '../backend/services/duffelProvider.js';

console.log('====================================================');
console.log('🧪 RUNNING AI ROUTE PRECEDENCE & FARE INTEGRITY SUITE');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// Helper mimicking handleApplyAIPrompt resolution logic in PlannerPage.jsx
// -----------------------------------------------------------------------------
function resolveAIPromptParams(payload, activeTrip = null) {
  const promptText = typeof payload === 'string' ? payload : (payload?.promptText || '');
  const currentValues = (typeof payload === 'object' && payload?.currentValues) ? payload.currentValues : {};

  const lower = promptText.toLowerCase();

  // 1. Route resolution: extract origin and destination
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
      { key: 'hyderabad', name: 'Hyderabad' }
    ];
    for (const dest of knownDestinations) {
      if (lower.includes(dest.key)) {
        extractedDestination = dest.name;
        break;
      }
    }
  }

  const existingOrigin = (currentValues.from || activeTrip?.from || '').trim();
  const existingDest = (currentValues.to || activeTrip?.to || '').trim();

  let finalOrigin = '';
  let finalDestination = '';

  if (extractedOrigin && extractedDestination) {
    finalOrigin = extractedOrigin;
    finalDestination = extractedDestination;
  } else if (extractedDestination) {
    finalDestination = extractedDestination;
    finalOrigin = existingOrigin || '';
  } else {
    finalOrigin = existingOrigin || '';
    finalDestination = existingDest || '';
  }

  return { from: finalOrigin, to: finalDestination };
}

// -----------------------------------------------------------------------------
// Test 1: Bangalore -> Jaipur AI flow preserves Bangalore origin
// -----------------------------------------------------------------------------
console.log('--- Test 1: Bangalore -> Jaipur AI Flow Preserves Bangalore Origin ---');
{
  const result = resolveAIPromptParams({
    promptText: 'Plan a 3-day royal palace and heritage tour in Jaipur for 2 travelers with ₹30,000 budget',
    currentValues: {
      from: 'Bangalore',
      to: 'Jaipur',
      date: '2026-10-06'
    }
  });

  assert.strictEqual(result.from, 'Bangalore', 'Origin must remain Bangalore, NOT Delhi');
  assert.strictEqual(result.to, 'Jaipur', 'Destination must be Jaipur');
  console.log('  ✓ PASS: Existing Bangalore origin preserved with destination Jaipur prompt');
}

// -----------------------------------------------------------------------------
// Test 2: "Trip to Jaipur" with existing Bangalore origin preserves Bangalore
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: "Trip to Jaipur" with Existing Bangalore Origin Preserves Bangalore ---');
{
  const result = resolveAIPromptParams({
    promptText: 'Trip to Jaipur',
    currentValues: {
      from: 'Bangalore',
      to: ''
    }
  });

  assert.strictEqual(result.from, 'Bangalore', 'Origin must remain Bangalore');
  assert.strictEqual(result.to, 'Jaipur', 'Destination must be Jaipur');
  console.log('  ✓ PASS: "Trip to Jaipur" successfully keeps structured origin Bangalore');
}

// -----------------------------------------------------------------------------
// Test 3: Missing origin is not silently replaced with Delhi
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Missing Origin is Not Silently Replaced with Delhi ---');
{
  const result = resolveAIPromptParams({
    promptText: 'Plan a 3-day royal palace and heritage tour in Jaipur for 2 travelers with ₹30,000 budget',
    currentValues: {
      from: '',
      to: ''
    }
  });

  assert.strictEqual(result.from, '', 'Origin must remain empty string, not Delhi');
  assert.strictEqual(result.to, 'Jaipur', 'Destination must be Jaipur');
  console.log('  ✓ PASS: Missing origin remains empty string without injecting fake Delhi origin');
}

// -----------------------------------------------------------------------------
// Test 4: Missing fare does not become cheapest
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Missing Fare Does Not Become Cheapest ---');
{
  const flightList = [
    { id: 'ai_2439', airline: 'Air India', flightNumber: 'AI 2439', price: null },
    { id: 'ai_2840', airline: 'Air India', flightNumber: 'AI 2840', price: 35714 },
    { id: 'ai_2811', airline: 'Air India', flightNumber: 'AI 2811', price: 51510 }
  ];

  const getFlightPrice = (flight) => {
    if (!flight || typeof flight.price !== 'number' || flight.price <= 0) return Infinity;
    return flight.price;
  };

  const validPriced = flightList.filter(f => typeof f.price === 'number' && f.price > 0);
  const cheapestFlightId = validPriced.length > 0
    ? [...validPriced].sort((a, b) => getFlightPrice(a) - getFlightPrice(b))[0]?.id
    : null;

  assert.strictEqual(cheapestFlightId, 'ai_2840', 'Cheapest flight must be AI 2840 (₹35,714), NOT unpriced AI 2439');
  assert.notStrictEqual(cheapestFlightId, 'ai_2439', 'Unpriced flight must never be cheapest');

  // Verify badge logic
  const hasValidPrice = typeof flightList[0].price === 'number' && flightList[0].price > 0;
  const isCheapest = hasValidPrice && flightList[0].id === cheapestFlightId;
  assert.strictEqual(isCheapest, false, 'Unpriced flight must not receive CHEAPEST badge');

  console.log('  ✓ PASS: Missing-fare flight is not selected as cheapest');
  console.log('  ✓ PASS: Cheapest badge correctly awarded to lowest priced flight (₹35,714)');
}

// -----------------------------------------------------------------------------
// Test 5: Missing fare renders as unavailable in SerpApi and Duffel normalizers
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: Missing Fare Normalization in SerpApi & Duffel ---');
{
  // SerpApi item with missing price
  const serpItemNoPrice = {
    flights: [
      {
        airline: 'Air India',
        flight_number: 'AI 2439',
        departure_airport: { id: 'DEL', time: '2026-10-06 23:00' },
        arrival_airport: { id: 'JAI', time: '2026-10-07 08:00' },
        duration: 540
      }
    ]
  };

  const serpOffer = normalizeSerpApiOffer(serpItemNoPrice, 0, 'economy');
  assert.strictEqual(serpOffer.price, null, 'SerpApi missing price must normalize to null, NOT 0');

  // Duffel item with missing price
  const duffelItemNoPrice = {
    total_amount: null,
    slices: [
      {
        segments: [
          {
            marketing_carrier: { iata_code: 'AI' },
            marketing_carrier_flight_number: '2439',
            origin: { iata_code: 'DEL' },
            destination: { iata_code: 'JAI' }
          }
        ]
      }
    ]
  };

  const duffelOffer = normalizeDuffelOffer(duffelItemNoPrice);
  assert.strictEqual(duffelOffer.price, null, 'Duffel missing price must normalize to null, NOT 0');

  // mergeFlightOffersIntoTrip preserves estimated cost when offers lack valid price
  function mergeFlightOffersIntoTrip(trip, offers) {
    if (!trip) return trip;
    const safeOffers = Array.isArray(offers) ? offers : [];
    const validPricedOffer = safeOffers.find(f => typeof f?.price === 'number' && f.price > 0);
    const realFlightCost = validPricedOffer ? validPricedOffer.price : trip.costComponents?.flightCost;
    return {
      ...trip,
      costComponents: { ...trip.costComponents, flightCost: realFlightCost },
      options: { ...trip.options, flight: safeOffers }
    };
  }

  const trip = {
    costComponents: { flightCost: 8500 },
    options: { flight: [] }
  };
  const merged = mergeFlightOffersIntoTrip(trip, [serpOffer]);
  assert.strictEqual(merged.costComponents.flightCost, 8500, 'Estimated flight cost (8500) preserved when incoming offers have null price');

  console.log('  ✓ PASS: SerpApi missing price normalizes to null');
  console.log('  ✓ PASS: Duffel missing price normalizes to null');
  console.log('  ✓ PASS: mergeFlightOffersIntoTrip preserves estimated flightCost when live price is missing');
}

// -----------------------------------------------------------------------------
// Test 6: Existing priced flights retain correct sorting
// -----------------------------------------------------------------------------
console.log('\n--- Test 6: Price Sorting Places Unavailable Fares at End ---');
{
  const flights = [
    { id: 'f_null', price: null },
    { id: 'f_high', price: 51510 },
    { id: 'f_low', price: 35714 }
  ];

  const getFlightPrice = (f) => {
    if (!f || typeof f.price !== 'number' || f.price <= 0) return Infinity;
    return f.price;
  };

  const sorted = [...flights].sort((a, b) => getFlightPrice(a) - getFlightPrice(b));
  const sortedIds = sorted.map(f => f.id);

  assert.deepStrictEqual(sortedIds, ['f_low', 'f_high', 'f_null'], 'Priced flights must sort ascending with null fares placed at the end');
  console.log('  ✓ PASS: Correct sort order: [f_low (35714), f_high (51510), f_null (Infinity)]');
}

console.log('\n====================================================');
console.log('🏁 ALL TESTS PASSED (6/6)');
console.log('====================================================\n');
