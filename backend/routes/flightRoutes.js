import express from 'express';
import { flightService } from '../services/flightService.js';
import { flightSearchLimiter, asyncHandler } from '../middleware/auth.js';
import { validateQuery, flightSearchQuerySchema } from '../validators.js';

const router = express.Router();

/**
 * GET /api/flights/search
 * Query parameters:
 *  - origin (string, required): City name or 3-letter IATA code
 *  - destination (string, required): City name or 3-letter IATA code
 *  - date (string, required): YYYY-MM-DD
 *  - passengers (number, optional, default: 1): 1-9
 *  - cabin (string, optional, default: 'economy'): 'economy' | 'premium_economy' | 'business' | 'first'
 *  - allowEstimate (boolean, optional, default: false)
 */
router.get(
  '/search',
  flightSearchLimiter,
  validateQuery(flightSearchQuerySchema),
  asyncHandler(async (req, res) => {
    const { origin, destination, date, passengers, cabin, allowEstimate } = req.validatedQuery;
    const result = await flightService.searchFlights({
      origin,
      destination,
      date,
      passengers,
      cabin,
      allowEstimateFallback: allowEstimate
    });
    res.json(result);
  })
);

export default router;
