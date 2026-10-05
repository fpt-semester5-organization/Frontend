import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from './types';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: Attach JWT token if present
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor: Unwrap envelope or handle 401/403 errors
http.interceptors.response.use(
  (response) => {
    // If backend wraps in ApiResponse envelope, return data payload
    const res = response.data as ApiResponse;
    if (res && typeof res.success === 'boolean') {
      return res.data;
    }
    return response.data;
  },
  async (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      // Handle token expiration / refresh token trigger
      localStorage.removeItem('access_token');
    }
    return Promise.reject(error);
  }
);

export default http;
