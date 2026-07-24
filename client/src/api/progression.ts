import { apiClient } from './client';
import type { ProgressionOverview, ProgressionSuggestion, ExerciseHistory } from '@/types';

export const progressionApi = {
  all: (weeks?: number) =>
    apiClient
      .get<{ data: ProgressionOverview }>('/progression', { params: weeks ? { weeks } : {} })
      .then((r) => r.data.data),

  forExercise: (exerciseName: string) =>
    apiClient
      .get<{ data: ProgressionSuggestion }>(`/progression/${encodeURIComponent(exerciseName)}`)
      .then((r) => r.data.data),

  history: (exerciseName: string, limit?: number) =>
    apiClient
      .get<{ data: ExerciseHistory[] }>(
        `/progression/${encodeURIComponent(exerciseName)}/history`,
        { params: limit ? { limit } : {} }
      )
      .then((r) => r.data.data),
};
