import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// JSON File Database Fallback details
const LOCAL_DB_PATH = path.join(__dirname, 'saved_trips.json');

const loadLocalTrips = () => {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify([]));
    return [];
  }
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading local trips file, resetting database:', err);
    return [];
  }
};

const saveLocalTrips = (trips) => {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(trips, null, 2));
};

// MongoDB setup
let mongoConnected = false;
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log('MongoDB successfully connected.');
      mongoConnected = true;
    })
    .catch((err) => {
      console.warn('MongoDB connection failed. Running database in JSON fallback mode:', err.message);
    });
} else {
  console.log('No MONGO_URI provided in environment. Running database in JSON fallback mode.');
}

// MongoDB schema definition
const TripSchema = new mongoose.Schema({
  userEmail: String,
  from: String,
  to: String,
  date: String,
  returnDate: String,
  travelers: Number,
  budget: Number,
  distance: Number,
  coordinates: {
    from: [Number],
    to: [Number],
    mid: [Number]
  },
  options: mongoose.Schema.Types.Mixed,
  suggestions: mongoose.Schema.Types.Mixed,
  itinerary: mongoose.Schema.Types.Mixed,
  budgetDetails: mongoose.Schema.Types.Mixed,
  roadTripDetails: mongoose.Schema.Types.Mixed,
  weather: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);

// API Endpoints

// 1. Generate travel plan / AI endpoint
app.post('/api/generate', async (req, res) => {
  const { from, to, date, returnDate, travelers, budget, preferredMode, geminiKey } = req.body;
  
  const keyToUse = geminiKey || process.env.GEMINI_API_KEY;
  
  if (!keyToUse) {
    return res.status(400).json({ error: 'Gemini API Key is missing. Add it in settings or config.' });
  }

  const promptText = `
    You are a professional travel coordinator. Generate a comprehensive travel plan for a trip from "${from}" to "${to}" on "${date}" ${returnDate ? `returning on "${returnDate}"` : ''} for ${travelers} travelers.
    The budget is approximately INR/USD ${budget}. Preferred travel mode: ${preferredMode || 'any'}.
    
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
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error with status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json(JSON.parse(rawText.trim()));
  } catch (error) {
    console.error('Express AI generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Fetch weather details
app.get('/api/weather', async (req, res) => {
  const { city, weatherKey } = req.query;
  const apiKey = weatherKey || process.env.WEATHER_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'OpenWeather API Key is missing.' });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error fetching from weather service');
    }
    
    res.json({
      temp: `${Math.round(data.main.temp)}°C`,
      condition: data.weather[0].main,
      windSpeed: `${Math.round(data.wind.speed * 3.6)} km/h`,
      rainAlert: data.rain ? 'Possible light showers expected' : 'Clear dry weather forecast'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Save trip itinerary
app.post('/api/trips', async (req, res) => {
  const tripData = req.body;
  
  try {
    if (mongoConnected) {
      const savedTrip = new Trip(tripData);
      await savedTrip.save();
      res.status(201).json(savedTrip);
    } else {
      const trips = loadLocalTrips();
      const newTrip = { ...tripData, _id: Date.now().toString(), createdAt: new Date() };
      trips.unshift(newTrip);
      saveLocalTrips(trips);
      res.status(201).json(newTrip);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Retrieve saved trips
app.get('/api/trips', async (req, res) => {
  const { email } = req.query;
  try {
    if (mongoConnected) {
      const query = email ? { userEmail: email } : {};
      const trips = await Trip.find(query).sort({ createdAt: -1 });
      res.json(trips);
    } else {
      const trips = loadLocalTrips();
      const filtered = email ? trips.filter(t => t.userEmail === email) : trips;
      res.json(filtered);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Delete saved trip
app.delete('/api/trips/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    if (mongoConnected) {
      await Trip.findByIdAndDelete(id);
      res.json({ message: 'Trip successfully deleted.' });
    } else {
      const trips = loadLocalTrips();
      const filtered = trips.filter(t => t._id !== id);
      saveLocalTrips(filtered);
      res.json({ message: 'Trip successfully deleted.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend React application in production
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*all', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('AI Travel Planner Express Server is operational. Run build script to serve frontend files.');
  });
}

app.listen(PORT, () => {
  console.log(`Server executing successfully on http://localhost:${PORT}`);
});
