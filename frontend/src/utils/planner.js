// AI Travel Planner Utility for Data Generation and API Integration

// Local coordinates database for drawing beautiful Leaflet routes
export const cityCoordinates = {
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  hyderabad: [17.3850, 78.4867],
  chennai: [13.0827, 80.2707],
  mumbai: [19.0760, 72.8777],
  delhi: [28.6139, 77.2090],
  newdelhi: [28.6139, 77.2090],
  pune: [18.5204, 73.8567],
  goa: [15.2993, 74.1240],
  kolkata: [22.5726, 88.3639],
  kochi: [9.9312, 76.2673],
  jaipur: [26.9124, 75.7873],
  agra: [27.1767, 78.0081],
  newyork: [40.7128, -74.0060],
  london: [51.5074, -0.1278],
  paris: [48.8566, 2.3522],
  tokyo: [35.6762, 139.6503],
  sydney: [-33.8688, 151.2093]
};

// Fallback coordinate generator based on city name hash
export function getCoordinates(cityName) {
  if (!cityName) return [20.5937, 78.9629]; // Center of India
  const norm = cityName.toLowerCase().trim().replace(/\s+/g, '');
  if (cityCoordinates[norm]) return cityCoordinates[norm];
  
  // Hash function to generate semi-realistic but deterministic coords within India bounds
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < norm.length; i++) {
    hash1 = norm.charCodeAt(i) + ((hash1 << 5) - hash1);
    hash2 = norm.charCodeAt(i) + ((hash2 << 7) - hash2);
  }
  
  // Map hashes to India bounds roughly: Lat [10, 30], Lng [72, 85]
  const lat = 12 + Math.abs(hash1 % 18);
  const lng = 73 + Math.abs(hash2 % 12);
  return [lat, lng];
}

