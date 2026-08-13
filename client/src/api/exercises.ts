import { apiClient } from './client';
import type { ExerciseCatalogEntry } from '@/types';

export const exercisesApi = {
  catalog: () =>
    apiClient.get<{ data: ExerciseCatalogEntry[] }>('/exercises/catalog').then((r) => r.data.data),
};
