import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  logWeight,
  getWeightHistory,
  getWeightStats,
  deleteWeightEntry,
} from '../controllers/weight.controller';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  [
    body('weightKg').isFloat({ min: 20, max: 500 }).withMessage('Weight must be between 20 and 500 kg'),
    body('note').optional().isString().trim(),
    body('loggedAt').optional().isISO8601(),
  ],
  validate,
  logWeight
);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  validate,
  getWeightHistory
);

router.get('/stats', getWeightStats);

router.delete('/:id', deleteWeightEntry);

export default router;
