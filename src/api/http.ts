import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';
import { useGuestStore } from '../stores/guest.store';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`/api/v1/auth/refresh-token`, {}, { withCredentials: true });
        const newToken = res.data.data.accessToken;
        useAuthStore.setState({ accessToken: newToken });
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return http(originalRequest);
      } catch (e) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(e);
      }
    }
    if (error.response?.data?.errorCode?.startsWith('ERR_GUEST_')) {
      useGuestStore.getState().openPrompt();
    }
    return Promise.reject(error);
  }
);
