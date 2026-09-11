import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const LOCAL_DB_PATH = path.join(__dirname, '..', 'saved_trips.json');
export const LOCAL_USERS_PATH = path.join(__dirname, '..', 'users.json');

let mongoConnected = false;

export const isMongoConnected = () => mongoConnected;

export const initDatabase = () => {
  const MONGO_URI = process.env.MONGO_URI;

  if (MONGO_URI) {
    mongoose.connection.on('connected', () => {
      console.log('MongoDB successfully connected.');
      mongoConnected = true;
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Running database in JSON fallback mode.');
      mongoConnected = false;
    });
    mongoose.connection.on('error', (err) => {
      console.warn('MongoDB connection error. Running database in JSON fallback mode:', err.message);
      mongoConnected = false;
    });
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected.');
      mongoConnected = true;
    });

    mongoose
      .connect(MONGO_URI)
      .catch((err) => {
        console.warn('MongoDB initial connection failed. Running database in JSON fallback mode:', err.message);
        mongoConnected = false;
      });
  } else {
    console.log('No MONGO_URI provided in environment. Running database in JSON fallback mode.');
  }
};

// Atomic write to disk using temp file + rename to prevent partial/corrupted writes
export const atomicWriteJson = (filePath, data) => {
  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {}
    throw err;
  }
};

export const loadLocalTrips = () => {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    try {
      atomicWriteJson(LOCAL_DB_PATH, []);
    } catch {}
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

export const saveLocalTrips = (trips) => {
  atomicWriteJson(LOCAL_DB_PATH, trips);
};

export const loadLocalUsers = () => {
  if (!fs.existsSync(LOCAL_USERS_PATH)) {
    try {
      atomicWriteJson(LOCAL_USERS_PATH, []);
    } catch {}
    return [];
  }
  try {
    const data = fs.readFileSync(LOCAL_USERS_PATH, 'utf-8');
    const users = JSON.parse(data || '[]');
    return Array.isArray(users) ? users : [];
  } catch (err) {
    console.error('Error reading local users file, resetting:', err.message);
    return [];
  }
};

export const saveLocalUsers = (users) => {
  atomicWriteJson(LOCAL_USERS_PATH, users);
};
