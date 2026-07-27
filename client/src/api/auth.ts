import { apiClient } from './client';
import type { AuthResponse, User, UnitSystem, Sex } from '@/types';

export const authApi = {
  register: (data: { email: string; password: string; name: string; securityQuestion?: string; securityAnswer?: string }) =>
    apiClient.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  googleAuth: (idToken: string) =>
    apiClient.post<AuthResponse>('/auth/google', { idToken }).then((r) => r.data),

  me: () =>
    apiClient.get<{ data: User }>('/auth/me').then((r) => r.data.data),

  updateMe: (data: { name?: string; unitSystem?: UnitSystem; dateOfBirth?: string; sex?: Sex; onboardingSkipped?: boolean }) =>
    apiClient.patch<{ data: User }>('/auth/me', data).then((r) => r.data.data),

  forgotPassword: (email: string) =>
    apiClient
      .post<{ message: string }>('/auth/forgot-password', { email })
      .then((r) => r.data),

  getResetQuestion: (token: string) =>
    apiClient
      .get<{ data: { securityQuestion: string | null; requiresGoogleSignIn: boolean } }>(
        `/auth/reset-password/${encodeURIComponent(token)}`
      )
      .then((r) => r.data),

  resetPassword: (token: string, password: string, answer?: string) =>
    apiClient
      .post<{ message: string }>('/auth/reset-password', { token, password, answer })
      .then((r) => r.data),
};
