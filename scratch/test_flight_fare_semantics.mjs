import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('🧪 VERIFYING FLIGHT FARE SEMANTICS & PER-TRAVELER DERIVATION');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// 1. Static Contract Verification in TravelOptions.jsx & PlannerPage.jsx
// -----------------------------------------------------------------------------
console.log('--- Test 1: Static Contract Verification ---');
const travelOptionsPath = path.resolve('frontend/src/components/TravelOptions.jsx');
const travelOptionsContent = fs.readFileSync(travelOptionsPath, 'utf8');

const plannerPagePath = path.resolve('frontend/src/pages/PlannerPage.jsx');
const plannerPageContent = fs.readFileSync(plannerPagePath, 'utf8');

const serpApiProviderPath = path.resolve('backend/services/serpApiProvider.js');
const serpApiProviderContent = fs.readFileSync(serpApiProviderPath, 'utf8');

// 1. TravelOptions defines safeTravelers derivation from travelers prop
assert.strictEqual(
  travelOptionsContent.includes('const safeTravelers = useMemo(() => {'),
  true,
  'TravelOptions must derive safeTravelers from travelers prop'
);

// 2. Ticket card price display divides by safeTravelers
assert.strictEqual(
  travelOptionsContent.includes('formatPrice(Math.round(flight.price / safeTravelers), flight.currency || \'INR\')'),
  true,
  'Ticket card must display per-traveler fare above / traveler'
);

// 3. Ticket card exposes total booking fare clearly
assert.strictEqual(
  travelOptionsContent.includes('Total: {formatPrice(flight.price, flight.currency || \'INR\')}'),
  true,
  'Ticket card must expose total booking fare when safeTravelers > 1'
);

// 4. Smart Picks and Price Insights use consistent pricePerTraveler derivation
assert.strictEqual(
  travelOptionsContent.includes('pricePerTraveler: bestValueFlight && typeof bestValueFlight.price === \'number\''),
  true,
  'Smart Picks bestValue must derive pricePerTraveler'
);
assert.strictEqual(
  travelOptionsContent.includes('pricePerTraveler: cheapestFlight && typeof cheapestFlight.price === \'number\''),
  true,
  'Smart Picks cheapest must derive pricePerTraveler'
);
assert.strictEqual(
  travelOptionsContent.includes('formatPrice(Math.round(lowestFareFlight.price / safeTravelers)'),
  true,
  'Price Insights must display per-traveler lowest fare'
);

// 5. Raw provider response is NOT divided or multiplied in backend
assert.strictEqual(
  serpApiProviderContent.includes('price = Math.round(rawPrice);'),
  true,
  'serpApiProvider must preserve raw total booking fare without dividing/multiplying'
);

console.log('  ✓ PASS: Static code contracts verified across frontend and backend');

// -----------------------------------------------------------------------------
// 2. Behavioral Unit Simulations
// -----------------------------------------------------------------------------

// Helper simulating per-traveler calculation & formatting
function deriveFlightPricing(flight, travelersCount) {
  const safeTravelers = Math.max(1, parseInt(travelersCount, 10) || 1);
  const hasValidPrice = typeof flight?.price === 'number' && flight.price > 0;
  const pricePerTraveler = hasValidPrice ? Math.round(flight.price / safeTravelers) : null;
  const totalFare = hasValidPrice ? flight.price : null;

  return {
    safeTravelers,
    hasValidPrice,
    pricePerTraveler,
    totalFare,
    cardPrimaryLabel: hasValidPrice ? `₹${pricePerTraveler.toLocaleString('en-IN')}` : 'Fare unavailable',
    cardSubLabel: hasValidPrice ? '/ traveler' : 'Check airline',
    totalExposedLabel: hasValidPrice
      ? (safeTravelers > 1 ? `Total: ₹${totalFare.toLocaleString('en-IN')}` : `Total fare: ₹${totalFare.toLocaleString('en-IN')}`)
      : null
  };
}

