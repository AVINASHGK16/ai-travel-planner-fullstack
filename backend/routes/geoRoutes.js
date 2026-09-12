import { Router } from 'express';
import { geocodeLocation, getRoute } from '../services/geoService.js';
import { validateQuery, validateBody, geocodeQuerySchema, routeBodySchema } from '../validators.js';

const router = Router();

// GET /api/geo/geocode?q=city_name
router.get('/geocode', validateQuery(geocodeQuerySchema), async (req, res, next) => {
  try {
    const { q } = req.validatedQuery;
    const location = await geocodeLocation(q);
    if (location.status === 'FAILED_TO_GEOCODE') {
      return res.status(404).json(location);
    }
    res.json(location);
  } catch (error) {
    next(error);
  }
});

// POST /api/geo/route
router.post('/route', validateBody(routeBodySchema), async (req, res, next) => {
  try {
    const { origin, destination, mode } = req.validatedBody;
    const route = await getRoute(origin, destination, mode);
    res.json(route);
  } catch (error) {
    next(error);
  }
});

export default router;
