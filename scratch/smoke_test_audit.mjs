import dotenv from '../backend/node_modules/dotenv/lib/main.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

console.log('=== ROAMLY API SMOKE TESTS ===');

async function testGemini() {
  console.log('\n--- 1. Gemini API Smoke Test ---');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('Status: SKIPPED (GEMINI_API_KEY not set)');
    return 'skip';
  }
  const candidateModels = [
    process.env.GEMINI_MODEL,
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite'
  ].filter(Boolean);

  for (const model of candidateModels) {
    const start = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with raw JSON: {"status": "ok", "message": "hello"}' }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(15000)
      });
      const latency = Date.now() - start;
      console.log(`Model tested: ${model} -> HTTP Status: ${res.status}, Latency: ${latency}ms`);
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(text);
        console.log('Result: SUCCESS');
        console.log('Parsed JSON output valid:', Boolean(parsed && parsed.status === 'ok'));
        return 'pass';
      }
      const errText = await res.text();
      console.log(`Model ${model} unavailable: ${errText.slice(0, 150)}`);
    } catch (err) {
      console.log(`Model ${model} error: ${err.message}`);
    }
  }
  console.log('Result: FAILURE (all candidate models exhausted)');
  return 'fail';
}

async function testOpenWeather() {
  console.log('\n--- 2. OpenWeather API Smoke Test ---');
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    console.log('Status: SKIPPED (WEATHER_API_KEY not set)');
    return 'skip';
  }
  const city = 'Bengaluru';
  const start = Date.now();
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const latency = Date.now() - start;
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Latency: ${latency}ms`);
    if (res.ok) {
      const data = await res.json();
      console.log('Result: SUCCESS');
      console.log(`Temperature received: ${data?.main?.temp}°C`);
      console.log(`Weather condition received: ${data?.weather?.[0]?.main} (${data?.weather?.[0]?.description})`);
      console.log(`City: ${data?.name}, Country: ${data?.sys?.country}`);
      return 'pass';
    } else {
      const errText = await res.text();
      console.log('Result: FAILURE');
      console.log('Error summary:', errText.slice(0, 200));
      return 'fail';
    }
  } catch (err) {
    console.log(`Result: ERROR (${err.name}: ${err.message})`);
    return 'fail';
  }
}

async function testSerpApi() {
  console.log('\n--- 3. SerpApi Google Flights Smoke Test ---');
  const apiKey = process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.log('Status: SKIPPED (SERPAPI_KEY / SERPAPI_API_KEY not set)');
    return 'skip';
  }
  const start = Date.now();
  try {
    const tomorrow = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);
    const params = new URLSearchParams({
      engine: 'google_flights',
      departure_id: 'BLR',
      arrival_id: 'GOI',
      outbound_date: tomorrow,
      currency: 'INR',
      hl: 'en',
      gl: 'in',
      adults: '1',
      type: '2',
      api_key: apiKey.trim()
    });
    const url = `https://serpapi.com/search.json?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const latency = Date.now() - start;
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Latency: ${latency}ms`);
    if (res.ok) {
      const data = await res.json();
      const bestCount = Array.isArray(data.best_flights) ? data.best_flights.length : 0;
      const otherCount = Array.isArray(data.other_flights) ? data.other_flights.length : 0;
      const total = bestCount + otherCount;
      console.log('Result: SUCCESS');
      console.log(`Offers received: ${total} (Best: ${bestCount}, Other: ${otherCount})`);
      if (total > 0) {
        const sample = (data.best_flights || data.other_flights)[0];
        console.log(`Sample flight: ${sample?.flights?.[0]?.airline} (${sample?.flights?.[0]?.flight_number}), Price: ${sample?.price}`);
      }
      return 'pass';
    } else {
      const errText = await res.text();
      console.log('Result: FAILURE');
      console.log('Error summary:', errText.slice(0, 200));
      return 'fail';
    }
  } catch (err) {
    console.log(`Result: ERROR (${err.name}: ${err.message})`);
    return 'fail';
  }
}

async function testCurrency() {
  console.log('\n--- 4. Currency API Smoke Test ---');
  const start = Date.now();
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/INR', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    const latency = Date.now() - start;
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Latency: ${latency}ms`);
    if (res.ok) {
      const data = await res.json();
      console.log('Result: SUCCESS');
      console.log(`Base: ${data.base_code || data.base}`);
      console.log(`Rates available: USD=${data.rates?.USD}, EUR=${data.rates?.EUR}, GBP=${data.rates?.GBP}, INR=${data.rates?.INR}`);
      return 'pass';
    } else {
      console.log('Result: FAILURE');
      return 'fail';
    }
  } catch (err) {
    console.log(`Result: ERROR (${err.name}: ${err.message})`);
    return 'fail';
  }
}