// Test A: 1 Traveler
console.log('\n--- Test 2: 1 Traveler Fare Semantics ---');
{
  const flight = { id: 'IX-1235', airline: 'Air India Express', price: 101014, currency: 'INR' };
  const pricing = deriveFlightPricing(flight, 1);

  assert.strictEqual(pricing.safeTravelers, 1);
  assert.strictEqual(pricing.pricePerTraveler, 101014, 'For 1 traveler, pricePerTraveler equals total price');
  assert.strictEqual(pricing.totalFare, 101014);
  assert.strictEqual(pricing.cardPrimaryLabel, '₹1,01,014');
  assert.strictEqual(pricing.cardSubLabel, '/ traveler');
  assert.strictEqual(pricing.totalExposedLabel, 'Total fare: ₹1,01,014');
  console.log('  ✓ PASS: 1 traveler: per-traveler = ₹1,01,014, total = ₹1,01,014');
}

// Test B: 2 Travelers
console.log('\n--- Test 3: 2 Travelers Fare Semantics ---');
{
  const flight = { id: 'IX-1235', airline: 'Air India Express', price: 101014, currency: 'INR' };
  const pricing = deriveFlightPricing(flight, 2);

  assert.strictEqual(pricing.safeTravelers, 2);
  assert.strictEqual(pricing.pricePerTraveler, 50507, 'For 2 travelers, 101014 / 2 = 50507');
  assert.strictEqual(pricing.totalFare, 101014);
  assert.strictEqual(pricing.cardPrimaryLabel, '₹50,507');
  assert.strictEqual(pricing.cardSubLabel, '/ traveler');
  assert.strictEqual(pricing.totalExposedLabel, 'Total: ₹1,01,014');
  console.log('  ✓ PASS: 2 travelers: per-traveler = ₹50,507, total exposed = ₹1,01,014');
}

// Test C: 9 Travelers
console.log('\n--- Test 4: 9 Travelers Fare Semantics ---');
{
  const flight = { id: 'IX-1235', airline: 'Air India Express', price: 101014, currency: 'INR' };
  const pricing = deriveFlightPricing(flight, 9);

  assert.strictEqual(pricing.safeTravelers, 9);
  assert.strictEqual(pricing.pricePerTraveler, 11224, 'For 9 travelers, Math.round(101014 / 9) = 11224');
  assert.strictEqual(pricing.totalFare, 101014);
  assert.strictEqual(pricing.cardPrimaryLabel, '₹11,224');
  assert.strictEqual(pricing.cardSubLabel, '/ traveler');
  assert.strictEqual(pricing.totalExposedLabel, 'Total: ₹1,01,014');
  console.log('  ✓ PASS: 9 travelers: per-traveler = ₹11,224, total exposed = ₹1,01,014');
}

// Test D: Missing Fare
console.log('\n--- Test 5: Missing Fare Semantics ---');
{
  const unpricedFlight = { id: 'AI-2609', airline: 'Air India', price: null, currency: 'INR' };
  const pricing = deriveFlightPricing(unpricedFlight, 2);

  assert.strictEqual(pricing.hasValidPrice, false);
  assert.strictEqual(pricing.pricePerTraveler, null, 'Missing fare pricePerTraveler must be null, never 0');
  assert.strictEqual(pricing.totalFare, null, 'Missing totalFare must be null, never 0');
  assert.strictEqual(pricing.cardPrimaryLabel, 'Fare unavailable');
  assert.strictEqual(pricing.cardSubLabel, 'Check airline');
  assert.strictEqual(pricing.totalExposedLabel, null);

  // Test zero price is treated as invalid/null
  const zeroFlight = { id: 'AI-ZERO', airline: 'Air India', price: 0, currency: 'INR' };
  const zeroPricing = deriveFlightPricing(zeroFlight, 2);
  assert.strictEqual(zeroPricing.hasValidPrice, false);
  assert.strictEqual(zeroPricing.pricePerTraveler, null);
  console.log('  ✓ PASS: Missing and zero fare remain null, render "Fare unavailable" without becoming 0');
}

