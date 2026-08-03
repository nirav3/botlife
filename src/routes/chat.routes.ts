import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { postWorkoutPlanChat } from '../controllers/chat.controller';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticate);

// Per-user (not per-IP) — this endpoint calls a metered external API, so the
// budget should follow the account making the calls, not the network it's
// on. Placed after `authenticate` so req.user is populated for the key.
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // 30 chat turns per user per window
  skip: () => process.env.NODE_ENV === 'test',
  keyGenerator: (req) => (req as AuthenticatedRequest).user!.id,
  message: { error: 'Too many chat requests, please try again later.' },
});

// Bounds how much conversation the client can push into a single Gemini
// call — caps input-side cost/compute independent of the output-token cap
// enforced in chat.service.ts.
const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 2000;

// POST /api/chat/workout-plan
// Body: { messages: Array<{ role: 'user' | 'model', text: string }> }
// Stateless — the client resends the full conversation each turn. Returns a
// conversational reply, plus a drafted plan once the assistant has enough
// information (for the client to review and save via POST /api/plans).
router.post(
  '/workout-plan',
  chatLimiter,
  [
    body('messages')
      .isArray({ min: 1, max: MAX_MESSAGES })
      .withMessage(`messages must be an array of 1-${MAX_MESSAGES} turns`),
    body('messages.*.role').isIn(['user', 'model']).withMessage('role must be "user" or "model"'),
    body('messages.*.text')
      .trim()
      .notEmpty()
      .isLength({ max: MAX_MESSAGE_LENGTH })
      .withMessage(`text is required and must be at most ${MAX_MESSAGE_LENGTH} characters`),
  ],
  validate,
  postWorkoutPlanChat
);

export default router;
