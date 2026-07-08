import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Strip /api/v1 (or whatever the api suffix is) to get the origin that serves /uploads/*
export const apiOrigin = baseURL.replace(/\/api\/v\d+\/?$/, '');

export function resolveAsset(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${apiOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiErrorShape {
  error?: { code?: string; message?: string; details?: unknown };
}

export function extractApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorShape | undefined;
    if (data?.error?.message) {
      return import.meta.env.DEV
        ? `[${data.error.code ?? 'ERR'}] ${data.error.message}`
        : data.error.message;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function toastError(err: unknown): void {
  toast.error(extractApiError(err));
}
