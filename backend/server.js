import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import {
  validateBody,
  validateQuery,
  validateParams,
  generateTripSchema,
  weatherQuerySchema,
  saveTripSchema,
  tripIdParamSchema,
  authRegisterSchema,
  authLoginSchema,
  chatSchema
} from './validators.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// ─── Security Configuration ────────────────────────────────────
// In-memory token revocation blacklist (for true server-side invalidation on logout)
const revokedTokens = new Set();

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (isProduction) {
    console.error('❌ FATAL: JWT_SECRET environment variable is required in production. Server refusing to start.');
    process.exit(1);
  } else {
    // Generate an ephemeral in-memory random secret per dev run — NEVER embed static fallback secrets in source code
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  NOTICE: JWT_SECRET is not set in development. Generated an ephemeral in-memory random secret for this session. Set JWT_SECRET in backend/.env for persistent sessions across restarts.');
  }
}

// Configured frontend origin(s)
const rawFrontendUrls = process.env.FRONTEND_URL || 'http://localhost:5173';
const configuredOrigins = rawFrontendUrls
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

// In development, also permit standard localhost dev origins
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:5000'];
const allowedOrigins = isProduction
  ? configuredOrigins
  : Array.from(new Set([...configuredOrigins, ...devOrigins]));

// ─── Security Headers (Helmet) ─────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.openstreetmap.org", "https://images.unsplash.com"],
      connectSrc: ["'self'", ...allowedOrigins],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"]
    }
  }
}));

// ─── Controlled CORS Configuration ─────────────────────────────
const corsOptions = {
  origin: function (origin, callback) {
    // Requests with no origin (curl, same-origin, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parser with size limit to prevent payload attacks
app.use(express.json({ limit: '250kb' }));

// ─── Rate Limiting ─────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes before trying again.' }
});

const aiGenerateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI trip generation rate limit exceeded. Please wait before generating more itineraries.' }
});

const aiChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI chat assistant rate limit exceeded. Please wait a moment before sending more messages.' }
});

const weatherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Weather lookup rate limit exceeded. Please wait before requesting more weather forecasts.' }
});

const tripsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many trip management requests. Please try again later.' }
});

app.use('/api/', generalLimiter);

// ─── Validation Helpers ─────────────────────────────────────────
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const sanitize = (str, maxLen = 500) => (typeof str === 'string' ? str.trim().slice(0, maxLen) : '');

// ─── JSON File Database Fallback ────────────────────────────────
const LOCAL_DB_PATH = path.join(__dirname, 'saved_trips.json');
const LOCAL_USERS_PATH = path.join(__dirname, 'users.json');

const loadLocalTrips = () => {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify([]));
    return [];
  }
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    const trips = JSON.parse(data || '[]');
    if (!Array.isArray(trips)) return [];

    // Defensive normalization for legacy persisted records without deleting them
    return trips.map(trip => {
      if (!trip || typeof trip !== 'object') return { _id: Date.now().toString(), date: 'Unknown Date' };

      // Fix legacy date typo like 72026-02-02 -> 2026-02-02
      if (typeof trip.date === 'string' && /^7\d{4}-\d{2}-\d{2}$/.test(trip.date)) {
        trip.date = trip.date.slice(1);
      } else if (!trip.date || typeof trip.date !== 'string') {
        trip.date = 'Unknown Date';
      }

      // Ensure returnDate is string or null
      if (trip.returnDate !== undefined && typeof trip.returnDate !== 'string') {
        trip.returnDate = null;
      }

      // Ensure boolean/fallback fields for AI tracking
      if (trip.isAIGenerated !== undefined) {
        trip.isAIGenerated = Boolean(trip.isAIGenerated);
      }

      return trip;
    });
  } catch (err) {
    console.error('Error reading local trips file, serving empty fallback:', err.message);
    return [];
  }
};

const saveLocalTrips = (trips) => {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(trips, null, 2));
};

const loadLocalUsers = () => {
  if (!fs.existsSync(LOCAL_USERS_PATH)) {
    fs.writeFileSync(LOCAL_USERS_PATH, JSON.stringify([]));
    return [];
  }
  try {
    const data = fs.readFileSync(LOCAL_USERS_PATH, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading local users file, resetting:', err);
    return [];
  }
};

const saveLocalUsers = (users) => {
  fs.writeFileSync(LOCAL_USERS_PATH, JSON.stringify(users, null, 2));
};

// ─── MongoDB Setup ──────────────────────────────────────────────
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

// ─── Mongoose Schemas ───────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

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
  weather: mongoose.Schema.Types.Mixed,
  tripDays: Number,
  isAIGenerated: Boolean,
  generationSource: String,
  generationNotice: String
}, { timestamps: true });

