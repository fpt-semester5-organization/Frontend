import axios from 'axios';
import { API_BASE_URL } from '@/lib/env';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestStore, type GuestQuota } from '@/stores/guest.store';
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
  if (auth.guestToken && !force) return Promise.resolve(auth.guestToken);
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

/** Kết thúc phiên cục bộ: xóa token + người dùng, bỏ cache của người dùng cũ, mở lại phiên Khách. Không gọi API. */
export function endSession(): void {
  useAuthStore.getState().logout();
  useAuthStore.getState().clearGuestToken();
  useGuestStore.getState().reset();
  queryClient.clear();
  void bootstrapGuestSession(true);
}
