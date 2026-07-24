import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import {
  getAllProgressionSuggestions,
  getProgressionSuggestion,
  getExerciseHistory as fetchHistory,
} from '../services/progression.service';

export const getSuggestions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const weeks = parseInt((req.query.weeks as string) || '6');

    const suggestions = await getAllProgressionSuggestions(userId, weeks);

    // Split into ready vs not-ready for easy frontend consumption
    const ready = suggestions.filter((s) => s.readyForProgression);
    const inProgress = suggestions.filter((s) => !s.readyForProgression);

    res.json({
      data: {
        ready,
        inProgress,
        total: suggestions.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getExerciseSuggestion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const exerciseName = decodeURIComponent(
      Array.isArray(req.params.exerciseName) ? req.params.exerciseName[0] : req.params.exerciseName
    );

    const suggestion = await getProgressionSuggestion(userId, exerciseName);

    if (!suggestion) {
      res.status(404).json({ error: `No history found for exercise: ${exerciseName}` });
      return;
    }

    res.json({ data: suggestion });
  } catch (err) {
    next(err);
  }
};

export const getExerciseHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const exerciseName = decodeURIComponent(
      Array.isArray(req.params.exerciseName) ? req.params.exerciseName[0] : req.params.exerciseName
    );
    const limit = parseInt((req.query.limit as string) || '10');

    const history = await fetchHistory(userId, exerciseName, limit);

    res.json({ data: history });
  } catch (err) {
    next(err);
  }
};
