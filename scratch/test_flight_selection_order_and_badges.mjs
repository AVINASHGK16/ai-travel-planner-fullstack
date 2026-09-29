import assert from 'node:assert';

console.log('====================================================');
console.log('🧪 TESTING FLIGHT SELECTION ORDER & INDEPENDENT BADGES');
console.log('====================================================\n');

// 1. Mock calculateModeBudget
function calculateModeBudget(mode, costComponents) {
  return { mode, total: costComponents?.flightCost || 0 };
}

// 2. Updated mergeFlightOffersIntoTrip from PlannerPage.jsx
function mergeFlightOffersIntoTrip(trip, offers, selectedOffer = null) {
  if (!trip) return trip;
  const safeOffers = Array.isArray(offers) ? offers : [];
  const chosenOffer = selectedOffer || trip.selectedFlight || safeOffers[0] || null;
  const chosenPrice = typeof chosenOffer?.price === 'number' && chosenOffer.price > 0 ? chosenOffer.price : null;
  const validPricedOffer = safeOffers.find(f => typeof f?.price === 'number' && f.price > 0);
  const realFlightCost = chosenPrice !== null ? chosenPrice : (validPricedOffer ? validPricedOffer.price : trip.costComponents?.flightCost);
  const updatedCostComponents = trip.costComponents ? {
    ...trip.costComponents,
    flightCost: realFlightCost
  } : trip.costComponents;
  const updatedBudget = updatedCostComponents
    ? calculateModeBudget(trip.transportMode || 'flight', updatedCostComponents)
    : trip.budgetDetails;

  return {
    ...trip,
    selectedFlight: chosenOffer,
    costComponents: updatedCostComponents,
    budgetDetails: updatedBudget,
    options: {
      ...trip.options,
      flight: safeOffers
    }
  };
}

// 3. Helper for semantic badges (mirroring TravelOptions.jsx)
function getFlightBadges(flight, idx, flightList, activeFlightId) {
  const getFlightPrice = (f) => (typeof f.price === 'number' && f.price > 0 ? f.price : Infinity);
  const getDurationMinutes = (f) => f.durationMinutes || 0;

  const validPriced = flightList.filter(f => typeof f.price === 'number' && f.price > 0);
  const cheapestFlightId = validPriced.length > 0 
    ? [...validPriced].sort((a, b) => getFlightPrice(a) - getFlightPrice(b))[0]?.id 
    : null;
  const fastestFlightId = flightList.length > 0 
    ? [...flightList].sort((a, b) => getDurationMinutes(a) - getDurationMinutes(b))[0]?.id 
    : null;

  const hasValidPrice = typeof flight.price === 'number' && flight.price > 0;
  let recommendationBadge = null;

  if (hasValidPrice && flight.id === cheapestFlightId) {
    recommendationBadge = 'CHEAPEST';
  } else if (flight.id === fastestFlightId && flight.id !== cheapestFlightId) {
    recommendationBadge = 'FASTEST';
  } else if (idx === 0 && flight.id !== cheapestFlightId && flight.id !== fastestFlightId) {
    recommendationBadge = 'RECOMMENDED';
  } else if (hasValidPrice && idx === 1 && flight.id !== cheapestFlightId && flight.id !== fastestFlightId) {
    recommendationBadge = 'BEST VALUE';
  }

  const isSelected = activeFlightId ? activeFlightId === flight.id : idx === 0;

  const badges = [];
  if (recommendationBadge) badges.push(recommendationBadge);
  if (isSelected) badges.push('SELECTED');

  return { recommendationBadge, isSelected, badges };
}

// Setup initial 3 flights:
// Flight A: index 0, 1h 30m (FASTEST), price: ₹5,000
// Flight B: index 1, 2h 45m, price: ₹4,000 (BEST VALUE)
// Flight C: index 2, 4h 00m, price: ₹3,000 (CHEAPEST)
const initialFlights = [
  { id: 'FL-A', airline: 'Air India', flightNumber: 'AI 1706', price: 5000, durationMinutes: 90, duration: '1h 30m' },
  { id: 'FL-B', airline: 'IndiGo', flightNumber: '6E 2439', price: 4000, durationMinutes: 165, duration: '2h 45m' },
  { id: 'FL-C', airline: 'SpiceJet', flightNumber: 'SG 8811', price: 3000, durationMinutes: 240, duration: '4h 00m' }
];

let activeTrip = {
  from: 'Bengaluru',
  to: 'Goa',
  transportMode: 'flight',
  costComponents: { flightCost: 5000 },
  options: {
    flight: [...initialFlights]
  }
};

// Initial state (first flight is default selected)
activeTrip = mergeFlightOffersIntoTrip(activeTrip, activeTrip.options.flight);