// Generate complete mock travel data if API keys aren't available
export function generateMockData(from, to, date, returnDate, travelers, budget) {
  const travelersCount = parseInt(travelers) || 1;
  const budgetValue = parseFloat(budget) || 1500;
  
  const fromCoords = getCoordinates(from);
  const toCoords = getCoordinates(to);
  
  // Calculate relative distance estimation
  const latDiff = toCoords[0] - fromCoords[0];
  const lngDiff = toCoords[1] - fromCoords[1];
  const estDistance = Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111); // 1 deg ~ 111km
  const distance = Math.max(estDistance, 50); // Min 50km
  
  // Travel times
  const flightTime = `${Math.floor(distance / 500)}h ${Math.round((distance % 500) / 8.3)}m`.replace('0h ', '');
  const trainTime = `${Math.floor(distance / 60)}h ${Math.round((distance % 60))}m`;
  const busTime = `${Math.floor(distance / 50)}h ${Math.round((distance % 50))}m`;
  const cabTime = `${Math.floor(distance / 65)}h ${Math.round((distance % 65))}m`;
  
  // Price factors based on budget tier (100 to 5000+)
  let budgetTier = 'Standard';
  if (budgetValue < 1000) budgetTier = 'Budget';
  else if (budgetValue > 3500) budgetTier = 'Premium';
  
  const priceMultiplier = budgetTier === 'Budget' ? 0.75 : budgetTier === 'Premium' ? 1.5 : 1.0;
  
  // Individual options costs
  const flightCost = Math.round((1800 + distance * 3.5) * priceMultiplier * travelersCount);
  const train3ACost = Math.round((450 + distance * 1.1) * priceMultiplier * travelersCount);
  const trainSLCost = Math.round((180 + distance * 0.4) * priceMultiplier * travelersCount);
  const busCost = Math.round((350 + distance * 0.9) * priceMultiplier * travelersCount);
  const cabCost = Math.round((distance * 13) * priceMultiplier);
  const ownFuelCost = Math.round((distance * 7));
  const tollCost = Math.round((distance * 1.25));
  
  const selectedHotelCost = Math.round((1200 + (budgetValue / 5)) * priceMultiplier);
  
  // Midpoint coordinate for weather & stops
  const midCoords = [(fromCoords[0] + toCoords[0]) / 2, (fromCoords[1] + toCoords[1]) / 2];

  return {
    from,
    to,
    date,
    returnDate: returnDate || null,
    travelers: travelersCount,
    budget: budgetValue,
    distance,
    coordinates: {
      from: fromCoords,
      to: toCoords,
      mid: midCoords
    },
    options: {
      bus: [
        { name: 'RedLine Travels (AC Sleeper)', depart: '20:30', arrive: '06:00', duration: busTime, price: busCost, seats: 12, rating: 4.4 },
        { name: 'GreenExpress (Non-AC Seater)', depart: '22:00', arrive: '07:45', duration: busTime, price: Math.round(busCost * 0.7), seats: 24, rating: 3.9 }
      ],
      flight: distance > 250 ? [
        { airline: 'IndiGo', depart: '06:15', arrive: '07:45', duration: flightTime, price: flightCost, stops: 0, rating: 4.3 },
        { airline: 'Air India', depart: '14:20', arrive: '15:55', duration: flightTime, price: Math.round(flightCost * 1.25), stops: 0, rating: 4.1 }
      ] : [],
      train: [
        { name: 'SuperFast Express', number: '12839', depart: '19:15', arrive: '05:30', duration: trainTime, price: train3ACost, tier: '3AC', avail: 34 },
        { name: 'Express Train', number: '15042', depart: '08:00', arrive: '19:45', duration: trainTime, price: trainSLCost, tier: 'Sleeper', avail: 88 }
      ],
      cab: [
        { name: 'Ola Sedan', time: cabTime, price: cabCost, type: 'Sedan', distance: `${distance} km` },
        { name: 'Uber SUV', time: cabTime, price: Math.round(cabCost * 1.4), type: 'SUV (6 Seater)', distance: `${distance} km` }
      ],
      own: {
        distance: `${distance} km`,
        time: cabTime,
        tollInfo: `Estimated Toll: ₹${tollCost}`,
        fuelEstimate: `Estimated Fuel: ₹${ownFuelCost}`,
        roadCondition: distance > 300 ? 'Excellent NH 4-Lane' : 'Good Double-Lane State Highway',
        routes: [
          { name: 'National Highway (Fastest)', distance: `${distance} km`, time: cabTime, tolls: tollCost, roadCondition: 'Excellent' },
          { name: 'State Highway (Scenic)', distance: `${Math.round(distance * 1.15)} km`, time: `${Math.floor(distance * 1.15 / 55)}h ${Math.round((distance * 1.15) % 55)}m`, tolls: Math.round(tollCost * 0.4), roadCondition: 'Good (some scenic points)' }
        ]
      }
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
        mode: distance > 250 ? 'Flight' : 'Cab/Car',
        price: distance > 250 ? flightCost : cabCost,
        icon: distance > 250 ? 'Plane' : 'Car',
        badge: 'Save Time',
        desc: distance > 250 ? `Direct flight in just ${flightTime}` : `Direct road journey in ${cabTime}`
      },
      comfort: {
        title: 'Most Comfortable',
        mode: distance > 250 ? 'Flight (Premium)' : 'Ola Sedan Cab',
        price: distance > 250 ? Math.round(flightCost * 1.25) : cabCost,
        icon: distance > 250 ? 'Plane' : 'Car',
        badge: 'Premium Travel',
        desc: distance > 250 ? 'Air India flight with spacious seating' : 'Private Sedan door-to-door service'
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
    itinerary: [
      {
        day: 1,
        title: 'Departure & Exploration',
        activities: [
          { time: '06:00 AM', title: 'Assemble & Depart', desc: `Start from ${from}. Keep basic snacks and water handy.`, cost: 0, icon: 'Navigation' },
          { time: '09:00 AM', title: 'Breakfast Highway Stop', desc: 'Stop at a high-rated vegetarian food court along the highway.', cost: 150 * travelersCount, icon: 'Utensils' },
          { time: '01:30 PM', title: 'Mid-way Attractions Visit', desc: 'Visit Lepakshi or equivalent historical sight on the way.', cost: 50 * travelersCount, icon: 'MapPin' },
          { time: '02:30 PM', title: 'Lunch Spot', desc: 'Enjoy local regional cuisine specialities.', cost: 250 * travelersCount, icon: 'Coffee' },
          { time: '06:00 PM', title: `Arrival at ${to}`, desc: 'Check in at the hotel and take a brief rest.', cost: 0, icon: 'Home' },
          { time: '07:30 PM', title: 'Evening Walk & Local Market', desc: 'Explore the main city square, try street foods, and capture night views.', cost: 200 * travelersCount, icon: 'Camera' }
        ]
      },
      {
        day: 2,
        title: 'Local Sightseeing & Experiences',
        activities: [
          { time: '08:30 AM', title: 'Hotel Breakfast & Planning', desc: 'Get ready for full day sightseeing.', cost: 0, icon: 'Compass' },
          { time: '09:30 AM', title: 'Prime Historical Monument Visit', desc: 'Visit the main historical landmark and take photos.', cost: 100 * travelersCount, icon: 'Eye' },
          { time: '01:00 PM', title: 'Traditional Lunch Buffet', desc: 'Famous authentic fine dining restaurant recommendation.', cost: 400 * travelersCount, icon: 'Utensils' },
          { time: '03:30 PM', title: 'Shopping and Local Crafts', desc: 'Visit local artisans and check out handloom products.', cost: 500, icon: 'ShoppingBag' },
          { time: '07:00 PM', title: 'Dinner Cruise or Lakeside Sunset', desc: 'Watch a beautiful sunset view or enjoy dinner with music.', cost: 350 * travelersCount, icon: 'Moon' }
        ]
      }
    ],
    budgetDetails: {
      tickets: distance > 250 ? flightCost : train3ACost,
      fuel: distance * 7,
      hotel: selectedHotelCost,
      food: 1200 * travelersCount,
      toll: tollCost,
      parking: 300,
      misc: 1000,
      total: (distance > 250 ? flightCost : train3ACost) + (selectedHotelCost) + (1200 * travelersCount) + tollCost + 300 + 1000
    },
    roadTripDetails: {
      petrolPumps: ['Indian Oil Highway Outlet', 'Bharat Petroleum Highway Hub', 'Shell Fuel Station Point'],
      evStations: ['Tata Power EZ Charge Station', 'Fortum Charge Drive Hub', 'Zeon High Speed Charging Point'],
      restaurants: [
        { name: 'Grand Highway Plaza', rating: 4.4, cuisine: 'Multi-cuisine, Buffet', distance: `${Math.round(distance * 0.25)} km from start`, openingHours: '24 Hours' },
        { name: 'Hotel Saravana Bhavan', rating: 4.6, cuisine: 'South Indian Vegetarian', distance: `${Math.round(distance * 0.55)} km from start`, openingHours: '6:30 AM - 10:30 PM' },
        { name: 'Barbecue Highway grill', rating: 4.2, cuisine: 'Tandoori, North Indian', distance: `${Math.round(distance * 0.78)} km from start`, openingHours: '11:30 AM - 11:00 PM' }
      ],
      attractions: [
        { name: 'Lepakshi Temple Heritage Site', description: 'Stunning 16th-century temple complex showcasing Vijayanagara architecture and the massive Nandi.', rating: 4.8, distance: `${Math.round(distance * 0.2)} km`, visitTime: '1.5 hrs', image: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=600&q=80' },
        { name: 'Penukonda Fort', description: 'Ancient fortress city containing interesting historical ruins and climbing points for valley views.', rating: 4.1, distance: `${Math.round(distance * 0.45)} km`, visitTime: '2 hrs', image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=600&q=80' }
      ],
      hotels: [
        { name: 'Regency Grand Luxury Inn', price: selectedHotelCost, rating: 4.5, amenities: ['Free WiFi', 'Swimming Pool', 'Spa & Gym', 'Valet Parking'], image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
        { name: 'Transit Express Stay', price: Math.round(selectedHotelCost * 0.55), rating: 3.8, amenities: ['Free Breakfast', 'AC Rooms', '24h Hot Water'], image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80' }
      ],
      emergencies: {
        hospitals: ['Sanjeevani Trauma Care Center', 'City General Hospital (NH 44 Hub)'],
        police: ['Highway Patrol Station Sector 3', 'Rural Police Chowki'],
        mechanics: ['Maruti Authorized Care', 'Express Garage & Towing Services']
      }
    },
    weather: {
      temp: '32°C',
      condition: 'Sunny & Warm',
      windSpeed: '14 km/h',
      rainAlert: '0% Probability of Rain',
      forecast: [
        { stop: from, temp: '28°C', condition: 'Clear Sky' },
        { stop: 'Midpoint Transit', temp: '34°C', condition: 'Hot & Dry' },
        { stop: to, temp: '30°C', condition: 'Intermittent Clouds' }
      ]
    }
  };
}

// Invoke the Gemini API to get intelligent itineraries, recommendations and chat assistance
export async function getAIGeneration(apiKey, promptText) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }
    
    const responseData = await response.json();
    const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) {
      throw new Error('Empty response from AI engine');
    }
    
    return JSON.parse(rawText.trim());
  } catch (error) {
    console.error('AI Generation error:', error);
    throw error;
  }
}

