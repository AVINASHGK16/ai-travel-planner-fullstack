import express from 'express';
import * as authService from '../services/authService.js';
import { authenticateToken, authLimiter, asyncHandler } from '../middleware/auth.js';
import { validateBody, authRegisterSchema, authLoginSchema } from '../validators.js';

const router = express.Router();

router.post('/register', authLimiter, validateBody(authRegisterSchema), asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.validatedBody);
  res.status(201).json(result);
}));

router.post('/login', authLimiter, validateBody(authLoginSchema), asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.validatedBody);
  res.json(result);
}));

router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    user: { id: req.user.id, _id: req.user.id, name: req.user.name, email: req.user.email }
  });
}));

router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  authService.revokeToken(req.token);
  res.json({ message: 'Session successfully revoked and logged out.' });
}));

export default router;
