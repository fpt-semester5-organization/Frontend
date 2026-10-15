import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { errorMessage } from '@/constants/errorCodes';
import { API_BASE_URL } from '@/lib/env';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { toast, useUiStore } from '@/stores/ui.store';
import { bootstrapGuestSession, endSession, refreshAccessToken } from './session';
import type { ApiEnvelope, ApiErrorBody, Paged } from './types';

export { refreshAccessToken };


/**
 * Axios dùng chung. Quy tắc (README §2, spec 13 §1.1):
 *  - gắn `Authorization: Bearer` (token Member hoặc Anonymous JWT của Khách);
 *  - 401 ERR_AUTH_INVALID_TOKEN (hoặc không có mã): làm mới token đúng 1 lần (POST /auth/refresh-token, cookie HttpOnly,
 *    nhiều request đồng thời dùng chung 1 lần refresh), thử lại request; vẫn 401 hoặc refresh hỏng thì kết thúc phiên và về /auth/login;
 *  - 401 của Khách (Anonymous JWT hết hạn 24 giờ): xin phiên Khách mới 1 lần rồi thử lại;
 *  - 403 ERR_GUEST_* / ERR_QUOTA_*: mở SignupPromptModal (Khách); 429: toast; 503: banner; 5xx: toast + ghi correlationId.
 *
 * KHÔNG đặt sẵn `Content-Type`: axios tự chọn JSON cho object và multipart (có boundary) cho FormData.
 */
export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // refresh_token là cookie HttpOnly
  timeout: 15000,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken, guestToken } = useAuthStore.getState();
  const token = accessToken ?? guestToken;
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/** Endpoint công khai/không dựa vào Access Token: 401 ở đây là lỗi nghiệp vụ (sai mật khẩu, OTP…) — không refresh. */
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/verify-otp', '/auth/resend-otp', '/auth/forgot-password', '/auth/reset-password', '/auth/google', '/auth/refresh-token', '/auth/anonymous', '/auth/logout'];

const isNoRefreshUrl = (url?: string) => !!url && NO_REFRESH.some((p) => url.includes(p));

/** Hết phiên: dọn trạng thái rồi về trang đăng nhập. */
function expireSession() {
  if (!useAuthStore.getState().user) return; // đã kết thúc bởi request đồng thời khác: không đăng xuất/điều hướng lần 2
  endSession();
  if (!window.location.pathname.startsWith(PATHS.AUTH.LOGIN)) window.location.assign(PATHS.AUTH.LOGIN);
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const body = error.response?.data;
    const config = error.config as RetriableConfig | undefined;
    const code = body?.errorCode ?? '';
    const ui = useUiStore.getState();
    const auth = useAuthStore.getState();

    // ---- 401: làm mới phiên đúng 1 lần ----
    const refreshable = status === 401 && !!config && (code === 'ERR_AUTH_INVALID_TOKEN' || code === '') && !isNoRefreshUrl(config.url);
    if (refreshable && config) {
      if (config._retried) {
        // Đã thử lại với token mới mà vẫn 401 → phiên không còn hợp lệ (không refresh lần 2, không vòng lặp)
        if (auth.user) expireSession();
        return Promise.reject(error);
      }
      config._retried = true;
      if (auth.user) {
        let token: string;
        try {
          token = await refreshAccessToken();
        } catch (refreshError) {
          const refreshStatus = (refreshError as AxiosError).response?.status;
          if (refreshStatus === 401 || refreshStatus === 403) expireSession(); // refresh token hỏng/hết hạn/bị thu hồi
          return Promise.reject(error); // lỗi mạng/5xx khi refresh: giữ phiên, báo lỗi gốc
        }
        config.headers.Authorization = `Bearer ${token}`;
        return http(config); // lần thử lại bị 401 tiếp sẽ rơi vào nhánh `_retried` ở trên
      }
      if (auth.guestToken) {
        const token = await bootstrapGuestSession(true);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return http(config);
        }
      }
      return Promise.reject(error);
    }

    // ---- Các mã khác ----
    if (status === 403 && /^ERR_GUEST_/.test(code) && code !== 'ERR_GUEST_REGION_UNSUPPORTED') {
      ui.openSignupPrompt(code === 'ERR_GUEST_PERSONALIZATION_RESTRICTED' ? 'personalization' : 'guest');
    } else if (status === 403 && /^ERR_QUOTA_/.test(code)) {
      if (auth.user) toast.warning(body?.message || errorMessage(code)); // Thành viên Free: trang tự hiện gợi ý nâng cấp VIP
      else ui.openSignupPrompt('quota');
    } else if (status === 429) {
      toast.warning('Thao tác quá nhanh, thử lại sau');
    } else if (status === 503) {
      ui.setServiceBanner('Dịch vụ tạm gián đoạn, vui lòng thử lại sau.');
    } else if (status && status >= 500) {
      toast.error('Lỗi hệ thống, vui lòng thử lại');
      console.error('[correlationId]', body?.correlationId ?? error.response?.headers?.['x-correlation-id'], code);
    }
    return Promise.reject(error);
  },
);

/** Bóc `data` khỏi envelope thành công. */
export const unwrap = async <T>(req: Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<T> => (await req).data.data;

/** Bóc `data` + `meta` của danh sách phân trang. */
export const unwrapPaged = async <T>(req: Promise<AxiosResponse<ApiEnvelope<T[]>>>): Promise<Paged<T>> => {
  const body = (await req).data;
  const items = Array.isArray(body.data) ? body.data : [];
  return { items, meta: body.meta ?? { page: 1, size: items.length, total: items.length } };
};

/** Lấy thông điệp tiếng Việt từ lỗi API (ưu tiên `message` của server). */
export function apiErrorMessage(err: unknown, fallback?: string): string {
  const e = err as AxiosError<ApiErrorBody> | null | undefined;
  return e?.response?.data?.message || errorMessage(e?.response?.data?.errorCode, fallback);
}

export function apiErrorCode(err: unknown): string | undefined {
  return (err as AxiosError<ApiErrorBody> | null | undefined)?.response?.data?.errorCode;
}

export function apiErrorStatus(err: unknown): number | undefined {
  return (err as AxiosError | null | undefined)?.response?.status;
}

/** Gói `data` kèm lỗi (remainingAttempts, suspendedUntil, lockedUntil…). */
export function apiErrorData(err: unknown): Record<string, unknown> {
  return (err as AxiosError<ApiErrorBody> | null | undefined)?.response?.data?.data ?? {};
}

export function apiFieldErrors(err: unknown): Record<string, string> {
  const details = (err as AxiosError<ApiErrorBody> | null | undefined)?.response?.data?.details ?? [];
  return Object.fromEntries(details.map((d) => [d.field, d.message]));
}

export default http;