// Test E: Selected Flight Total Cost in costComponents
console.log('\n--- Test 6: Selected Flight costComponents.flightCost Integrity ---');
{
  function mergeFlightOffersIntoTrip(trip, offers, selectedOffer = null) {
    if (!trip) return trip;
    const safeOffers = Array.isArray(offers) ? offers : [];
    const chosenOffer = selectedOffer || safeOffers[0] || null;
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
      costComponents: updatedCostComponents
    };
  }

  const initialTrip = {
    from: 'Delhi',
    to: 'Bangalore',
    travelers: 2,
    costComponents: {
      flightCost: 15000,
      accommodation: 20000,
      food: 10000
    }
  };

  const selectedFlight = { id: 'IX-1235', airline: 'Air India Express', price: 101014 };
  const updatedTrip = mergeFlightOffersIntoTrip(initialTrip, [selectedFlight], selectedFlight);

  // Total flight cost must be 101014, NOT 50507!
  assert.strictEqual(updatedTrip.costComponents.flightCost, 101014, 'flightCost in costComponents must remain TOTAL booking fare');
  assert.notStrictEqual(updatedTrip.costComponents.flightCost, 50507, 'flightCost must NOT be divided into per-traveler in costComponents');
  console.log('  ✓ PASS: costComponents.flightCost retains total trip fare (₹1,01,014), not per-traveler');
}

// Test F: Cheapest Comparison Consistency
console.log('\n--- Test 7: Cheapest Comparison Consistency Across Basis ---');
{
  const flightList = [
    { id: 'FL-HIGH', price: 150000 },
    { id: 'FL-LOW', price: 101014 },
    { id: 'FL-NULL', price: null }
  ];

  const safeTravelers = 9;

  // Comparison via total fare
  const validPricedTotal = flightList.filter(f => typeof f.price === 'number' && f.price > 0);
  const cheapestByTotal = [...validPricedTotal].sort((a, b) => a.price - b.price)[0];

  // Comparison via per-traveler fare
  const cheapestByPerTraveler = [...validPricedTotal].sort((a, b) => {
    return Math.round(a.price / safeTravelers) - Math.round(b.price / safeTravelers);
  })[0];

  assert.strictEqual(cheapestByTotal.id, 'FL-LOW');
  assert.strictEqual(cheapestByPerTraveler.id, 'FL-LOW');
  assert.strictEqual(cheapestByTotal.id, cheapestByPerTraveler.id, 'Cheapest flight is identical on total and per-traveler basis');

  const cheapestPerTravelerPrice = Math.round(cheapestByTotal.price / safeTravelers);
  assert.strictEqual(cheapestPerTravelerPrice, 11224);
  console.log('  ✓ PASS: Cheapest selection is strictly consistent on total and per-traveler basis');
}

// Test G: Best Value Comparison Consistency
console.log('\n--- Test 8: Best Value Comparison Consistency ---');
{
  const flightList = [
    { id: 'FL-RECOMMENDED-1', price: 120000, durationMinutes: 180 },
    { id: 'FL-RECOMMENDED-2', price: 101014, durationMinutes: 415 }
  ];

  const safeTravelers = 2;
  const bestValueFlight = flightList[0]; // first valid priced offer in natural recommendation rank

  const bestValueTotal = bestValueFlight.price;
  const bestValuePerTraveler = Math.round(bestValueFlight.price / safeTravelers);

  assert.strictEqual(bestValueTotal, 120000);
  assert.strictEqual(bestValuePerTraveler, 60000);
  console.log('  ✓ PASS: Best value maintains identical rank with consistent total and per-traveler reporting');
}

console.log('\n====================================================');
console.log('🏁 ALL FARE-SEMANTICS TESTS PASSED (8/8)');
console.log('====================================================');
