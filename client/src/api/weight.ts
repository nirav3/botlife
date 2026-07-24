import { apiClient } from './client';
import type { WeightEntry, WeightStats, Paginated } from '@/types';

export const weightApi = {
  log: (data: { weightKg: number; note?: string; loggedAt?: string }) =>
    apiClient.post<{ data: WeightEntry }>('/weight', data).then((r) => r.data.data),

  history: (params?: { page?: number; limit?: number; from?: string; to?: string }) =>
    apiClient.get<Paginated<WeightEntry>>('/weight', { params }).then((r) => r.data),

  stats: () =>
    apiClient.get<{ data: WeightStats | null }>('/weight/stats').then((r) => r.data.data),

  delete: (id: string) =>
    apiClient.delete(`/weight/${id}`).then((r) => r.data),
};
