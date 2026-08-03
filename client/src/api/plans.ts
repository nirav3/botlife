import { apiClient } from './client';
import type { WorkoutPlan, WorkoutPlanSummary, WorkoutPlanInput, WorkoutSession, NextWorkout } from '@/types';

export const plansApi = {
  list: () =>
    apiClient.get<{ data: WorkoutPlanSummary[] }>('/plans').then((r) => r.data.data),

  nextWorkout: () =>
    apiClient.get<{ data: NextWorkout | null }>('/plans/next-workout').then((r) => r.data.data),

  get: (planId: string) =>
    apiClient.get<{ data: WorkoutPlan }>(`/plans/${planId}`).then((r) => r.data.data),

  create: (data: WorkoutPlanInput) =>
    apiClient.post<{ data: WorkoutPlan }>('/plans', data).then((r) => r.data.data),

  update: (planId: string, data: Partial<WorkoutPlanInput>) =>
    apiClient.patch<{ data: WorkoutPlan }>(`/plans/${planId}`, data).then((r) => r.data.data),

  delete: (planId: string) =>
    apiClient.delete(`/plans/${planId}`).then((r) => r.data),

  startDay: (planId: string, dayNumber: number) =>
    apiClient
      .post<{ data: WorkoutSession }>(`/plans/${planId}/start-day`, { dayNumber })
      .then((r) => r.data.data),
};
