import axios from 'axios';
import { API_BASE_URL } from '@/lib/env';
import { decodeJwtClaims } from '@/lib/jwtClaims';
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

/**
 * JWT mới mang role/isVip hiện hành (D104). Nâng VIP hoặc hết hạn VIP xảy ra ở server (webhook, VipExpiryJob) nên giao diện chỉ biết
 * khi có token mới: đồng bộ vào `user` và tải lại dữ liệu phụ thuộc quyền (calo chi tiết, hạn mức chat…). Trả về true nếu có thay đổi.
 */
export function syncRoleClaims(token: string): boolean {
  const { user, updateUser } = useAuthStore.getState();
  if (!user) return false;
  const claims = decodeJwtClaims(token);
  const role = claims.role === 'MEMBER' || claims.role === 'VIP' || claims.role === 'ADMIN' ? claims.role : user.role;
  const isVip = claims.isVip ?? user.isVip;
  if (role === user.role && isVip === user.isVip) return false;
  updateUser({ role, isVip });
  void queryClient.invalidateQueries();
  return true;
}

/** FN-AUTH-09 — làm mới Access Token. Nhiều request 401 cùng lúc dùng chung 1 lần gọi (single-flight). */
export function refreshAccessToken(): Promise<string> {
  refreshing ??= rawHttp
    .post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh-token')
    .then((r) => {
      const token = r.data.data.accessToken;
      useAuthStore.getState().setAccessToken(token);
      syncRoleClaims(token);
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
export const BANNED_REASON_KEY = 'vl_banned_reason';
const BANNED_NOTICE_KEY = 'vl_banned_notice';

let isHandlingBan = false;

type RouterNavigator = (to: string, options?: { replace?: boolean; state?: unknown }) => void;
let routerNavigator: RouterNavigator | null = null;

export function registerRouterNavigator(navigator: RouterNavigator | null): void {
  routerNavigator = navigator;
}

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
export function handleAccountBanned(message?: string): void {
  if (isHandlingBan) return;
  isHandlingBan = true;

  const banMessage = message?.trim() || BANNED_ACCOUNT_DEFAULT_MESSAGE;

  // 1. Lưu lý do cấm vào sessionStorage để màn hình đăng nhập đọc và hiển thị
  try {
    sessionStorage.setItem(BANNED_REASON_KEY, banMessage);
    sessionStorage.setItem(BANNED_NOTICE_KEY, banMessage);
  } catch {
    /* bỏ qua */
  }

  // 2. Thu hồi token, dọn sạch phiên người dùng trong localStorage & store
  clearAllTokensFromStorage();
  endSession();

  // 3. Bật Toast thông báo lỗi & mở Modal
  toast.error(banMessage);
  try {
    useUiStore.getState().openBannedModal(banMessage);
  } catch {
    /* bỏ qua */
  }

  // 4. Lập tức quay trở về màn hình đăng nhập (/auth/login)
  const loginPath = PATHS.AUTH.LOGIN;
  if (typeof window !== 'undefined') {
    const isLoginPage = window.location.pathname.startsWith(loginPath);
    if (!isLoginPage) {
      if (routerNavigator) {
        try {
          routerNavigator(loginPath, {
            replace: true,
            state: { banned: true, bannedMessage: banMessage },
          });
          setTimeout(() => {
            isHandlingBan = false;
          }, 1500);
          return;
        } catch {
          /* fallback to window.location.assign */
        }
      }
      window.location.assign(`${loginPath}?banned=1`);
    } else {
      window.dispatchEvent(new CustomEvent('vl:account_banned', { detail: { message: banMessage } }));
    }
  }

  setTimeout(() => {
    isHandlingBan = false;
  }, 1500);
}

export function _resetBanHandlingForTests(): void {
  isHandlingBan = false;
}

/** Lấy thông điệp tài khoản bị cấm từ sessionStorage và xóa ngay sau đó. */
export function getBannedReason(): string | null {
  try {
    const reason = sessionStorage.getItem(BANNED_REASON_KEY) || sessionStorage.getItem(BANNED_NOTICE_KEY);
    if (reason) {
      sessionStorage.removeItem(BANNED_REASON_KEY);
      sessionStorage.removeItem(BANNED_NOTICE_KEY);
      return reason;
    }
  } catch {
    /* bỏ qua */
  }
  return null;
}
