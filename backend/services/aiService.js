import { geocodeLocation } from './geoService.js';

const sanitize = (str, maxLen = 500) => (typeof str === 'string' ? str.trim().slice(0, maxLen) : '');

export const generateTrip = async ({ from, to, date, returnDate, travelers, budget, preferredMode }, user = null) => {
  const keyToUse = process.env.GEMINI_API_KEY;

  if (!keyToUse) {
    const err = new Error('Gemini AI service is not configured on the server. Please verify server configuration.');
    err.statusCode = 503;
    err.code = 'AI_UNCONFIGURED';
    throw err;
  }

  // Canonicalize origin and destination prior to AI prompt generation
  const [fromGeo, toGeo] = await Promise.all([
    geocodeLocation(from),
    geocodeLocation(to)
  ]);

  const sanitizedFrom = (fromGeo.status === 'GEOCODED' && fromGeo.formattedAddress) ? fromGeo.formattedAddress : from;
  const sanitizedTo = (toGeo.status === 'GEOCODED' && toGeo.formattedAddress) ? toGeo.formattedAddress : to;
  const sanitizedDate = date;
  const sanitizedReturnDate = returnDate || '';
  const sanitizedTravelers = travelers;
  const sanitizedBudget = budget;
  const sanitizedMode = preferredMode;

  const promptText = `
    You are a professional travel coordinator. Generate a comprehensive travel plan for a trip from "${sanitizedFrom}" to "${sanitizedTo}" on "${sanitizedDate}" ${sanitizedReturnDate ? `returning on "${sanitizedReturnDate}"` : ''} for ${sanitizedTravelers} travelers.
    The budget is approximately INR/USD ${sanitizedBudget}. Preferred travel mode: ${sanitizedMode}.
    
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
  `;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToUse}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(18000)
    });

    if (!response.ok) {
      if (response.status === 429) {
        const err = new Error('Gemini AI quota or rate limit exceeded. Please try again later.');
        err.statusCode = 429;
        err.code = 'AI_QUOTA_EXCEEDED';
        throw err;
      }
      if (response.status === 503 || response.status === 500) {
        const err = new Error('Gemini AI service is temporarily overloaded. Please try again later.');
        err.statusCode = 503;
        err.code = 'AI_OVERLOADED';
        throw err;
      }
      if (response.status === 400 || response.status === 403) {
        const err = new Error('Gemini AI service configuration or authentication error on server.');
        err.statusCode = 503;
        err.code = 'AI_UNCONFIGURED';
        throw err;
      }
      const err = new Error(`Gemini AI returned error status ${response.status}.`);
      err.statusCode = 502;
      err.code = 'AI_UPSTREAM_ERROR';
      throw err;
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;

    // Check for safety block or non-standard termination
    if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
      const err = new Error(`Gemini AI generation was halted (${finishReason}).`);
      err.statusCode = 502;
      err.code = 'AI_SAFETY_OR_STOP';
      throw err;
    }

    const rawText = candidate?.content?.parts?.[0]?.text;
    if (!rawText || !rawText.trim()) {
      const err = new Error('Gemini AI returned an empty response.');
      err.statusCode = 502;
      err.code = 'AI_EMPTY_RESPONSE';
      throw err;
    }

    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn('Gemini response failed JSON parsing:', parseErr.message);
      const err = new Error('Gemini AI returned an invalid JSON response structure.');
      err.statusCode = 502;
      err.code = 'AI_MALFORMED_JSON';
      throw err;
    }

    // Validate essential schema components
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.itinerary) || parsed.itinerary.length === 0) {
      const err = new Error('Gemini AI returned an incomplete plan structure (missing itinerary).');
      err.statusCode = 502;
      err.code = 'AI_INCOMPLETE_RESPONSE';
      throw err;
    }

    // Boundaries: AI provides narrative itinerary, but cannot fabricate or overwrite coordinates or distance
    delete parsed.coordinates;
    delete parsed.distance;
    delete parsed.canonicalLocations;
    delete parsed.routeDetails;

    if (fromGeo.status === 'GEOCODED' && toGeo.status === 'GEOCODED') {
      parsed.canonicalLocations = {
        from: fromGeo,
        to: toGeo
      };
      parsed.coordinates = {
        from: [fromGeo.latitude, fromGeo.longitude],
        to: [toGeo.latitude, toGeo.longitude],
        mid: [(fromGeo.latitude + toGeo.latitude) / 2, (fromGeo.longitude + toGeo.longitude) / 2]
      };
    }

    return {
      ...parsed,
      isAIGenerated: true
    };
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      const err = new Error('Gemini AI generation timed out on the server.');
      err.statusCode = 504;
      err.code = 'AI_TIMEOUT';
      throw err;
    }
    throw error;
  }
};

export const generateTravelPlan = generateTrip;

export const chatWithAssistant = async ({ message, chatHistory, tripContext }, user = null) => {
  const keyToUse = process.env.GEMINI_API_KEY;

  if (!keyToUse) {
    const err = new Error('Gemini AI service is not configured on the server.');
    err.statusCode = 503;
    err.code = 'AI_UNCONFIGURED';
    throw err;
  }

  const sanitizedMessage = sanitize(message, 1000);

  const systemPrompt = `You are a friendly, highly intelligent Travel Assistant for the "AI Travel Planner" application. 
The user is asking questions about a trip they are planning. 
Here is their current trip context:
- Origin: ${tripContext?.from || 'Unknown'}
- Destination: ${tripContext?.to || 'Unknown'}
- Date: ${tripContext?.date || 'Unknown'}
- Travelers: ${tripContext?.travelers || '1'}
- Budget: ${tripContext?.budget || 'Standard'}
- Total Distance: ${tripContext?.distance || 'Unknown'} km

Answer the user's question accurately, offering safety tips, restaurant choices, budget tips, packing checklists, or route details when relevant. Keep your answer brief, concise, and beautifully formatted in markdown.`;

  const contents = [
    { parts: [{ text: systemPrompt }] }
  ];

  if (Array.isArray(chatHistory)) {
    chatHistory.slice(-20).forEach(msg => {
      if (msg.text && msg.sender) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: sanitize(msg.text, 2000) }]
        });
      }
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: sanitizedMessage }]
  });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToUse}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      if (response.status === 429) {
        const err = new Error('AI chat quota or rate limit exceeded.');
        err.statusCode = 429;
        err.code = 'AI_QUOTA_EXCEEDED';
        throw err;
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return { reply: reply || "I'm sorry, I couldn't process that. Can you try again?" };
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      const err = new Error('AI chat response timed out.');
      err.statusCode = 504;
      err.code = 'AI_TIMEOUT';
      throw err;
    }
    throw error;
  }
};
