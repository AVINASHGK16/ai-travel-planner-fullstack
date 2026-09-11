import express from 'express';
import * as tripService from '../services/tripService.js';
import { authenticateToken, tripsLimiter, asyncHandler } from '../middleware/auth.js';
import { validateBody, validateParams, saveTripSchema, tripIdParamSchema } from '../validators.js';

const router = express.Router();

// Save trip itinerary
router.post('/', tripsLimiter, authenticateToken, validateBody(saveTripSchema), asyncHandler(async (req, res) => {
  const savedTrip = await tripService.saveTrip(req.validatedBody, req.user.email);
  res.status(201).json(savedTrip);
}));

// Retrieve saved trips for authenticated user
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const trips = await tripService.getUserTrips(req.user.email);
  res.json(trips);
}));

// Delete saved trip
router.delete('/:id', tripsLimiter, authenticateToken, validateParams(tripIdParamSchema), asyncHandler(async (req, res) => {
  const result = await tripService.deleteUserTrip(req.validatedParams.id, req.user.email);
  res.json(result);
}));

export default router;
