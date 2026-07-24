import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getSuggestions,
  getExerciseSuggestion,
  getExerciseHistory,
} from '../controllers/progression.controller';

const router = Router();
router.use(authenticate);

// GET /api/progression  — suggestions for all exercises done in the last N weeks
router.get('/', getSuggestions);

// GET /api/progression/:exerciseName  — suggestion for a specific exercise
router.get('/:exerciseName', getExerciseSuggestion);

// GET /api/progression/:exerciseName/history  — raw history for an exercise
router.get('/:exerciseName/history', getExerciseHistory);

export default router;
