import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore }   from '@/stores/uiStore';

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface ApiErrorBody {
  detail?: string;
  code?:   string;
}

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000, 
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status         = error.response?.status;
    const originalConfig = error.config as RetryableConfig | undefined;
    if (status === 401 && originalConfig && !originalConfig._retry) {
      originalConfig._retry = true;

      const wasAuthenticated = useAuthStore.getState().isAuthenticated;
      useAuthStore.getState().clearTokens();
      if (wasAuthenticated) {
        useUIStore.getState().addToast({
          variant:  'warning',
          message:  'Your session has expired. Please sign in again.',
          duration: 6_000,
        });
      }
    }

    if (status === 403) {
      useUIStore.getState().addToast({
        variant: 'error',
        message: "You don't have permission to perform this action.",
      });
    }

    if (status === 429) {
      useUIStore.getState().addToast({
        variant: 'warning',
        message: 'Too many requests. Please wait a moment and try again.',
      });
    }

    if (!error.response) {
      if (!axios.isCancel(error)) {
        useUIStore.getState().addToast({
          variant: 'error',
          message: 'Network error. Check your connection and try again.',
        });
      }
    }

    return Promise.reject(error);
  },
);

export default api;
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return (
      error.response?.data?.detail ??
      error.message ??
      'An unexpected error occurred.'
    );
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}