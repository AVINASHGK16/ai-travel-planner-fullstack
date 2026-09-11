import mongoose from 'mongoose';
import { Trip } from '../models/Trip.js';
import { isMongoConnected, loadLocalTrips, saveLocalTrips } from '../models/db.js';

export const saveTrip = async (tripData, userEmail) => {
  const data = { ...tripData };
  data.userEmail = userEmail;
  delete data._id;

  if (isMongoConnected()) {
    const savedTrip = new Trip(data);
    await savedTrip.save();
    return savedTrip;
  } else {
    const trips = loadLocalTrips();
    const newTrip = { ...data, _id: Date.now().toString(), createdAt: new Date().toISOString() };
    trips.unshift(newTrip);
    saveLocalTrips(trips);
    return newTrip;
  }
};

export const getUserTrips = async (userEmail) => {
  if (isMongoConnected()) {
    return await Trip.find({ userEmail }).sort({ createdAt: -1 });
  } else {
    const trips = loadLocalTrips();
    const filtered = trips.filter(t => t.userEmail === userEmail);
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return filtered;
  }
};

export const deleteUserTrip = async (tripId, userEmail) => {
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
