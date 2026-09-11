import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './models/db.js';
import { initAuth } from './services/authService.js';
import { generalLimiter } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize core services
initAuth();
initDatabase();

// ─── Configured Origins & CORS ─────────────────────────────────
const rawFrontendUrls = process.env.FRONTEND_URL || 'http://localhost:5173';
const configuredOrigins = rawFrontendUrls
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

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
    if (!origin) return callback(null, true);
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

// General Rate Limiter on all API routes
app.use('/api/', generalLimiter);

// ─── Route Handlers ────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api', aiRoutes);
app.use('/api', weatherRoutes);

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

// ─── Centralized Error Handling Middleware ──────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server executing successfully on http://localhost:${PORT}`);
});

export default app;