// Generate the customized query for travel planning
export function buildTripAIPrompt(from, to, date, returnDate, travelers, budget, mode) {
  return `
    You are a professional travel coordinator. Generate a comprehensive travel plan for a trip from "${from}" to "${to}" on "${date}" ${returnDate ? `returning on "${returnDate}"` : ''} for ${travelers} travelers.
    The budget is approximately INR/USD ${budget}. Preferred travel mode: ${mode || 'any'}.
    
    Return a JSON object matches the schema EXACTLY (no markdown blocks, just raw JSON):
    {
      "summary": "Short descriptive summary",
      "cheapest": { "mode": "String", "price": number, "description": "String" },
      "fastest": { "mode": "String", "price": number, "description": "String" },
      "comfort": { "mode": "String", "price": number, "description": "String" },
      "value": { "mode": "String", "price": number, "description": "String" },
      "eco": { "mode": "String", "price": number, "description": "String" },
      "itinerary": [
        {
          "day": number,
          "title": "String",
          "activities": [
            { "time": "String", "title": "String", "desc": "String", "cost": number, "icon": "Utensils | Navigation | MapPin | Eye | Moon | Home | Coffee | ShoppingBag | Camera | Compass" }
          ]
        }
      ],
      "budgetDetails": {
        "tickets": number,
        "fuel": number,
        "hotel": number,
        "food": number,
        "toll": number,
        "parking": number,
        "misc": number,
        "total": number
      },
      "roadTripDetails": {
        "petrolPumps": ["String"],
        "evStations": ["String"],
        "restaurants": [
          { "name": "String", "rating": number, "cuisine": "String", "distance": "String", "openingHours": "String" }
        ],
        "attractions": [
          { "name": "String", "description": "String", "rating": number, "distance": "String", "visitTime": "String", "image": "String (URL)" }
        ],
        "hotels": [
          { "name": "String", "price": number, "rating": number, "amenities": ["String"], "image": "String (URL)" }
        ],
        "emergencies": {
          "hospitals": ["String"],
          "police": ["String"],
          "mechanics": ["String"]
        }
      },
      "weather": {
        "temp": "String",
        "condition": "String",
        "windSpeed": "String",
        "rainAlert": "String",
        "forecast": [
          { "stop": "String", "temp": "String", "condition": "String" }
        ]
      }
    }
    
    Make sure the rates, distances, travel options, and suggestions are realistic for a journey between these two coordinates.
  `;
}

