import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import * as authService from '../services/authService.js';

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.', code: 'AUTH_REQUIRED' });
  }

  if (authService.isTokenRevoked(token)) {
    return res.status(401).json({ error: 'Session has been invalidated. Please sign in again.', code: 'TOKEN_REVOKED' });
  }

  try {
    const secret = authService.getJwtSecret();
    const decoded = jwt.verify(token, secret);
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

// ─── Rate Limiters ─────────────────────────────────────────────
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes before trying again.' }
});

export const aiGenerateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI trip generation rate limit exceeded. Please wait before generating more itineraries.' }
});

export const aiChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI chat assistant rate limit exceeded. Please wait a moment before sending more messages.' }
});

export const weatherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Weather lookup rate limit exceeded. Please wait before requesting more weather forecasts.' }
});

export const tripsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many trip management requests. Please try again later.' }
});