const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);

// ─── Authentication Middleware ──────────────────────────────────

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.', code: 'AUTH_REQUIRED' });
  }

  // Check if token has been explicitly revoked via logout
  if (revokedTokens.has(token)) {
    return res.status(401).json({ error: 'Session has been invalidated. Please sign in again.', code: 'TOKEN_REVOKED' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, name }
    req.token = token;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Session expired. Please sign in again.'
      : 'Invalid session token. Please sign in again.';
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    return res.status(401).json({ error: message, code });
  }
};

// ═══════════════════════════════════════════════════════════════
//  AUTH API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Register
app.post('/api/auth/register', authLimiter, validateBody(authRegisterSchema), async (req, res) => {
  const { name, email, password } = req.validatedBody;
  const normalizedEmail = email.toLowerCase().trim();
  const userName = (name && name.trim()) || normalizedEmail.split('@')[0];

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    if (mongoConnected) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const user = new User({ name: userName, email: normalizedEmail, password: hashedPassword });
      await user.save();

      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: { id: user._id.toString(), _id: user._id.toString(), name: user.name, email: user.email }
      });
    } else {
      // JSON fallback
      const users = loadLocalUsers();
      const existing = users.find(u => u.email === normalizedEmail);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const newUser = {
        _id: Date.now().toString(),
        name: userName,
        email: normalizedEmail,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      saveLocalUsers(users);

      const token = jwt.sign(
        { id: newUser._id, email: newUser.email, name: newUser.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: { id: newUser._id, _id: newUser._id, name: newUser.name, email: newUser.email }
      });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
app.post('/api/auth/login', authLimiter, validateBody(authLoginSchema), async (req, res) => {
  const { email, password } = req.validatedBody;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    let user;

    if (mongoConnected) {
      user = await User.findOne({ email: normalizedEmail });
    } else {
      const users = loadLocalUsers();
      user = users.find(u => u.email === normalizedEmail);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userIdStr = (user._id || user.id).toString();
    const token = jwt.sign(
      { id: userIdStr, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: userIdStr, _id: userIdStr, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Validate token / Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    user: { id: req.user.id, _id: req.user.id, name: req.user.name, email: req.user.email }
  });
});

// Logout / Revoke Token (Server-side Session Invalidation)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  if (req.token) {
    revokedTokens.add(req.token);
    // Auto-purge token from memory after 7 days (its max lifetime)
    setTimeout(() => {
      revokedTokens.delete(req.token);
    }, 7 * 24 * 60 * 60 * 1000);
  }
  res.json({ message: 'Session successfully revoked and logged out.' });
});

// ═══════════════════════════════════════════════════════════════
//  AI API ENDPOINTS (proxied — keys stay server-side)
// ═══════════════════════════════════════════════════════════════

