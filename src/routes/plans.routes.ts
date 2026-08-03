import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  startPlanDay,
  getNextWorkout,
} from '../controllers/plans.controller';

const router = Router();
router.use(authenticate);

const dayValidation = [
  body('days').optional().isArray(),
  body('days.*.dayNumber').isInt({ min: 1 }),
  body('days.*.label').trim().notEmpty(),
  body('days.*.sessionName').trim().notEmpty(),
  body('days.*.exercises').isArray(),
  body('days.*.exercises.*.name').trim().notEmpty(),
  body('days.*.exercises.*.muscleGroup').trim().notEmpty(),
  body('days.*.exercises.*.sets').isArray(),
  body('days.*.exercises.*.sets.*.setNumber').isInt({ min: 1 }),
  body('days.*.exercises.*.sets.*.targetReps').trim().notEmpty(),
];

// GET /api/plans              — list plans visible to the user (samples + own)
router.get('/', listPlans);

// GET /api/plans/next-workout — the next day of whichever plan the user last
// started a session from (for the dashboard "continue plan" shortcut).
// Must be registered before /:planId so it isn't swallowed as a planId.
router.get('/next-workout', getNextWorkout);

// GET /api/plans/:planId      — full plan with all days and exercises
router.get(
  '/:planId',
  [param('planId').trim().notEmpty()],
  validate,
  getPlan
);

// POST /api/plans             — create a personal plan (always private)
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Plan name is required'),
    body('description').optional().isString().trim(),
    body('difficulty').optional().isString().trim(),
    body('goal').optional().isString().trim(),
    body('daysPerWeek').optional().isInt({ min: 1, max: 7 }),
    body('estimatedMinutes').optional().isInt({ min: 1 }),
    body('tags').optional().isArray(),
    ...dayValidation,
  ],
  validate,
  createPlan
);

// PATCH /api/plans/:planId    — update a plan you own (metadata and/or days)
router.patch(
  '/:planId',
  [
    param('planId').trim().notEmpty(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().isString().trim(),
    body('difficulty').optional().isString().trim(),
    body('goal').optional().isString().trim(),
    body('daysPerWeek').optional().isInt({ min: 1, max: 7 }),
    body('estimatedMinutes').optional().isInt({ min: 1 }),
    body('tags').optional().isArray(),
    ...dayValidation,
  ],
  validate,
  updatePlan
);

// DELETE /api/plans/:planId   — delete a plan you own
router.delete(
  '/:planId',
  [param('planId').trim().notEmpty()],
  validate,
  deletePlan
);

// POST /api/plans/:planId/start-day
// Body: { dayNumber: number }
// Creates a WorkoutSession pre-populated with the plan's exercises for that day
router.post(
  '/:planId/start-day',
  [
    param('planId').trim().notEmpty(),
    body('dayNumber').isInt({ min: 1 }).withMessage('dayNumber must be a positive integer'),
  ],
  validate,
  startPlanDay
);

export default router;
