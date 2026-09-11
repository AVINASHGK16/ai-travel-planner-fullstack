import { z } from 'zod';

// ─── Helper Functions ───────────────────────────────────────────
const isValidDateString = (str) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
};

// Safe location/city pattern: letters, numbers, spaces, commas, periods, hyphens, apostrophes
const SAFE_LOCATION_REGEX = /^[a-zA-Z0-9\s,.'\-]+$/;

// Safe ID pattern: alphanumeric, hyphen, underscore, up to 64 chars
const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

// ─── Reusable Validation Middleware ─────────────────────────────
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const details = issues.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return res.status(400).json({
      error: 'Invalid request data',
      details
    });
  }
  req.validatedBody = result.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const details = issues.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return res.status(400).json({
      error: 'Invalid query parameters',
      details
    });
  }
  req.validatedQuery = result.data;
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const details = issues.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return res.status(400).json({
      error: 'Invalid route parameters',
      details
    });
  }
  req.validatedParams = result.data;
  next();
};

// ─── 1. AI Trip Generation Schema (/api/generate) ───────────────
export const generateTripSchema = z.object({
  from: z.string({ required_error: 'Origin location is required' })
    .trim()
    .min(1, 'Origin location cannot be empty')
    .max(100, 'Origin location cannot exceed 100 characters')
    .regex(SAFE_LOCATION_REGEX, 'Origin contains invalid characters'),
  to: z.string({ required_error: 'Destination is required' })
    .trim()
    .min(1, 'Destination cannot be empty')
    .max(100, 'Destination cannot exceed 100 characters')
    .regex(SAFE_LOCATION_REGEX, 'Destination contains invalid characters'),
  date: z.string({ required_error: 'Departure date is required' })
    .trim()
    .refine(isValidDateString, { message: 'Departure date must be a valid date in YYYY-MM-DD format' }),
  returnDate: z.string()
    .trim()
    .optional()
    .nullable()
    .transform(v => (v === '' ? null : v))
    .refine(v => v === null || v === undefined || isValidDateString(v), {
      message: 'Return date must be a valid date in YYYY-MM-DD format'
    }),
  travelers: z.coerce.number({ invalid_type_error: 'Travelers must be a valid number' })
    .int('Travelers must be an integer')
    .min(1, 'At least 1 traveler is required')
    .max(50, 'Maximum 50 travelers allowed')
    .default(1),
  budget: z.coerce.number({ invalid_type_error: 'Budget must be a valid number' })
    .positive('Budget must be greater than zero')
    .min(100, 'Minimum budget is 100')
    .max(10000000, 'Maximum budget is 10,000,000')
    .default(2500),
  preferredMode: z.enum(['any', 'flight', 'train', 'bus', 'cab', 'own'], {
    errorMap: () => ({ message: 'Preferred travel mode must be one of: any, flight, train, bus, cab, own' })
  }).default('any')
}).refine(data => data.from.toLowerCase() !== data.to.toLowerCase(), {
  message: 'Origin and destination must be different locations',
  path: ['to']
}).refine(data => {
  if (data.returnDate && data.date) {
    return data.returnDate >= data.date;
  }
  return true;
}, {
  message: 'Return date cannot be earlier than departure date',
  path: ['returnDate']
});

// ─── 2. Weather Query Schema (/api/weather) ─────────────────────
export const weatherQuerySchema = z.object({
  city: z.string({ required_error: 'City parameter is required' })
    .trim()
    .min(1, 'City name cannot be empty')
    .max(100, 'City name cannot exceed 100 characters')
    .regex(SAFE_LOCATION_REGEX, 'City name contains invalid or malformed characters')
});

// ─── 3. Save Trip Schema (/api/trips) ───────────────────────────
export const saveTripSchema = z.object({
  from: z.string({ required_error: 'Origin is required' })
    .trim()
    .min(1, 'Origin cannot be empty')
    .max(100, 'Origin cannot exceed 100 characters'),
  to: z.string({ required_error: 'Destination is required' })
    .trim()
    .min(1, 'Destination cannot be empty')
    .max(100, 'Destination cannot exceed 100 characters'),
  date: z.string({ required_error: 'Date is required' })
    .trim()
    .refine(isValidDateString, { message: 'Date must be a valid date in YYYY-MM-DD format' }),
  returnDate: z.string()
    .trim()
    .optional()
    .nullable()
    .transform(v => (v === '' ? null : v)),
  travelers: z.coerce.number().int().min(1).max(50).optional().default(1),
  budget: z.coerce.number().min(0).max(10000000).optional(),
  distance: z.union([z.number(), z.string()])
    .optional()
    .transform(v => {
      if (typeof v === 'string') {
        const parsed = parseFloat(v.replace(/[^\d.]/g, ''));
        return isNaN(parsed) ? undefined : parsed;
      }
      return v;
    }),
  coordinates: z.object({
    from: z.array(z.number()).length(2).optional(),
    to: z.array(z.number()).length(2).optional(),
    mid: z.array(z.number()).length(2).optional()
  }).optional(),
  options: z.record(z.any()).optional(),
  suggestions: z.record(z.any()).optional(),
  itinerary: z.array(z.record(z.any())).max(30).optional(),
  budgetDetails: z.record(z.any()).optional(),
  roadTripDetails: z.record(z.any()).optional(),
  weather: z.record(z.any()).optional(),
  // Security: userEmail is intentionally ignored/stripped; it is always overridden with req.user.email
  userEmail: z.string().optional()
});

// ─── 4. Trip ID Route Parameter Schema (/api/trips/:id) ─────────
export const tripIdParamSchema = z.object({
  id: z.string({ required_error: 'Trip ID is required' })
    .trim()
    .min(1, 'Trip ID cannot be empty')
    .max(64, 'Trip ID is too long')
    .regex(SAFE_ID_REGEX, 'Trip ID contains invalid characters')
});

// ─── 5. Auth Registration Schema (/api/auth/register) ───────────
export const authRegisterSchema = z.object({
  name: z.string().trim().max(100, 'Name cannot exceed 100 characters').optional(),
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .max(100, 'Email cannot exceed 100 characters')
    .toLowerCase(),
  password: z.string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters long')
    .max(128, 'Password cannot exceed 128 characters')
});

// ─── 6. Auth Login Schema (/api/auth/login) ─────────────────────
export const authLoginSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .max(100, 'Email cannot exceed 100 characters')
    .toLowerCase(),
  password: z.string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
    .max(128, 'Password cannot exceed 128 characters')
});

// ─── 7. Chat Assistant Schema (/api/chat) ───────────────────────
export const chatSchema = z.object({
  message: z.string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters'),
  chatHistory: z.array(z.object({
    sender: z.enum(['user', 'model', 'assistant']),
    text: z.string().max(2000)
  })).max(30).optional(),
  tripContext: z.record(z.any()).optional()
});