console.log('--- Step 1: Initial Render ---');
{
  const list = activeTrip.options.flight;
  assert.strictEqual(list[0].id, 'FL-A');
  assert.strictEqual(list[1].id, 'FL-B');
  assert.strictEqual(list[2].id, 'FL-C');

  const metaA = getFlightBadges(list[0], 0, list, activeTrip.selectedFlight?.id);
  const metaB = getFlightBadges(list[1], 1, list, activeTrip.selectedFlight?.id);
  const metaC = getFlightBadges(list[2], 2, list, activeTrip.selectedFlight?.id);

  assert.deepStrictEqual(metaA.badges, ['FASTEST', 'SELECTED'], 'Flight A is FASTEST and SELECTED initially');
  assert.deepStrictEqual(metaB.badges, ['BEST VALUE'], 'Flight B is BEST VALUE');
  assert.deepStrictEqual(metaC.badges, ['CHEAPEST'], 'Flight C is CHEAPEST');
  console.log('  ✓ PASS: Flight A is FASTEST + SELECTED, Flight B is BEST VALUE, Flight C is CHEAPEST');
}

console.log('\n--- Step 2: User Selects Flight B ---');
{
  // User selects Flight B
  const selectedOffer = activeTrip.options.flight[1];
  const existingOffers = activeTrip.options.flight;
  activeTrip = mergeFlightOffersIntoTrip(activeTrip, existingOffers, selectedOffer);

  const list = activeTrip.options.flight;
  // Verify positions NEVER changed:
  assert.strictEqual(list[0].id, 'FL-A', 'Position 1 must remain Flight A');
  assert.strictEqual(list[1].id, 'FL-B', 'Position 2 must remain Flight B');
  assert.strictEqual(list[2].id, 'FL-C', 'Position 3 must remain Flight C');
  console.log('  ✓ PASS: Cards never change position ([FL-A, FL-B, FL-C])');

  // Verify badges:
  const metaA = getFlightBadges(list[0], 0, list, activeTrip.selectedFlight?.id);
  const metaB = getFlightBadges(list[1], 1, list, activeTrip.selectedFlight?.id);
  const metaC = getFlightBadges(list[2], 2, list, activeTrip.selectedFlight?.id);

  assert.deepStrictEqual(metaA.badges, ['FASTEST'], 'Flight A retains FASTEST and lost SELECTED');
  assert.deepStrictEqual(metaB.badges, ['BEST VALUE', 'SELECTED'], 'Flight B displays both BEST VALUE and SELECTED');
  assert.deepStrictEqual(metaC.badges, ['CHEAPEST'], 'Flight C retains CHEAPEST');

  assert.strictEqual(metaA.isSelected, false, 'Flight A is not selected');
  assert.strictEqual(metaB.isSelected, true, 'Flight B is selected');
  assert.strictEqual(metaC.isSelected, false, 'Flight C is not selected');
  console.log('  ✓ PASS: Selected state moved to Flight B');
  console.log('  ✓ PASS: Flight B is NOT FASTEST (retains BEST VALUE + SELECTED)');
}

console.log('\n--- Step 3: User Selects Flight C ---');
{
  // User selects Flight C
  const selectedOffer = activeTrip.options.flight[2];
  const existingOffers = activeTrip.options.flight;
  activeTrip = mergeFlightOffersIntoTrip(activeTrip, existingOffers, selectedOffer);

  const list = activeTrip.options.flight;
  // Verify positions STILL NEVER changed:
  assert.strictEqual(list[0].id, 'FL-A', 'Position 1 must remain Flight A');
  assert.strictEqual(list[1].id, 'FL-B', 'Position 2 must remain Flight B');
  assert.strictEqual(list[2].id, 'FL-C', 'Position 3 must remain Flight C');
  console.log('  ✓ PASS: Cards never change position ([FL-A, FL-B, FL-C])');

  // Verify badges:
  const metaA = getFlightBadges(list[0], 0, list, activeTrip.selectedFlight?.id);
  const metaB = getFlightBadges(list[1], 1, list, activeTrip.selectedFlight?.id);
  const metaC = getFlightBadges(list[2], 2, list, activeTrip.selectedFlight?.id);

  assert.deepStrictEqual(metaA.badges, ['FASTEST']);
  assert.deepStrictEqual(metaB.badges, ['BEST VALUE']);
  assert.deepStrictEqual(metaC.badges, ['CHEAPEST', 'SELECTED'], 'Flight C displays CHEAPEST and SELECTED');

  assert.strictEqual(metaA.isSelected, false);
  assert.strictEqual(metaB.isSelected, false);
  assert.strictEqual(metaC.isSelected, true);
  console.log('  ✓ PASS: Selected state moved to Flight C');
  console.log('  ✓ PASS: Flight C displays CHEAPEST + SELECTED');
}

console.log('\n--- Step 4: Budget Updated to Selected Flight ---');
{
  assert.strictEqual(activeTrip.costComponents.flightCost, 3000, 'Cost updated to Flight C price (3000)');
  assert.strictEqual(activeTrip.selectedFlight.id, 'FL-C', 'selectedFlight is Flight C');
  console.log('  ✓ PASS: activeTrip cost reflects selected flight');
}

console.log('\n====================================================');
console.log('🏁 ALL SELECTION ORDER TESTS PASSED');
console.log('====================================================');
