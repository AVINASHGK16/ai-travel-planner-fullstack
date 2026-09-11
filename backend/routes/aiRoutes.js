import express from 'express';
import * as aiService from '../services/aiService.js';
import { aiGenerateLimiter, aiChatLimiter, asyncHandler } from '../middleware/auth.js';
import { validateBody, generateTripSchema, chatSchema } from '../validators.js';

const router = express.Router();

router.post('/generate', aiGenerateLimiter, validateBody(generateTripSchema), asyncHandler(async (req, res) => {
  const result = await aiService.generateTrip(req.validatedBody, req.user);
  res.json(result);
}));

router.post('/chat', aiChatLimiter, validateBody(chatSchema), asyncHandler(async (req, res) => {
  const result = await aiService.chatWithAssistant(req.validatedBody, req.user);
  res.json(result);
}));

export default router;