// 1. Generate travel plan
app.post('/api/generate', aiGenerateLimiter, validateBody(generateTripSchema), async (req, res) => {
  const { from, to, date, returnDate, travelers, budget, preferredMode } = req.validatedBody;

  // Security: API key is exclusively read from server environment
  const keyToUse = process.env.GEMINI_API_KEY;

  if (!keyToUse) {
    return res.status(503).json({
      error: 'Gemini AI service is not configured on the server. Please set GEMINI_API_KEY in server environment.'
    });
  }

  const sanitizedFrom = from;
  const sanitizedTo = to;
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
        return res.status(429).json({
          error: 'Gemini AI quota or rate limit exceeded. Please try again later.',
          code: 'AI_QUOTA_EXCEEDED'
        });
      }
      if (response.status === 503 || response.status === 500) {
        return res.status(503).json({
          error: 'Gemini AI service is temporarily overloaded. Please try again later.',
          code: 'AI_OVERLOADED'
        });
      }
      if (response.status === 400 || response.status === 403) {
        return res.status(503).json({
          error: 'Gemini AI service configuration or authentication error on server.',
          code: 'AI_UNCONFIGURED'
        });
      }
      return res.status(502).json({
        error: `Gemini AI returned error status ${response.status}.`,
        code: 'AI_UPSTREAM_ERROR'
      });
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;

    // Check for safety block or non-standard termination
    if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
      return res.status(502).json({
        error: `Gemini AI generation was halted (${finishReason}).`,
        code: 'AI_SAFETY_OR_STOP'
      });
    }

    const rawText = candidate?.content?.parts?.[0]?.text;
    if (!rawText || !rawText.trim()) {
      return res.status(502).json({
        error: 'Gemini AI returned an empty response.',
        code: 'AI_EMPTY_RESPONSE'
      });
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
      return res.status(502).json({
        error: 'Gemini AI returned an invalid JSON response structure.',
        code: 'AI_MALFORMED_JSON'
      });
    }

    // Validate essential schema components
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.itinerary) || parsed.itinerary.length === 0) {
      return res.status(502).json({
        error: 'Gemini AI returned an incomplete plan structure (missing itinerary).',
        code: 'AI_INCOMPLETE_RESPONSE'
      });
    }

    // Return confirmed AI-generated response
    res.json({
      ...parsed,
      isAIGenerated: true
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Gemini AI generation timed out on the server.',
        code: 'AI_TIMEOUT'
      });
    }
    console.error('Express AI generation error:', String(error?.message || error).replace(/key=[^&\s]+/g, 'key=REDACTED'));
    res.status(500).json({ error: 'Failed to generate travel plan. Please try again later.', code: 'SERVER_ERROR' });
  }
});

// 2. Chat with AI assistant (proxied — key stays server-side)
app.post('/api/chat', aiChatLimiter, validateBody(chatSchema), async (req, res) => {
  const { message, chatHistory, tripContext } = req.validatedBody;

  // Security: API key is exclusively read from server environment
  const keyToUse = process.env.GEMINI_API_KEY;

  if (!keyToUse) {
    return res.status(503).json({ error: 'Gemini AI service is not configured on the server.' });
  }

  const sanitizedMessage = sanitize(message, 1000);

  // Build system prompt with trip context
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

  // Add chat history (limit to last 20 messages)
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

  // Add current message
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
        return res.status(429).json({ error: 'AI chat quota or rate limit exceeded.', code: 'AI_QUOTA_EXCEEDED' });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    res.json({ reply: reply || "I'm sorry, I couldn't process that. Can you try again?" });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(504).json({ error: 'AI chat response timed out.', code: 'AI_TIMEOUT' });
    }
    console.error('Chat AI error:', String(error?.message || error).replace(/key=[^&\s]+/g, 'key=REDACTED'));
    res.status(500).json({ error: 'Failed to process chat message. Please try again later.' });
  }
});

