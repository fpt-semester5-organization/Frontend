import axios from 'axios';
import { API_BASE_URL } from '@/lib/env';
import { queryClient } from '@/lib/queryClient';
import { storage } from '@/lib/storage';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestStore, type GuestQuota } from '@/stores/guest.store';
import { toast, useUiStore } from '@/stores/ui.store';
import type { ApiEnvelope } from './types';

/**
 * Các lời gọi phiên (refresh, Khách ẩn danh, đăng xuất cục bộ) đi qua instance axios THUẦN — không có interceptor —
 * để interceptor của `http` không thể tự gọi lại chính nó (không vòng lặp). Cookie HttpOnly (`refresh_token`, `guest_uuid`) cần withCredentials.
 */
export const rawHttp = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 15000 });

let refreshing: Promise<string> | null = null;

/** FN-AUTH-09 — làm mới Access Token. Nhiều request 401 cùng lúc dùng chung 1 lần gọi (single-flight). */
export function refreshAccessToken(): Promise<string> {
  refreshing ??= rawHttp
    .post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh-token')
    .then((r) => {
      const token = r.data.data.accessToken;
      useAuthStore.getState().setAccessToken(token);
      return token;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

let guestBootstrapping: Promise<string | null> | null = null;

/** FN-AUTH-01 + FN-AUTH-02 — tạo phiên Khách (Anonymous JWT 24 giờ) và nạp hạn mức dùng thử. `force`: thay token đã hết hạn. */
export function bootstrapGuestSession(force = false): Promise<string | null> {
  const auth = useAuthStore.getState();
  if (auth.user) return Promise.resolve(null);
  if (auth.guestToken && !force) {
    if (!useGuestStore.getState().quota) {
      void rawHttp
        .get<ApiEnvelope<GuestQuota>>('/guest/quota', { headers: { Authorization: `Bearer ${auth.guestToken}` } })
        .then((q) => useGuestStore.getState().setQuota(q.data.data))
        .catch(() => {});
    }
    return Promise.resolve(auth.guestToken);
  }
  guestBootstrapping ??= (async () => {
    try {
      const r = await rawHttp.post<ApiEnvelope<{ accessToken: string; guestId: string }>>('/auth/anonymous');
      const { accessToken, guestId } = r.data.data;
      useAuthStore.getState().setGuestToken(accessToken);
      useGuestStore.getState().setGuest(guestId);
      try {
        const q = await rawHttp.get<ApiEnvelope<GuestQuota>>('/guest/quota', { headers: { Authorization: `Bearer ${accessToken}` } });
        useGuestStore.getState().setQuota(q.data.data);
      } catch {
        /* hạn mức sẽ nạp lại sau; không chặn phiên Khách */
      }
      return accessToken;
    } catch {
      return null; // backend chưa chạy / 429 / 503: Khách vẫn xem được nội dung công khai
    } finally {
      guestBootstrapping = null;
    }
  })();
  return guestBootstrapping;
}

export const BANNED_ACCOUNT_DEFAULT_MESSAGE = 'Tài khoản của bạn đã bị khóa bởi Quản trị viên';

/** Xóa sạch toàn bộ token (Access Token, Refresh Token, User, Guest) trong localStorage. */
export function clearAllTokensFromStorage(): void {
  const tokenKeys = [
    'vl_access_token',
    'access_token',
    'accessToken',
    'token',
    'vl_refresh_token',
    'refresh_token',
    'refreshToken',
    'vl_user',
    'user',
    'vl_guest_token',
  ];
  for (const k of tokenKeys) {
    storage.remove(k);
  }
}

type RouterNavigator = (to: string, options?: { replace?: boolean; state?: unknown }) => void;
let routerNavigator: RouterNavigator | null = null;

export function registerRouterNavigator(navigator: RouterNavigator | null): void {
  routerNavigator = navigator;
}

/** Kết thúc phiên cục bộ: xóa token + người dùng, bỏ cache của người dùng cũ, mở lại phiên Khách. Không gọi API. */
export function endSession(): void {
  clearAllTokensFromStorage();
  useAuthStore.getState().logout();
  useAuthStore.getState().clearGuestToken();
  useGuestStore.getState().reset();
  queryClient.clear();
  void bootstrapGuestSession(true);
}

/**
 * Xử lý khi tài khoản bị Admin cấm/khóa (403 Forbidden ERR_AUTH_ACCOUNT_BANNED hoặc SignalR ForceLogout):
 * 1. Xóa sạch mọi token (Access & Refresh Token) trong localStorage.
 * 2. Đặt trạng thái logout trong store & xóa query cache.
 * 3. Bật Toast / Modal thông báo rõ ràng "Tài khoản của bạn đã bị khóa bởi Quản trị viên".
 * 4. Tự động chuyển hướng người dùng về trang đăng nhập (/auth/login).
 */
export function handleAccountBanned(customMessage?: string): void {
  const message = customMessage || BANNED_ACCOUNT_DEFAULT_MESSAGE;

  // 1. Xóa sạch token trong localStorage
  clearAllTokensFromStorage();

  // 2. Dọn dẹp trạng thái auth store & query cache
  useAuthStore.getState().logout();
  useAuthStore.getState().clearGuestToken();
  useGuestStore.getState().reset();
  queryClient.clear();

  // Lưu thông báo vào sessionStorage để duy trì kể cả khi tải lại trang
  try {
    sessionStorage.setItem('vl_banned_notice', message);
  } catch {
    /* bỏ qua */
  }

  // 3. Bật Toast thông báo lỗi & mở Modal
  toast.error(message);
  useUiStore.getState().openBannedModal(message);

  // 4. Tự động điều hướng về /login
  if (typeof window !== 'undefined') {
    const isLoginPage = window.location.pathname.startsWith(PATHS.AUTH.LOGIN);
    if (!isLoginPage) {
      if (routerNavigator) {
        try {
          routerNavigator(PATHS.AUTH.LOGIN, {
            replace: true,
            state: { banned: true, bannedMessage: message },
          });
          return;
        } catch {
          /* rơi vào window.location.assign */
        }
      }
      window.location.assign(PATHS.AUTH.LOGIN);
    }
  }
}
