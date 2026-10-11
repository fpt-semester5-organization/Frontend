import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiEnvelope, Schemas } from './types';
import { toApiError } from '@/lib/apiError';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Không đặt Content-Type mặc định: axios tự chọn JSON cho object và multipart cho FormData.
export const http = axios.create({ baseURL, timeout: 15000 });

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Các endpoint /auth/* (login, refresh-token, đổi mật khẩu...) trả 401 theo nghĩa riêng,
// không được kích hoạt làm mới token (ví dụ sai mật khẩu ERR_AUTH_INVALID_CREDENTIALS).
const isAuthEndpoint = (url?: string) => !!url && url.replace(baseURL, '').startsWith('/auth/');

let refreshPromise: Promise<string> | null = null;

/** POST /auth/refresh-token (cookie HttpOnly, withCredentials); gộp các lần gọi đồng thời. */
export function refreshAccessToken(): Promise<string> {
  refreshPromise ??= axios
    .post<ApiEnvelope<Schemas['RefreshTokenResponse']['data']>>(
      `${baseURL}/auth/refresh-token`,
      null,
      { withCredentials: true, timeout: 15000 }
    )
    .then((res) => {
      const token = res.data.data.accessToken;
      if (!token) throw new Error('Missing access token');
      useAuthStore.getState().setToken(token);
      return token;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

const redirectToLogin = () => {
  const returnUrl = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
};

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const { token, isAuthenticated, logout } = useAuthStore.getState();

    // 401: làm mới token đúng 1 lần rồi gửi lại; vẫn lỗi thì về /auth/login (UI Spec 1.1).
    if (status === 401 && original && !original._retry && token && !isAuthEndpoint(original.url)) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return http(original);
      } catch {
        logout();
        redirectToLogin();
      }
    }

    const apiError = toApiError(error);

    // 403 ERR_GUEST_* hoặc ERR_QUOTA_* của Khách: mở SignupPromptModal (UI Spec 1.1).
    if (
      status === 403 &&
      (apiError.errorCode.startsWith('ERR_GUEST_') ||
        (apiError.errorCode.startsWith('ERR_QUOTA_') && !isAuthenticated))
    ) {
      useUiStore.getState().openSignupPrompt();
    }

    return Promise.reject(apiError);
  }
);

export default http;
