import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { isMongoConnected, loadLocalUsers, saveLocalUsers } from '../models/db.js';

// In-memory token revocation blacklist (for server-side invalidation on logout)
const revokedTokens = new Set();

const isProduction = process.env.NODE_ENV === 'production';
let JWT_SECRET = process.env.JWT_SECRET;

export const initAuth = () => {
  JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    if (isProduction) {
      console.error('❌ FATAL: JWT_SECRET environment variable is required in production. Server refusing to start.');
      process.exit(1);
    } else {
      // Ephemeral in-memory random secret per dev run — never embed static fallback secrets in source code
      JWT_SECRET = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️  NOTICE: JWT_SECRET is not set in development. Generated an ephemeral in-memory random secret for this session. Set JWT_SECRET in backend/.env for persistent sessions across restarts.');
    }
  }
};

export const getJwtSecret = () => {
  if (!JWT_SECRET) initAuth();
  return JWT_SECRET;
};

export const isTokenRevoked = (token) => revokedTokens.has(token);

export const revokeToken = (token) => {
  if (!token) return;
  revokedTokens.add(token);
  // Auto-purge token from memory after 7 days (its max lifetime)
  setTimeout(() => {
    revokedTokens.delete(token);
  }, 7 * 24 * 60 * 60 * 1000);
};

export const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const userName = (name && name.trim()) || normalizedEmail.split('@')[0];
  const secret = getJwtSecret();

  const hashedPassword = await bcrypt.hash(password, 12);

  if (isMongoConnected()) {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      const err = new Error('An account with this email already exists.');
      err.statusCode = 409;
      throw err;
    }

    const user = new User({ name: userName, email: normalizedEmail, password: hashedPassword });
    await user.save();

    const userIdStr = user._id.toString();
    const token = jwt.sign(
      { id: userIdStr, email: user.email, name: user.name },
      secret,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: { id: userIdStr, _id: userIdStr, name: user.name, email: user.email }
    };
  } else {
    // JSON fallback
    const users = loadLocalUsers();
    const existing = users.find(u => u.email === normalizedEmail);
    if (existing) {
      const err = new Error('An account with this email already exists.');
      err.statusCode = 409;
      throw err;
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
      secret,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: { id: newUser._id, _id: newUser._id, name: newUser.name, email: newUser.email }
    };
  }
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const secret = getJwtSecret();

  let user;
  if (isMongoConnected()) {
    user = await User.findOne({ email: normalizedEmail });
  } else {
    const users = loadLocalUsers();
    user = users.find(u => u.email === normalizedEmail);
  }

  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const userIdStr = (user._id || user.id).toString();
  const token = jwt.sign(
    { id: userIdStr, email: user.email, name: user.name },
    secret,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: { id: userIdStr, _id: userIdStr, name: user.name, email: user.email }
  };
};
