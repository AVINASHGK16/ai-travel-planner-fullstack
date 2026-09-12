// AI Travel Planner Utility for Data Generation, Transport Domain & Mode-Aware Budgets
import { generateTrip, generateTripPlan, sendChatMessage } from '../services/aiService.js';
import { KNOWN_CITIES, geocodeCity, calculateRoute, calculateHaversine, isValidCoords, normalizeKey } from '../services/geoService.js';

// Re-export verified cities database
export const cityCoordinates = Object.fromEntries(
  Object.entries(KNOWN_CITIES).map(([k, v]) => [k, [v.lat, v.lon]])
);

/**
 * Authoritative coordinate resolver.
 * Never fabricates coordinates using ASCII hashing.
 * Returns [lat, lon] if known, or null if unverified.
 */
export function getCoordinates(cityName) {
  if (!cityName || typeof cityName !== 'string') return null;
  const norm = normalizeKey(cityName);
  if (KNOWN_CITIES[norm]) {
    return [KNOWN_CITIES[norm].lat, KNOWN_CITIES[norm].lon];
  }
  return null;
}

/**
 * Pure mode-aware budget calculation engine.
 * Ensures strict mutual exclusivity across transportation modes:
 * - FLIGHT: ticket cost only (zero fuel, zero road tolls, zero parking).
 * - TRAIN: ticket cost only (zero fuel, zero road tolls, zero parking).
 * - BUS: ticket cost only (zero fuel, zero road tolls, zero parking).
 * - CAB: ticket/fare only (zero personal fuel, zero road tolls, zero parking).
 * - OWN VEHICLE: fuel + toll + parking only (zero ticket cost).
 */
export function calculateModeBudget(mode, {
  flightCost = 0,
  trainCost = 0,
  busCost = 0,
  cabCost = 0,
  fuelCost = 0,
  tollCost = 0,
  parkingCost = 0,
  hotelCost = 0,
  foodCost = 0,
  miscCost = 0
} = {}) {
  const m = (mode || 'flight').toLowerCase();
  let tickets = 0;
  let fuel = 0;
  let toll = 0;
  let parking = 0;

  if (m === 'flight') {
    tickets = flightCost;
    fuel = 0;
    toll = 0;
    parking = 0;
  } else if (m === 'train') {
    tickets = trainCost;
    fuel = 0;
    toll = 0;
    parking = 0;
  } else if (m === 'bus') {
    tickets = busCost;
    fuel = 0;
    toll = 0;
    parking = 0;
  } else if (m === 'cab') {
    tickets = cabCost;
    fuel = 0;
    toll = 0;
    parking = 0;
  } else if (m === 'own') {
    tickets = 0;
    fuel = fuelCost;
    toll = tollCost;
    parking = parkingCost;
  }

  const total = tickets + fuel + toll + parking + hotelCost + foodCost + miscCost;

  return {
    mode: m,
    tickets,
    fuel,
    toll,
    parking,
    hotel: hotelCost,
    food: foodCost,
    misc: miscCost,
    total
  };
}

/**
 * Resolves both endpoints authoritatively and calculates real road distance.
 * Returns { fromLocation, toLocation, routeDetails } or throws error if geocoding fails.
 */
export async function resolveTripGeography(from, to, signal = null) {
  const [fromLoc, toLoc] = await Promise.all([
    geocodeCity(from, signal),
    geocodeCity(to, signal)
  ]);

  if (fromLoc.status === 'FAILED_TO_GEOCODE') {
    const err = new Error(fromLoc.error || `Could not find location: "${from}".`);
    err.code = 'FAILED_TO_GEOCODE';
    err.failedLocation = from;
    throw err;
  }

  if (toLoc.status === 'FAILED_TO_GEOCODE') {
    const err = new Error(toLoc.error || `Could not find location: "${to}".`);
    err.code = 'FAILED_TO_GEOCODE';
    err.failedLocation = to;
    throw err;
  }

  const fromCoords = [fromLoc.latitude, fromLoc.longitude];
  const toCoords = [toLoc.latitude, toLoc.longitude];

  const routeDetails = await calculateRoute(fromCoords, toCoords, 'driving', signal);

  return {
    fromLocation: fromLoc,
    toLocation: toLoc,
    fromCoords,
    toCoords,
    routeDetails
  };
}

