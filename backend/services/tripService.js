import mongoose from 'mongoose';
import { Trip } from '../models/Trip.js';
import { isMongoConnected, loadLocalTrips, saveLocalTrips } from '../models/db.js';
import { geocodeLocation, isValidCoordinate } from './geoService.js';

/**
 * Backward-compatible trip normalization helper.
 * Ensures legacy trips lacking transportMode or metadata resolve predictably without crashing.
 */
export const normalizeTrip = (trip) => {
  if (!trip) return trip;
  const raw = typeof trip.toObject === 'function' ? trip.toObject() : { ...trip };
  if (!raw.transportMode) {
    raw.transportMode = (raw.options?.own && (!raw.options?.flight || raw.options.flight.length === 0)) ? 'own' : 'flight';
  }
  return raw;
};

/**
 * Create a new trip for the authenticated user.
 * userEmail is always the server-verified identity — never client-provided.
 * Origin and destination coordinates are validated and canonicalized authoritatively.
 */
export const createTrip = async (tripData, userEmail) => {
  const data = { ...tripData };
  data.userEmail = userEmail;
  delete data._id;

  // Validate and canonicalize origin and destination coordinates authoritatively
  if (data.from) {
    const fromGeo = await geocodeLocation(data.from);
    if (fromGeo.status === 'GEOCODED') {
      data.coordinates = data.coordinates || {};
      data.coordinates.from = [fromGeo.latitude, fromGeo.longitude];
      data.canonicalLocations = data.canonicalLocations || {};
      data.canonicalLocations.from = fromGeo;
    } else if (data.coordinates?.from) {
      const [lat, lon] = data.coordinates.from;
      if (!isValidCoordinate(lat, lon)) {
        const err = new Error(`Invalid geographic coordinates provided for origin "${data.from}".`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  if (data.to) {
    const toGeo = await geocodeLocation(data.to);
    if (toGeo.status === 'GEOCODED') {
      data.coordinates = data.coordinates || {};
      data.coordinates.to = [toGeo.latitude, toGeo.longitude];
      data.canonicalLocations = data.canonicalLocations || {};
      data.canonicalLocations.to = toGeo;
    } else if (data.coordinates?.to) {
      const [lat, lon] = data.coordinates.to;
      if (!isValidCoordinate(lat, lon)) {
        const err = new Error(`Invalid geographic coordinates provided for destination "${data.to}".`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  if (data.coordinates?.from && data.coordinates?.to) {
    data.coordinates.mid = [
      (data.coordinates.from[0] + data.coordinates.to[0]) / 2,
      (data.coordinates.from[1] + data.coordinates.to[1]) / 2
    ];
  }

  if (isMongoConnected()) {
    const savedTrip = new Trip(data);
    await savedTrip.save();
    return normalizeTrip(savedTrip);
  } else {
    const trips = loadLocalTrips();
    const newTrip = { ...data, _id: Date.now().toString(), createdAt: new Date().toISOString() };
    trips.unshift(newTrip);
    saveLocalTrips(trips);
    return normalizeTrip(newTrip);
  }
};

/** @alias createTrip */
export const saveTrip = createTrip;

/**
 * Get all trips belonging to the authenticated user.
 */
export const getUserTrips = async (userEmail) => {
  if (isMongoConnected()) {
    const trips = await Trip.find({ userEmail }).sort({ createdAt: -1 });
    return trips.map(normalizeTrip);
  } else {
    const trips = loadLocalTrips();
    const filtered = trips.filter(t => t.userEmail === userEmail);
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return filtered.map(normalizeTrip);
  }
};

/**
 * Get a single trip by ID, only if owned by the authenticated user.
 */
export const getTrip = async (tripId, userEmail) => {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      const err = new Error('Invalid trip ID format.');
      err.statusCode = 400;
      throw err;
    }
    const trip = await Trip.findById(tripId);
    if (!trip) {
      const err = new Error('Trip not found.');
      err.statusCode = 404;
      throw err;
    }
    if (trip.userEmail !== userEmail) {
      const err = new Error('You are not authorized to view this trip.');
      err.statusCode = 403;
      throw err;
    }
    return normalizeTrip(trip);
  } else {
    const trips = loadLocalTrips();
    const trip = trips.find(t => (t._id === tripId || t.id === tripId));
    if (!trip) {
      const err = new Error('Trip not found.');
      err.statusCode = 404;
      throw err;
    }
    if (trip.userEmail !== userEmail) {
      const err = new Error('You are not authorized to view this trip.');
      err.statusCode = 403;
      throw err;
    }
    return normalizeTrip(trip);
  }
};

/**
 * Delete a trip by ID, only if owned by the authenticated user.
 */
export const deleteTrip = async (tripId, userEmail) => {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      const err = new Error('Invalid trip ID format.');
      err.statusCode = 400;
      throw err;
    }
    const trip = await Trip.findById(tripId);
    if (!trip) {
      const err = new Error('Trip not found.');
      err.statusCode = 404;
      throw err;
    }
    if (trip.userEmail !== userEmail) {
      const err = new Error('You are not authorized to delete this trip.');
      err.statusCode = 403;
      throw err;
    }
    await Trip.findByIdAndDelete(tripId);
    return { message: 'Trip successfully deleted.' };
  } else {
    const trips = loadLocalTrips();
    const tripIndex = trips.findIndex(t => t._id === tripId || t.id === tripId);
    if (tripIndex === -1) {
      const err = new Error('Trip not found.');
      err.statusCode = 404;
      throw err;
    }
    if (trips[tripIndex].userEmail !== userEmail) {
      const err = new Error('You are not authorized to delete this trip.');
      err.statusCode = 403;
      throw err;
    }
    trips.splice(tripIndex, 1);
    saveLocalTrips(trips);
    return { message: 'Trip successfully deleted.' };
  }
};

/** @alias deleteTrip */
export const deleteUserTrip = deleteTrip;
