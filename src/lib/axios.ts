import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,

  (error: unknown) => {
    const axiosError = error as {
      response?: { status?: number };
      config?:   RetryableConfig;
    };

    const status         = axiosError.response?.status;
    const originalConfig = axiosError.config as RetryableConfig | undefined;

    if (status === 401 && originalConfig && !originalConfig._retry) {
      originalConfig._retry = true;
      useAuthStore.getState().clearTokens();
    }

    return Promise.reject(error);
  }
);

export default api;