async function testNominatim() {
  console.log('\n--- 5. Nominatim Geocoding Smoke Test ---');
  const cities = ['Bengaluru', 'Delhi', 'Goa'];
  let allPassed = true;
  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const reqStart = Date.now();
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AITravelPlanner-Backend/1.0' },
        signal: AbortSignal.timeout(5000)
      });
      const latency = Date.now() - reqStart;
      if (res.ok) {
        const data = await res.json();
        console.log(`City: ${city} -> Status: ${res.status}, Latency: ${latency}ms, Lat: ${data[0]?.lat}, Lon: ${data[0]?.lon}`);
      } else {
        allPassed = false;
        console.log(`City: ${city} -> Status: ${res.status}, Latency: ${latency}ms, FAIL`);
      }
    } catch (err) {
      allPassed = false;
      console.log(`City: ${city} -> ERROR: ${err.message}`);
    }
    // Space requests in the loop over cities at least 1 second apart, accounting for request duration
    if (i < cities.length - 1) {
      const elapsed = Date.now() - reqStart;
      const waitTime = Math.max(0, 1000 - elapsed);
      if (waitTime > 0) {
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }
  return allPassed ? 'pass' : 'fail';
}

async function testOSRM() {
  console.log('\n--- 6. OSRM Routing Smoke Test ---');
  // Bangalore [12.9716, 77.5946] to Mysore [12.3052, 76.6554]
  const lon1 = 77.5946, lat1 = 12.9716;
  const lon2 = 76.6554, lat2 = 12.3052;
  const start = Date.now();
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AITravelPlanner-Backend/1.0' },
      signal: AbortSignal.timeout(6000)
    });
    const latency = Date.now() - start;
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Latency: ${latency}ms`);
    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      const distKm = Math.round(route?.distance / 1000);
      const durMin = Math.round(route?.duration / 60);
      console.log('Result: SUCCESS');
      console.log(`Distance: ${distKm} km, Duration: ${durMin} mins (${Math.floor(durMin/60)}h ${durMin%60}m)`);
      console.log(`Geometry points: ${route?.geometry?.coordinates?.length || 0}`);
      return 'pass';
    } else {
      console.log(`Result: FAILURE (${res.status})`);
      return 'fail';
    }
  } catch (err) {
    console.log(`Result: ERROR (${err.name}: ${err.message})`);
    return 'fail';
  }
}

async function testMongo() {
  console.log('\n--- 7. MongoDB Connection Smoke Test ---');
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.log('Status: SKIPPED (MONGO_URI not set)');
    return 'skip';
  }
  const mongoose = (await import('../backend/node_modules/mongoose/index.js')).default;
  const start = Date.now();
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const latency = Date.now() - start;
    console.log('Result: SUCCESS');
    console.log(`Latency: ${latency}ms`);
    console.log(`Connection state: ${conn.connection.readyState} (1 = connected)`);
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Database name: ${conn.connection.name}`);
    await mongoose.disconnect();
    return 'pass';
  } catch (err) {
    const latency = Date.now() - start;
    console.log(`Result: FAILURE after ${latency}ms`);
    console.log(`Error: ${err.name} - ${err.message}`);
    return 'fail';
  }
}

async function testAuthJWT() {
  console.log('\n--- 8. Auth / JWT Smoke Test ---');
  const jwt = (await import('../backend/node_modules/jsonwebtoken/index.js')).default;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.log('Status: SKIPPED (JWT_SECRET not set in environment)');
    return 'skip';
  }
  try {
    const token = jwt.sign({ id: 'test_user_1', email: 'test@example.com', name: 'Tester' }, secret, { expiresIn: '7d' });
    const decoded = jwt.verify(token, secret);
    console.log('Token generation & verification: SUCCESS');
    console.log(`Decoded user email: ${decoded.email}, name: ${decoded.name}`);
    // Test invalid secret rejection
    try {
      jwt.verify(token, 'wrong_secret');
      console.log('Invalid secret rejection: FAILED');
      return 'fail';
    } catch {
      console.log('Invalid secret rejection: SUCCESS (correctly rejected)');
      return 'pass';
    }
  } catch (err) {
    console.log(`Auth test error: ${err.message}`);
    return 'fail';
  }
}

async function run() {
  const results = {
    gemini: await testGemini(),
    weather: await testOpenWeather(),
    serpApi: await testSerpApi(),
    currency: await testCurrency(),
    nominatim: await testNominatim(),
    osrm: await testOSRM(),
    mongo: await testMongo(),
    authJWT: await testAuthJWT()
  };
  console.log('\n=== SMOKE TESTS COMPLETE ===');
  console.log(JSON.stringify(results, null, 2));

  const hasFail = Object.values(results).some(outcome => outcome === 'fail');
  if (hasFail) {
    process.exitCode = 1;
  }
}

run();
