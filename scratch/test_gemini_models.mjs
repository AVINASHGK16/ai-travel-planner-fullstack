import fs from 'fs';

const envContent = fs.readFileSync('./backend/.env', 'utf-8');
let key = '';
for (const line of envContent.split(/\r?\n/)) {
  if (line.startsWith('GEMINI_API_KEY=')) {
    key = line.slice('GEMINI_API_KEY='.length).trim();
  }
}

const promptText = `
  You are a professional travel coordinator. Generate a comprehensive travel plan for a trip from "Bengaluru, Karnataka, India" to "Goa, India" on "2026-10-01" for 1 travelers.
  The budget is approximately INR/USD 50000. Preferred travel mode: flight.
  
  Return a JSON object matches the schema EXACTLY (no markdown blocks, just raw JSON):
  {
    "summary": "Short descriptive summary",
    "cheapest": { "mode": "String", "price": 1000, "description": "String" },
    "fastest": { "mode": "String", "price": 1000, "description": "String" },
    "comfort": { "mode": "String", "price": 1000, "description": "String" },
    "value": { "mode": "String", "price": 1000, "description": "String" },
    "eco": { "mode": "String", "price": 1000, "description": "String" },
    "itinerary": [
      {
        "day": 1,
        "title": "String",
        "activities": [
          { "time": "String", "title": "String", "desc": "String", "cost": 100, "icon": "Utensils" }
        ]
      }
    ],
    "budgetDetails": {
      "tickets": 100, "fuel": 100, "hotel": 100, "food": 100, "toll": 100, "parking": 100, "misc": 100, "total": 700
    },
    "roadTripDetails": {
      "petrolPumps": ["String"],
      "evStations": ["String"],
      "restaurants": [{ "name": "String", "rating": 4.5, "cuisine": "String", "distance": "String", "openingHours": "String" }],
      "attractions": [{ "name": "String", "description": "String", "rating": 4.5, "distance": "String", "visitTime": "String", "image": "https://images.unsplash.com" }],
      "hotels": [{ "name": "String", "price": 1000, "rating": 4.5, "amenities": ["Wifi"], "image": "https://images.unsplash.com" }],
      "emergencies": { "hospitals": ["String"], "police": ["String"], "mechanics": ["String"] }
    },
    "weather": {
      "temp": "30C", "condition": "Sunny", "windSpeed": "10km/h", "rainAlert": "None",
      "forecast": [{ "stop": "Goa", "temp": "30C", "condition": "Sunny" }]
    }
  }
`;

async function testFull() {
  const m = 'gemini-2.5-flash'; // wait, let's test gemini-3.5-flash
  console.log('Testing gemini-3.5-flash with full itinerary prompt...');
  const t0 = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(18000)
    });
    const t1 = Date.now();
    const data = await res.json();
    console.log('Status:', res.status, 'Time:', t1 - t0, 'ms');
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('Got response text length:', text?.length);
    if (text) {
      const parsed = JSON.parse(text);
      console.log('Parsed successfully! Keys:', Object.keys(parsed));
      console.log('Summary:', parsed.summary);
      console.log('Itinerary days:', parsed.itinerary?.length);
    }
  } catch (e) {
    console.log('Error:', e.name, e.message);
  }
}

testFull();
