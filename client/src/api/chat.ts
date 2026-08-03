import { apiClient } from './client';
import type { ImportedPlan } from '@/lib/planImport';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface ChatReply {
  message: string;
  plan: ImportedPlan | null;
}

export const chatApi = {
  sendWorkoutPlanMessage: (messages: ChatTurn[]) =>
    apiClient
      .post<{ data: ChatReply }>('/chat/workout-plan', { messages })
      .then((r) => r.data.data),
};