// 3. Fetch weather details (key stays server-side only)
app.get('/api/weather', weatherLimiter, validateQuery(weatherQuerySchema), async (req, res) => {
  const { city } = req.validatedQuery;
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'OpenWeather API Key is not configured on the server.',
      code: 'WEATHER_UNCONFIGURED'
    });
  }

  const sanitizedCity = sanitize(city, 100);

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(sanitizedCity)}&appid=${apiKey}&units=metric`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({
          error: `Weather station not found for location "${sanitizedCity}".`,
          code: 'CITY_NOT_FOUND'
        });
      }
      if (response.status === 429) {
        return res.status(429).json({
          error: 'Weather service rate limit reached. Please try again later.',
          code: 'WEATHER_RATE_LIMITED'
        });
      }
      if (response.status === 401 || response.status === 403) {
        return res.status(503).json({
          error: 'Weather service configuration error on server.',
          code: 'WEATHER_UNCONFIGURED'
        });
      }
      return res.status(502).json({
        error: 'Weather service is temporarily unavailable.',
        code: 'WEATHER_UPSTREAM_ERROR'
      });
    }

    const data = await response.json();

    // Validate that temperature data exists and is a valid finite number
    if (typeof data?.main?.temp !== 'number' || isNaN(data.main.temp)) {
      return res.status(502).json({
        error: 'Weather service returned incomplete temperature data.',
        code: 'WEATHER_INCOMPLETE'
      });
    }

    const tempNum = Math.round(data.main.temp);
    const condition = data?.weather?.[0]?.main || data?.weather?.[0]?.description || 'Atmosphere';
    const windSpeedNum = typeof data?.wind?.speed === 'number' && !isNaN(data.wind.speed)
      ? Math.round(data.wind.speed * 3.6)
      : null;
    const windSpeedStr = windSpeedNum !== null ? `${windSpeedNum} km/h` : 'N/A';

    res.json({
      temp: `${tempNum}°C`,
      condition,
      windSpeed: windSpeedStr,
      rainAlert: data?.rain ? 'Possible light showers expected' : 'Clear dry weather forecast'
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Weather request timed out.',
        code: 'WEATHER_TIMEOUT'
      });
    }
    console.error('Weather service error:', String(error?.message || error).replace(/appid=[^&\s]+/g, 'appid=REDACTED'));
    res.status(500).json({ error: 'Failed to retrieve weather data. Please try again later.', code: 'SERVER_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  TRIP API ENDPOINTS (Protected — require authentication)
// ═══════════════════════════════════════════════════════════════

// 4. Save trip itinerary
app.post('/api/trips', tripsLimiter, authenticateToken, validateBody(saveTripSchema), async (req, res) => {
  const tripData = { ...req.validatedBody };

  // SECURITY: Override userEmail with authenticated user — ignore client-supplied value
  tripData.userEmail = req.user.email;
  delete tripData._id;

  try {
    if (mongoConnected) {
      const savedTrip = new Trip(tripData);
      await savedTrip.save();
      res.status(201).json(savedTrip);
    } else {
      const trips = loadLocalTrips();
      const newTrip = { ...tripData, _id: Date.now().toString(), createdAt: new Date().toISOString() };
      trips.unshift(newTrip);
      saveLocalTrips(trips);
      res.status(201).json(newTrip);
    }
  } catch (error) {
    console.error('Save trip error:', error.message || error);
    res.status(500).json({ error: 'Failed to save trip itinerary. Please try again.' });
  }
});

// 5. Retrieve saved trips (only the authenticated user's trips)
app.get('/api/trips', authenticateToken, async (req, res) => {
  try {
    if (mongoConnected) {
      // SECURITY: Filter by authenticated user's email — not a query param
      const trips = await Trip.find({ userEmail: req.user.email }).sort({ createdAt: -1 });
      res.json(trips);
    } else {
      const trips = loadLocalTrips();
      const filtered = trips.filter(t => t.userEmail === req.user.email);
      // Consistent sorting with MongoDB ({ createdAt: -1 })
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      res.json(filtered);
    }
  } catch (error) {
    console.error('Fetch trips error:', error.message || error);
    res.status(500).json({ error: 'Failed to retrieve trips. Please try again.' });
  }
});

// 6. Delete saved trip (with ownership verification)
app.delete('/api/trips/:id', tripsLimiter, authenticateToken, validateParams(tripIdParamSchema), async (req, res) => {
  const { id } = req.validatedParams;

  try {
    if (mongoConnected) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid trip ID format.' });
      }
      const trip = await Trip.findById(id);
      if (!trip) {
        return res.status(404).json({ error: 'Trip not found.' });
      }
      // SECURITY: Verify the trip belongs to the authenticated user
      if (trip.userEmail !== req.user.email) {
        return res.status(403).json({ error: 'You are not authorized to delete this trip.' });
      }
      await Trip.findByIdAndDelete(id);
      res.json({ message: 'Trip successfully deleted.' });
    } else {
      const trips = loadLocalTrips();
      const tripIndex = trips.findIndex(t => t._id === id);
      if (tripIndex === -1) {
        return res.status(404).json({ error: 'Trip not found.' });
      }
      // SECURITY: Verify ownership
      if (trips[tripIndex].userEmail !== req.user.email) {
        return res.status(403).json({ error: 'You are not authorized to delete this trip.' });
      }
      trips.splice(tripIndex, 1);
      saveLocalTrips(trips);
      res.json({ message: 'Trip successfully deleted.' });
    }
  } catch (error) {
    console.error('Delete trip error:', error.message || error);
    res.status(500).json({ error: 'Failed to delete trip. Please try again.' });
  }
});

// ─── Serve frontend React application in production ─────────────
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

// ─── Global Error Handling Middleware ───────────────────────────
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large. Maximum allowed request body size is 250kb.' });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload.' });
  }
  if (err.message === 'CORS origin not allowed' || err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS origin not allowed.' });
  }
  console.error('Unhandled server error:', err.message || err);
  res.status(500).json({ error: 'An unexpected internal error occurred.' });
});

app.listen(PORT, () => {
  console.log(`Server executing successfully on http://localhost:${PORT}`);
});