// Send standard chat message to Gemini
export async function getAIChatResponse(apiKey, chatHistory, userMessage, tripData) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    // System context to guide the chatbot
    const systemPrompt = `You are a friendly, highly intelligent Travel Assistant for the "AI Travel Planner" application. 
    The user is asking questions about a trip they are planning. 
    Here is their current trip context:
    - Origin: ${tripData?.from || 'Unknown'}
    - Destination: ${tripData?.to || 'Unknown'}
    - Date: ${tripData?.date || 'Unknown'}
    - Travelers: ${tripData?.travelers || '1'}
    - Budget: ${tripData?.budget || 'Standard'}
    - Total Distance: ${tripData?.distance || 'Unknown'} km
    
    Answer the user's question accurately, offering safety tips, restaurant choices, budget tips, packing checklists, or route details when relevant. Keep your answer brief, concise, and beautifully formatted in markdown.`;

    const contents = [
      { parts: [{ text: systemPrompt }] }
    ];
    
    // Format history
    chatHistory.forEach(msg => {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    });
    
    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }
    
    const responseData = await response.json();
    const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return rawText || "I'm sorry, I couldn't process that. Can you try again?";
  } catch (error) {
    console.error('Chat AI response error:', error);
    return `Chat integration error: ${error.message}. Please verify your Gemini API key in the developer settings.`;
  }
}
