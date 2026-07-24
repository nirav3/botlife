import { apiClient } from './client';
import type { MealPlan, Meal, FoodItem, DailySummary } from '@/types';

export const mealsApi = {
  // Plans
  create: (data: {
    name: string;
    targetCalories?: number;
    targetProteinG?: number;
    targetCarbsG?: number;
    targetFatG?: number;
  }) => apiClient.post<{ data: MealPlan }>('/meals', data).then((r) => r.data.data),

  list: () =>
    apiClient.get<{ data: MealPlan[] }>('/meals').then((r) => r.data.data),

  get: (id: string) =>
    apiClient.get<{ data: MealPlan }>(`/meals/${id}`).then((r) => r.data.data),

  update: (
    id: string,
    data: {
      name?: string;
      targetCalories?: number;
      targetProteinG?: number;
      targetCarbsG?: number;
      targetFatG?: number;
      isActive?: boolean;
    }
  ) => apiClient.patch<{ data: MealPlan }>(`/meals/${id}`, data).then((r) => r.data.data),

  delete: (id: string) => apiClient.delete(`/meals/${id}`).then((r) => r.data),

  dailySummary: (date?: string) =>
    apiClient
      .get<{ data: DailySummary }>('/meals/daily-summary', { params: date ? { date } : {} })
      .then((r) => r.data.data),

  // Meals
  addMeal: (planId: string, data: { name: string; loggedAt?: string }) =>
    apiClient.post<{ data: Meal }>(`/meals/${planId}/meals`, data).then((r) => r.data.data),

  // Food items
  addFood: (
    planId: string,
    mealId: string,
    data: { name: string; quantity: number; unit: string; calories: number; proteinG?: number; carbsG?: number; fatG?: number }
  ) =>
    apiClient
      .post<{ data: FoodItem }>(`/meals/${planId}/meals/${mealId}/foods`, data)
      .then((r) => r.data.data),

  deleteFood: (planId: string, mealId: string, foodId: string) =>
    apiClient.delete(`/meals/${planId}/meals/${mealId}/foods/${foodId}`).then((r) => r.data),
};
