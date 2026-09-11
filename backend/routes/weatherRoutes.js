import express from 'express';
import * as weatherService from '../services/weatherService.js';
import { weatherLimiter, asyncHandler } from '../middleware/auth.js';
import { validateQuery, weatherQuerySchema } from '../validators.js';

const router = express.Router();

router.get('/weather', weatherLimiter, validateQuery(weatherQuerySchema), asyncHandler(async (req, res) => {
  const result = await weatherService.getWeather(req.validatedQuery.city);
  res.json(result);
}));

export default router;
