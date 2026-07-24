import { apiClient } from './client';
import type { WorkoutSession, ExerciseLog, ExerciseSet, Paginated } from '@/types';

export const workoutsApi = {
  // Sessions
  create: (data: { name: string; notes?: string; startedAt?: string }) =>
    apiClient.post<{ data: WorkoutSession }>('/workouts', data).then((r) => r.data.data),

  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<Paginated<WorkoutSession>>('/workouts', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<{ data: WorkoutSession }>(`/workouts/${id}`).then((r) => r.data.data),

  update: (id: string, data: { name?: string; notes?: string; endedAt?: string }) =>
    apiClient.patch<{ data: WorkoutSession }>(`/workouts/${id}`, data).then((r) => r.data.data),

  delete: (id: string) =>
    apiClient.delete(`/workouts/${id}`).then((r) => r.data),

  // Exercises
  addExercise: (
    sessionId: string,
    data: { exerciseName: string; muscleGroup?: string; orderIndex?: number; notes?: string }
  ) =>
    apiClient
      .post<{ data: ExerciseLog }>(`/workouts/${sessionId}/exercises`, data)
      .then((r) => r.data.data),

  swapExercise: (sessionId: string, exerciseLogId: string) =>
    apiClient
      .post<{ data: ExerciseLog }>(`/workouts/${sessionId}/exercises/${exerciseLogId}/swap`)
      .then((r) => r.data.data),

  // Sets
  addSet: (
    sessionId: string,
    exerciseLogId: string,
    data: { setNumber: number; weightKg?: number; reps?: number; rpe?: number; isWarmup?: boolean }
  ) =>
    apiClient
      .post<{ data: ExerciseSet }>(`/workouts/${sessionId}/exercises/${exerciseLogId}/sets`, data)
      .then((r) => r.data.data),

  updateSet: (
    sessionId: string,
    exerciseLogId: string,
    setId: string,
    data: { weightKg?: number; reps?: number; rpe?: number }
  ) =>
    apiClient
      .patch<{ data: ExerciseSet }>(
        `/workouts/${sessionId}/exercises/${exerciseLogId}/sets/${setId}`,
        data
      )
      .then((r) => r.data.data),

  deleteSet: (sessionId: string, exerciseLogId: string, setId: string) =>
    apiClient
      .delete(`/workouts/${sessionId}/exercises/${exerciseLogId}/sets/${setId}`)
      .then((r) => r.data),
};
