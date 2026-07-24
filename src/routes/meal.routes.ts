import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createMealPlan,
  getMealPlans,
  getMealPlan,
  updateMealPlan,
  deleteMealPlan,
  addMeal,
  addFoodItem,
  deleteFoodItem,
  getDailySummary,
} from '../controllers/meal.controller';

const router = Router();
router.use(authenticate);

// ─── Meal plans ───────────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('targetCalories').optional().isInt({ min: 0 }),
    body('targetProteinG').optional().isInt({ min: 0 }),
    body('targetCarbsG').optional().isInt({ min: 0 }),
    body('targetFatG').optional().isInt({ min: 0 }),
  ],
  validate,
  createMealPlan
);

router.get('/', getMealPlans);
router.get('/daily-summary', getDailySummary);
router.get('/:planId', getMealPlan);

router.patch(
  '/:planId',
  [
    body('name').optional().trim().notEmpty(),
    body('targetCalories').optional().isInt({ min: 0 }),
    body('targetProteinG').optional().isInt({ min: 0 }),
    body('targetCarbsG').optional().isInt({ min: 0 }),
    body('targetFatG').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  updateMealPlan
);

router.delete('/:planId', deleteMealPlan);

// ─── Meals within a plan ──────────────────────────────────────────────────────
router.post(
  '/:planId/meals',
  [
    body('name').trim().notEmpty(),
    body('loggedAt').optional().isISO8601(),
  ],
  validate,
  addMeal
);

// ─── Food items within a meal ─────────────────────────────────────────────────
router.post(
  '/:planId/meals/:mealId/foods',
  [
    body('name').trim().notEmpty(),
    body('quantity').isFloat({ min: 0 }),
    body('unit').trim().notEmpty(),
    body('calories').isFloat({ min: 0 }),
    body('proteinG').optional().isFloat({ min: 0 }),
    body('carbsG').optional().isFloat({ min: 0 }),
    body('fatG').optional().isFloat({ min: 0 }),
  ],
  validate,
  addFoodItem
);

router.delete('/:planId/meals/:mealId/foods/:foodId', deleteFoodItem);

export default router;
