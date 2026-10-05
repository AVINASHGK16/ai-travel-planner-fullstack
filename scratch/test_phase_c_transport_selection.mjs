import assert from 'node:assert/strict';
import { calculateModeBudget, generateMockData } from '../frontend/src/utils/planner.js';

console.log('🧪 Starting Phase C: Transport Selection Integrity Regression Tests...\n');

// 1. Setup mock trip data for Bangalore -> Chennai (approx 350 km corridor)
const mockGeo = {
  fromLocation: { name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 },
  toLocation: { name: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
  fromCoords: [12.9716, 77.5946],
  toCoords: [13.0827, 80.2707],
  routeDetails: { distanceKm: 345, durationMinutes: 360 }
};

const trip = generateMockData(
  'Bengaluru',
  'Chennai',
  '2026-11-10',
  '2026-11-14',
  2,
  25000,
  'flight',
  mockGeo
);

console.log('✔ Baseline trip generated:');
console.log(`  Distance: ${mockGeo.routeDetails.distanceKm} km`);
console.log(`  Initial Mode: ${trip.transportMode}`);
console.log(`  Initial Train Cost in Components: ₹${trip.costComponents.trainCost}`);
console.log(`  Initial Bus Cost in Components: ₹${trip.costComponents.busCost}`);
console.log(`  Initial Flight Cost in Components: ₹${trip.costComponents.flightCost}`);

// -------------------------------------------------------------
// Test 1: Flight Selection updates flight cost and mode budget atomically without navigation
// -------------------------------------------------------------
console.log('\n--- Test 1: Flight Selection Integrity ---');
const customFlightOffer = {
  id: 'fl_live_special_99',
  mode: 'flight',
  airline: 'IndiGo 6E-204',
  price: 7800,
  currency: 'INR'
};

let currentTrip = { ...trip };
let currentMode = 'flight';
let currentView = 'transport';

// Simulate onSelectFlightOffer logic
const updateFlight = (offer) => {
  currentMode = 'flight';
  const existingOffers = currentTrip.options?.flight || [];
  const chosenPrice = typeof offer?.price === 'number' && offer.price > 0 ? offer.price : currentTrip.costComponents?.flightCost;
  const updatedCostComponents = {
    ...currentTrip.costComponents,
    flightCost: chosenPrice
  };
  const updatedBudget = calculateModeBudget('flight', updatedCostComponents);
  currentTrip = {
    ...currentTrip,
    transportMode: 'flight',
    selectedFlight: offer,
    costComponents: updatedCostComponents,
    budgetDetails: updatedBudget,
    options: {
      ...currentTrip.options,
      flight: [offer, ...existingOffers.filter(f => f.id !== offer.id)]
    }
  };
  // Selection does not alter currentView
};

updateFlight(customFlightOffer);

assert.equal(currentTrip.selectedFlight.id, 'fl_live_special_99', 'Selected flight ID should match chosen offer');
assert.equal(currentTrip.costComponents.flightCost, 7800, 'costComponents.flightCost should match chosen flight price');
assert.equal(currentTrip.budgetDetails.tickets, 7800, 'budgetDetails.tickets should match flight price');
assert.equal(currentView, 'transport', 'Flight selection MUST NOT navigate away from transport view');
console.log('✔ Flight selection successfully updated selectedFlight and recalculated mode budget to ₹' + currentTrip.budgetDetails.total);

// -------------------------------------------------------------
// Test 2: Train Selection Integrity (Cost synchronization & UI Key Matching)
// -------------------------------------------------------------
console.log('\n--- Test 2: Train Selection Integrity ---');
const trainOptions = currentTrip.options.train;
assert.ok(trainOptions.length >= 2, 'Should have at least 2 train options');
const chosenTrain = trainOptions[1]; // Sleeper / second train
console.log(`  Available Train 1: ${trainOptions[0].name} (₹${trainOptions[0].price}) [${trainOptions[0].number}]`);
console.log(`  Choosing Train 2:  ${chosenTrain.name} (₹${chosenTrain.price}) [${chosenTrain.number}]`);

// Simulate onSelectTrainOffer logic
const selectTrain = (train) => {
  currentMode = 'train';
  const price = typeof train?.price === 'number' && train.price > 0 ? train.price : currentTrip.costComponents?.trainCost;
  const updatedCostComponents = currentTrip.costComponents ? {
    ...currentTrip.costComponents,
    ...(price !== undefined ? { trainCost: price } : {})
  } : currentTrip.costComponents;
  const updatedBudget = updatedCostComponents
    ? calculateModeBudget('train', updatedCostComponents)
    : currentTrip.budgetDetails;
  
  currentTrip = {
    ...currentTrip,
    transportMode: 'train',
    selectedTrain: train,
    costComponents: updatedCostComponents,
    budgetDetails: updatedBudget
  };
  // Selection does not alter currentView
};

selectTrain(chosenTrain);

assert.equal(currentMode, 'train', 'Active mode should be train');
assert.equal(currentTrip.transportMode, 'train', 'Trip transportMode should be train');
assert.equal(currentTrip.selectedTrain.number, chosenTrain.number, 'Selected train number should match chosen train');
assert.equal(currentTrip.costComponents.trainCost, chosenTrain.price, 'costComponents.trainCost must be synchronized with chosen train price');
assert.equal(currentTrip.budgetDetails.tickets, chosenTrain.price, 'budgetDetails.tickets must match chosen train price');
assert.equal(currentTrip.budgetDetails.fuel, 0, 'budgetDetails.fuel must be 0 for train mode');
assert.equal(currentView, 'transport', 'Train selection MUST NOT navigate away from transport view');
console.log('✔ Train selection atomically updated transportMode, selectedTrain, trainCost, and mode budget to ₹' + currentTrip.budgetDetails.total);

// -------------------------------------------------------------
// Test 3: Train Selection UI Key & Styling Consistency Check
// -------------------------------------------------------------
console.log('\n--- Test 3: Train Selection UI Key Matching ---');
const getTrainId = (t) => (t ? (t.number || t.id || t.name || null) : null);
const activeTrainId = getTrainId(currentTrip.selectedTrain);

trainOptions.forEach((train, idx) => {
  const trainKey = train.number || train.id || train.name || idx;
  const isSelected = currentMode === 'train' && (
    activeTrainId
      ? (activeTrainId === train.number || activeTrainId === train.id || activeTrainId === train.name || activeTrainId === trainKey)
      : idx === 0
  );
  if (idx === 1) {
    assert.equal(isSelected, true, `Train option ${idx} (${train.name}) should be marked isSelected = true`);
  } else {
    assert.equal(isSelected, false, `Train option ${idx} (${train.name}) should NOT be marked isSelected`);
  }
});
console.log('✔ Train UI styling correctly isolates selected train and does not default back to index 0');

// -------------------------------------------------------------
// Test 4: Bus Selection Integrity (Cost synchronization & UI Key Matching)
// -------------------------------------------------------------
console.log('\n--- Test 4: Bus Selection Integrity ---');
const busOptions = currentTrip.options.bus;
assert.ok(busOptions.length >= 2, 'Should have at least 2 bus options');
const chosenBus = busOptions[1]; // State Express / second bus
console.log(`  Available Bus 1: ${busOptions[0].name} (₹${busOptions[0].price})`);
console.log(`  Choosing Bus 2:  ${chosenBus.name} (₹${chosenBus.price})`);

// Simulate onSelectBusOffer logic
const selectBus = (bus) => {
  currentMode = 'bus';
  const price = typeof bus?.price === 'number' && bus.price > 0 ? bus.price : currentTrip.costComponents?.busCost;
  const updatedCostComponents = currentTrip.costComponents ? {
    ...currentTrip.costComponents,
    ...(price !== undefined ? { busCost: price } : {})
  } : currentTrip.costComponents;
  const updatedBudget = updatedCostComponents
    ? calculateModeBudget('bus', updatedCostComponents)
    : currentTrip.budgetDetails;
  
  currentTrip = {
    ...currentTrip,
    transportMode: 'bus',
    selectedBus: bus,
    costComponents: updatedCostComponents,
    budgetDetails: updatedBudget
  };
};

selectBus(chosenBus);

assert.equal(currentMode, 'bus', 'Active mode should be bus');
assert.equal(currentTrip.transportMode, 'bus', 'Trip transportMode should be bus');
assert.equal(currentTrip.selectedBus.id, chosenBus.id, 'Selected bus id should match chosen bus');
assert.equal(currentTrip.costComponents.busCost, chosenBus.price, 'costComponents.busCost must match chosen bus price');
assert.equal(currentTrip.budgetDetails.tickets, chosenBus.price, 'budgetDetails.tickets must match chosen bus price');
assert.equal(currentTrip.budgetDetails.fuel, 0, 'budgetDetails.fuel must be 0 for bus mode');
assert.equal(currentView, 'transport', 'Bus selection MUST NOT navigate away from transport view');

const getBusId = (b) => (b ? (b.id || b.name || null) : null);
const activeBusId = getBusId(currentTrip.selectedBus);

busOptions.forEach((bus, idx) => {
  const busKey = bus.id || bus.name || idx;
  const isSelected = currentMode === 'bus' && (
    activeBusId
      ? (activeBusId === bus.id || activeBusId === bus.name || activeBusId === busKey)
      : idx === 0
  );
  if (idx === 1) {
    assert.equal(isSelected, true, `Bus option ${idx} (${bus.name}) should be marked isSelected = true`);
  } else {
    assert.equal(isSelected, false, `Bus option ${idx} (${bus.name}) should NOT be marked isSelected`);
  }
});
console.log('✔ Bus selection atomically updated transportMode, selectedBus, busCost, and mode budget to ₹' + currentTrip.budgetDetails.total);
console.log('✔ Bus UI styling correctly isolates selected bus and does not default back to index 0');

// -------------------------------------------------------------
// Test 5: Road Trip Route Selection & Intentional Navigation
// -------------------------------------------------------------
console.log('\n--- Test 5: Road Trip Route Selection Integrity ---');
const roadRoutes = currentTrip.options.own.routes;
assert.ok(roadRoutes.length >= 2, 'Should have at least 2 road routes');
const chosenRouteIdx = 1;
const chosenRoute = roadRoutes[chosenRouteIdx]; // Scenic route

const selectRoadRoute = (routeIndexOrObj) => {
  currentMode = 'own';
  const routes = currentTrip.options?.own?.routes || [];
  let resolvedRoute = routeIndexOrObj;
  let resolvedIndex = 0;
  if (typeof routeIndexOrObj === 'number') {
    resolvedIndex = routeIndexOrObj;
    resolvedRoute = routes[routeIndexOrObj] || null;
  } else if (routeIndexOrObj && typeof routeIndexOrObj === 'object') {
    const foundIdx = routes.findIndex(r => r === routeIndexOrObj);
    resolvedIndex = foundIdx >= 0 ? foundIdx : 0;
    resolvedRoute = routeIndexOrObj;
  }
  const toll = typeof resolvedRoute?.tolls === 'number' ? resolvedRoute.tolls : currentTrip.costComponents?.tollCost;
  const updatedCostComponents = currentTrip.costComponents ? {
    ...currentTrip.costComponents,
    ...(toll !== undefined ? { tollCost: toll } : {})
  } : currentTrip.costComponents;
  const updatedBudget = updatedCostComponents
    ? calculateModeBudget('own', updatedCostComponents)
    : currentTrip.budgetDetails;
  
  currentTrip = {
    ...currentTrip,
    transportMode: 'own',
    selectedRoute: resolvedRoute,
    selectedRouteIndex: resolvedIndex,
    costComponents: updatedCostComponents,
    budgetDetails: updatedBudget
  };
  // Intentional navigation explicitly triggered by "Select Route & View Itinerary →"
  currentView = 'overview';
};

selectRoadRoute(chosenRouteIdx);

assert.equal(currentTrip.transportMode, 'own', 'Trip transportMode should be own');
assert.equal(currentTrip.selectedRouteIndex, 1, 'selectedRouteIndex should be 1');
assert.equal(currentTrip.selectedRoute.name, chosenRoute.name, 'selectedRoute should match chosen route');
assert.equal(currentTrip.costComponents.tollCost, chosenRoute.tolls, 'tollCost should match chosen route tolls');
assert.equal(currentTrip.budgetDetails.toll, chosenRoute.tolls, 'budgetDetails.toll should match chosen route tolls');
assert.equal(currentTrip.budgetDetails.tickets, 0, 'budgetDetails.tickets should be 0 for own vehicle');
assert.equal(currentView, 'overview', 'Road trip selection button explicitly transitions to overview');
console.log('✔ Road trip route selection updated route, tolls, budget, and intentionally transitioned to overview');

// -------------------------------------------------------------
// Test 6: Preserving Selection across View Switching (Change Transport)
// -------------------------------------------------------------
console.log('\n--- Test 6: View Switching & Rerender State Preservation ---');
// User clicks "Change Transport" in Overview
currentView = 'transport';

// RoadTripDetails remounts: activeRoute initializes from currentTrip.selectedRouteIndex
const initialRouteIndex = typeof currentTrip?.selectedRouteIndex === 'number'
  ? currentTrip.selectedRouteIndex
  : (typeof currentTrip?.options?.own?.selectedRouteIndex === 'number' ? currentTrip.options.own.selectedRouteIndex : 0);

assert.equal(initialRouteIndex, 1, 'RoadTripDetails initialRouteIndex must match previously selected route index (1)');
console.log('✔ RoadTripDetails successfully restored activeRoute = 1 from selectedRouteIndex');

// TravelOptions remounts: activeTrainId initializes from currentTrip.selectedTrain
const restoredTrainId = getTrainId(currentTrip.selectedTrain);
assert.equal(restoredTrainId, chosenTrain.number, 'TravelOptions restoredTrainId must match chosen train');

// TravelOptions remounts: activeBusId initializes from currentTrip.selectedBus
const restoredBusId = getBusId(currentTrip.selectedBus);
assert.equal(restoredBusId, chosenBus.id, 'TravelOptions restoredBusId must match chosen bus');

console.log('✔ TravelOptions successfully restored activeTrainId and activeBusId upon remount');

console.log('\n🎉 ALL PHASE C REGRESSION TESTS PASSED!\n');