/**
 * Generate complete deterministic travel plan with authoritative geography,
 * normalized transport options, and mode-aware budget.
 */
export function generateMockData(from, to, date, returnDate, travelers, budget, preferredMode = 'flight', geoData = null) {
  const travelersCount = parseInt(travelers, 10) || 1;
  const budgetValue = parseFloat(budget) || 1500;

  // Resolve coordinates
  let fromCoords = geoData?.fromCoords || getCoordinates(from);
  let toCoords = geoData?.toCoords || getCoordinates(to);

  // If coordinates are unresolvable, throw an explicit error rather than fabricating fake coordinates
  if (!fromCoords || !isValidCoords(fromCoords)) {
    throw new Error(`Location "${from}" could not be geocoded. Please check city name.`);
  }
  if (!toCoords || !isValidCoords(toCoords)) {
    throw new Error(`Location "${to}" could not be geocoded. Please check city name.`);
  }

  // Distance calculation: use real route distance if available, otherwise spherical Haversine road estimation
  let distance = geoData?.routeDetails?.distanceKm;
  if (typeof distance !== 'number' || distance <= 0) {
    const haversine = calculateHaversine(fromCoords[0], fromCoords[1], toCoords[0], toCoords[1]);
    distance = Math.max(Math.round(haversine * 1.25), 30);
  }

  const routeDetails = geoData?.routeDetails || {
    distanceKm: distance,
    durationMinutes: Math.round((distance / 60) * 60),
    geometry: null,
    source: 'haversine_estimate',
    status: 'estimated',
    isRoadRoute: false,
    fetchedAt: new Date().toISOString()
  };

  // Realistic travel times based on road distance
  const flightMinutes = Math.max(45, Math.round(distance / 8));
  const flightHours = Math.floor(flightMinutes / 60);
  const flightRemMins = flightMinutes % 60;
  const flightTime = flightHours > 0 ? `${flightHours}h ${flightRemMins}m` : `${flightRemMins}m`;

  const trainMinutes = Math.round((distance / 65) * 60);
  const trainTime = `${Math.floor(trainMinutes / 60)}h ${trainMinutes % 60}m`;

  const busMinutes = Math.round((distance / 50) * 60);
  const busTime = `${Math.floor(busMinutes / 60)}h ${busMinutes % 60}m`;

  const cabMinutes = routeDetails.durationMinutes || Math.round((distance / 60) * 60);
  const cabTime = `${Math.floor(cabMinutes / 60)}h ${cabMinutes % 60}m`;

  // Price tiering
  let budgetTier = 'Standard';
  if (budgetValue < 1000) budgetTier = 'Budget';
  else if (budgetValue > 3500) budgetTier = 'Premium';
  const priceMultiplier = budgetTier === 'Budget' ? 0.75 : budgetTier === 'Premium' ? 1.5 : 1.0;

  // Cost components per unit
  const flightCost = Math.round((1800 + distance * 3.5) * priceMultiplier * travelersCount);
  const train3ACost = Math.round((450 + distance * 1.1) * priceMultiplier * travelersCount);
  const trainSLCost = Math.round((180 + distance * 0.4) * priceMultiplier * travelersCount);
  const busCost = Math.round((350 + distance * 0.9) * priceMultiplier * travelersCount);
  const cabCost = Math.round((distance * 14) * priceMultiplier);
  const ownFuelCost = Math.round(distance * 7);
  const tollCost = Math.round(distance * 1.25);
  const parkingCostPerDay = 300;

  // Duration calculation
  let tripDays = 2;
  if (date && returnDate) {
    try {
      const d1 = new Date(date + 'T00:00:00Z');
      const d2 = new Date(returnDate + 'T00:00:00Z');
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (!isNaN(diff) && diff >= 1 && diff <= 14) {
        tripDays = diff;
      }
    } catch {}
  }

  const hotelDays = Math.max(1, tripDays - 1);
  const selectedHotelCost = Math.round((1200 + (budgetValue / 5)) * priceMultiplier);
  const totalHotelCost = selectedHotelCost * hotelDays;
  const totalFoodCost = 600 * tripDays * travelersCount;
  const totalParkingCost = parkingCostPerDay * hotelDays;
  const totalMiscCost = 800 * tripDays;

  // Midpoint coordinate
  const midCoords = [(fromCoords[0] + toCoords[0]) / 2, (fromCoords[1] + toCoords[1]) / 2];

  // Raw cost components
  const costComponents = {
    flightCost,
    trainCost: train3ACost,
    busCost,
    cabCost,
    fuelCost: ownFuelCost,
    tollCost,
    parkingCost: totalParkingCost,
    hotelCost: totalHotelCost,
    foodCost: totalFoodCost,
    miscCost: totalMiscCost
  };

  // Determine active mode (if flights are unavailable on short corridors, default to own or train)
  const canFly = distance >= 200;
  let effectiveMode = preferredMode;
  if (effectiveMode === 'any' || !effectiveMode) {
    effectiveMode = canFly ? 'flight' : 'own';
  } else if (effectiveMode === 'flight' && !canFly) {
    effectiveMode = 'own';
  }

  // Calculate truthful mode-aware budget
  const budgetDetails = calculateModeBudget(effectiveMode, costComponents);

  // Normalized transport options with full provenance
  const nowIso = new Date().toISOString();

  // Flights: strictly unavailable on short corridors (<200 km)
  // When available, labeled as explicit estimate rather than fabricated live airline inventory
  const flightOptions = canFly ? [
    {
      id: `fl_est_${distance}_1`,
      mode: 'flight',
      airline: 'Estimated Regular Flight',
      provider: null,
      depart: '06:15',
      arrive: '07:45',
      duration: flightTime,
      price: flightCost,
      stops: 0,
      rating: 4.2,
      source: 'estimate',
      status: 'estimated',
      currency: 'INR',
      isEstimated: true,
      fetchedAt: nowIso
    },
    {
      id: `fl_est_${distance}_2`,
      mode: 'flight',
      airline: 'Estimated Saver Flight',
      provider: null,
      depart: '14:20',
      arrive: '15:55',
      duration: flightTime,
      price: Math.round(flightCost * 1.18),
      stops: 0,
      rating: 4.0,
      source: 'estimate',
      status: 'estimated',
      currency: 'INR',
      isEstimated: true,
      fetchedAt: nowIso
    }
  ] : [];

  const trainOptions = [
    {
      id: `tr_${distance}_1`,
      mode: 'train',
      name: 'SuperFast Express',
      number: '12839',
      depart: '19:15',
      arrive: '05:30',
      duration: trainTime,
      price: train3ACost,
      tier: '3AC',
      avail: 34,
      source: 'estimate',
      status: 'estimated',
      currency: 'INR',
      fetchedAt: nowIso
    },
    {
      id: `tr_${distance}_2`,
      mode: 'train',
      name: 'Express Train',
      number: '15042',
      depart: '08:00',
      arrive: '19:45',
      duration: trainTime,
      price: trainSLCost,
      tier: 'Sleeper',
      avail: 88,
      source: 'estimate',
      status: 'estimated',
      currency: 'INR',
      fetchedAt: nowIso
    }
  ];

  const busOptions = [
    {
      id: `bus_${distance}_1`,
      mode: 'bus',
      name: 'Highway Travels (AC Sleeper)',
      depart: '20:30',
      arrive: '06:00',
      duration: busTime,
      price: busCost,
      seats: 12,
      rating: 4.3,
      source: 'estimate',
      status: 'estimated',
      currency: 'INR',
      fetchedAt: nowIso
    },
    {
      id: `bus_${distance}_2`,
      mode: 'bus',
      name: 'State Express (Non-AC Seater)',
      depart: '22:00',
      arrive: '07:45',
      duration: busTime,
      price: Math.round(busCost * 0.7),
      seats: 24,
      rating: 3.9,
      source: 'estimate',
      status: 'estimated',
      currency: 'INR',
      fetchedAt: nowIso
    }
  ];

  const cabOptions = [
    {
      id: `cab_${distance}_sedan`,
      mode: 'cab',
      name: 'Standard Sedan Cab',
      time: cabTime,
      price: cabCost,
      type: 'Sedan',
      distance: `${distance} km`,
      source: 'estimate',
      status: 'estimated',
      currency: 'INR',
      fetchedAt: nowIso
    },
    {
      id: `cab_${distance}_suv`,
      mode: 'cab',
      name: 'Premium SUV Cab',
      time: cabTime,
      price: Math.round(cabCost * 1.4),
      type: 'SUV (6 Seater)',
      distance: `${distance} km`,
      source: 'estimate',
      status: 'estimated',
      currency: 'INR',
      fetchedAt: nowIso
    }
  ];

  const ownOptions = {
    mode: 'own',
    distance: `${distance} km`,
    time: cabTime,
    tollInfo: `Estimated Toll: ₹${tollCost}`,
    fuelEstimate: `Estimated Fuel: ₹${ownFuelCost}`,
    roadCondition: distance > 300 ? 'National Highway 4-Lane' : 'State / Expressway Corridor',
    source: 'estimate',
    status: 'estimated',
    routes: [
      { name: 'Fastest Highway Route', distance: `${distance} km`, time: cabTime, tolls: tollCost, roadCondition: 'Good' },
      { name: 'Alternative Scenic Route', distance: `${Math.round(distance * 1.12)} km`, time: `${Math.floor(distance * 1.12 / 55)}h ${Math.round((distance * 1.12) % 55)}m`, tolls: Math.round(tollCost * 0.5), roadCondition: 'Scenic' }
    ]
  };

  // Build day-by-day itinerary
  const mockItinerary = [
    {
      day: 1,
      title: 'Departure & Initial Exploration',
      activities: [
        { time: '06:00 AM', title: 'Assemble & Depart', desc: `Start from ${from}. Keep basic snacks and water handy.`, cost: 0, icon: 'Navigation' },
        { time: '09:00 AM', title: 'Breakfast Stop', desc: 'Stop at a high-rated food stop along the route.', cost: 150 * travelersCount, icon: 'Utensils' },
        { time: '01:30 PM', title: 'Scenic Point / Transit Break', desc: 'Visit popular sights or scenic viewpoints on the route.', cost: 50 * travelersCount, icon: 'MapPin' },
        { time: '02:30 PM', title: 'Lunch Spot', desc: 'Enjoy local regional cuisine specialties.', cost: 250 * travelersCount, icon: 'Coffee' },
        { time: '06:00 PM', title: `Arrival at ${to}`, desc: 'Check in at the hotel and take a brief rest.', cost: 0, icon: 'Home' },
        { time: '07:30 PM', title: 'Evening Walk & Local Market', desc: 'Explore the main city square, try street foods, and capture night views.', cost: 200 * travelersCount, icon: 'Camera' }
      ]
    }
  ];

  for (let d = 2; d <= tripDays; d++) {
    if (d === tripDays && tripDays > 1) {
      mockItinerary.push({
        day: d,
        title: 'Highlights & Return Journey',
        activities: [
          { time: '08:30 AM', title: 'Farewell Breakfast & Checkout', desc: 'Pack luggage and prepare for the return trip.', cost: 0, icon: 'Home' },
          { time: '10:30 AM', title: 'Local Artisan Bazaar & Souvenirs', desc: 'Pick up authentic local crafts and souvenirs.', cost: 400, icon: 'ShoppingBag' },
          { time: '01:30 PM', title: 'Traditional Lunch', desc: 'Enjoy authentic delicacies before heading back.', cost: 350 * travelersCount, icon: 'Utensils' },
          { time: '04:00 PM', title: `Return Journey toward ${from}`, desc: 'Depart smoothly with memories captured.', cost: 0, icon: 'Navigation' }
        ]
      });
    } else {
      mockItinerary.push({
        day: d,
        title: `Day ${d}: Cultural Sights & Hidden Gems`,
        activities: [
          { time: '08:30 AM', title: 'Hotel Breakfast & Planning', desc: 'Get ready for full day sightseeing.', cost: 0, icon: 'Compass' },
          { time: '09:30 AM', title: 'Prime Historical Landmark Tour', desc: 'Visit the main heritage monuments and attractions.', cost: 100 * travelersCount, icon: 'Eye' },
          { time: '01:00 PM', title: 'Traditional Lunch Experience', desc: 'Famous authentic regional culinary recommendation.', cost: 350 * travelersCount, icon: 'Utensils' },
          { time: '04:00 PM', title: 'Excursion & Nature Walk', desc: 'Explore botanical gardens, viewpoints, or lakefront parks.', cost: 100 * travelersCount, icon: 'Compass' },
          { time: '07:30 PM', title: 'Sunset Gathering & Dinner', desc: 'Relax at a local dining spot with ambient music.', cost: 300 * travelersCount, icon: 'Moon' }
        ]
      });
    }
  }

  return {
    from,
    to,
    date,
    returnDate: returnDate || null,
    tripDays,
    travelers: travelersCount,
    budget: budgetValue,
    transportMode: effectiveMode,
    distance,
    coordinates: {
      from: fromCoords,
      to: toCoords,
      mid: midCoords
    },
    canonicalLocations: {
      from: geoData?.fromLocation || { name: from, latitude: fromCoords[0], longitude: fromCoords[1] },
      to: geoData?.toLocation || { name: to, latitude: toCoords[0], longitude: toCoords[1] }
    },
    routeDetails,
    costComponents,
    options: {
      bus: busOptions,
      flight: flightOptions,
      train: trainOptions,
      cab: cabOptions,
      own: ownOptions
    },
    suggestions: {
      cheapest: {
        title: 'Cheapest Option',
        mode: 'Train (Sleeper)',
        price: trainSLCost,
        icon: 'Train',
        badge: 'Lowest Price',
        desc: `Sleeper class ticket on Express Train for ₹${trainSLCost}`
      },
      fastest: {
        title: 'Fastest Option',
        mode: canFly ? 'Flight' : 'Cab / Road',
        price: canFly ? flightCost : cabCost,
        icon: canFly ? 'Plane' : 'Car',
        badge: 'Save Time',
        desc: canFly ? `Estimated flight in ${flightTime}` : `Direct road journey in ${cabTime}`
      },
      comfort: {
        title: 'Most Comfortable',
        mode: canFly ? 'Flight' : 'Sedan Cab',
        price: canFly ? Math.round(flightCost * 1.18) : cabCost,
        icon: canFly ? 'Plane' : 'Car',
        badge: 'Premium Travel',
        desc: canFly ? 'Spacious flight travel' : 'Private Sedan door-to-door service'
      },
      value: {
        title: 'Best Value',
        mode: 'Train (3AC)',
        price: train3ACost,
        icon: 'Train',
        badge: 'Recommended',
        desc: `Balanced comfort and speed in AC 3-Tier Train for ₹${train3ACost}`
      },
      eco: {
        title: 'Eco-Friendly',
        mode: 'Train (Electric)',
        price: trainSLCost,
        icon: 'Leaf',
        badge: 'Green Trip',
        desc: 'Saves 88% CO2 emissions compared to driving or flying'
      }
    },
    itinerary: mockItinerary,
    budgetDetails,
    roadTripDetails: {
      petrolPumps: ['Indian Oil Highway Outlet', 'Bharat Petroleum Highway Hub', 'Shell Fuel Station Point'],
      evStations: ['Tata Power EZ Charge Station', 'Fortum Charge Drive Hub', 'Zeon High Speed Charging Point'],
      restaurants: [
        { name: 'Grand Highway Plaza', rating: 4.4, cuisine: 'Multi-cuisine, Buffet', distance: `${Math.round(distance * 0.25)} km from start`, openingHours: '24 Hours' },
        { name: 'Hotel Saravana Bhavan', rating: 4.6, cuisine: 'South Indian Vegetarian', distance: `${Math.round(distance * 0.55)} km from start`, openingHours: '6:30 AM - 10:30 PM' },
        { name: 'Barbecue Highway grill', rating: 4.2, cuisine: 'Tandoori, North Indian', distance: `${Math.round(distance * 0.78)} km from start`, openingHours: '11:30 AM - 11:00 PM' }
      ],
      attractions: [
        { name: 'Heritage Cultural Center', description: 'Historical site showcasing regional architecture and heritage monuments.', rating: 4.7, distance: `${Math.round(distance * 0.3)} km`, visitTime: '1.5 hrs', image: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=600&q=80' },
        { name: 'Valley Viewpoint & Nature Park', description: 'Scenic valley lookout offering panoramic landscape views and photography points.', rating: 4.3, distance: `${Math.round(distance * 0.6)} km`, visitTime: '1.5 hrs', image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=600&q=80' }
      ],
      hotels: [
        { name: 'City Center Grand Stay', price: selectedHotelCost, rating: 4.5, amenities: ['Free WiFi', 'Breakfast', 'Parking'], image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
        { name: 'Transit Express Stay', price: Math.round(selectedHotelCost * 0.6), rating: 3.9, amenities: ['Free WiFi', 'AC Rooms'], image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80' }
      ],
      emergencies: {
        hospitals: ['Trauma Care Emergency Center', 'City General Hospital Hub'],
        police: ['Highway Patrol Station', 'City Police Chowki'],
        mechanics: ['Authorized Vehicle Service Hub', 'Express 24x7 Towing Care']
      }
    },
    weather: {
      temp: '28°C',
      condition: 'Pleasant & Clear',
      windSpeed: '12 km/h',
      rainAlert: '0% Probability of Rain',
      source: 'estimate',
      status: 'estimated',
      forecast: [
        { stop: from, temp: '26°C', condition: 'Clear' },
        { stop: 'Transit Corridor', temp: '29°C', condition: 'Sunny' },
        { stop: to, temp: '28°C', condition: 'Partly Cloudy' }
      ]
    }
  };
}

export async function getAIGeneration(searchParams, externalSignal) {
  return generateTripPlan(searchParams, externalSignal);
}

export function buildTripAIPrompt(from, to, date, returnDate, travelers, budget, mode) {
  return `
    You are a professional travel coordinator. Generate a narrative itinerary and sightseeing activity recommendations for a journey from "${from}" to "${to}" on "${date}" ${returnDate ? `returning on "${returnDate}"` : ''} for ${travelers} travelers with a budget of approximately ${budget}.
    
    Provide realistic day-by-day sightseeing activities with descriptive notes and estimated activity entrance costs.
  `;
}

export async function getAIChatResponse(chatHistory, userMessage, tripData, externalSignal = null) {
  return sendChatMessage({ message: userMessage, chatHistory, tripContext: tripData }, externalSignal);
}
