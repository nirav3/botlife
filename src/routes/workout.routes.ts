import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession,
  addExerciseLog,
  swapExercise,
  addSet,
  updateSet,
  deleteSet,
} from '../controllers/workout.controller';

const router = Router();
router.use(authenticate);

// ─── Sessions ────────────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Session name is required'),
    body('notes').optional().isString().trim(),
    body('startedAt').optional().isISO8601(),
  ],
  validate,
  createSession
);

router.get('/', getSessions);
router.get('/:sessionId', getSession);

router.patch(
  '/:sessionId',
  [
    body('name').optional().trim().notEmpty(),
    body('notes').optional().isString().trim(),
    body('endedAt').optional().isISO8601(),
  ],
  validate,
  updateSession
);

router.delete('/:sessionId', deleteSession);

// ─── Exercise logs within a session ──────────────────────────────────────────
router.post(
  '/:sessionId/exercises',
  [
    body('exerciseName').trim().notEmpty().withMessage('Exercise name is required'),
    body('muscleGroup').optional().isString().trim(),
    body('orderIndex').optional().isInt({ min: 0 }),
    body('notes').optional().isString().trim(),
  ],
  validate,
  addExerciseLog
);

// Swap an exercise for a random alternative (same muscle group) — only
// allowed before any sets on it have been logged
router.post('/:sessionId/exercises/:exerciseLogId/swap', swapExercise);

// ─── Sets within an exercise log ─────────────────────────────────────────────
router.post(
  '/:sessionId/exercises/:exerciseLogId/sets',
  [
    body('setNumber').isInt({ min: 1 }),
    body('weightKg').optional().isFloat({ min: 0 }),
    body('reps').optional().isInt({ min: 0 }),
    body('durationSecs').optional().isInt({ min: 0 }),
    body('rpe').optional().isFloat({ min: 1, max: 10 }),
    body('isWarmup').optional().isBoolean(),
  ],
  validate,
  addSet
);

router.patch(
  '/:sessionId/exercises/:exerciseLogId/sets/:setId',
  [
    body('weightKg').optional().isFloat({ min: 0 }),
    body('reps').optional().isInt({ min: 0 }),
    body('durationSecs').optional().isInt({ min: 0 }),
    body('rpe').optional().isFloat({ min: 1, max: 10 }),
  ],
  validate,
  updateSet
);

router.delete('/:sessionId/exercises/:exerciseLogId/sets/:setId', deleteSet);

export default router;
