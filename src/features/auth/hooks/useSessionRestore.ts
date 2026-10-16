import { useEffect } from 'react';
import { refreshAccessToken } from '@/api/http';
import { bootstrapGuestSession } from '@/api/session';
import { useAuthStore } from '@/stores/auth.store';
import { getCurrentUser } from '../api/auth.api';

let restoreStarted = false;

/**
 * Access token chỉ nằm trong bộ nhớ nên mỗi lần mở app phải khôi phục phiên:
 * POST /auth/refresh-token (cookie HttpOnly) → GET /users/me. Thất bại thì là Khách.
 * AppShell chưa render trang cho tới khi xong, để request đầu tiên đã mang đúng token.
 */
export function useSessionRestore() {
  useEffect(() => {
    if (restoreStarted) return;
    restoreStarted = true;

    const { setAuth, logout } = useAuthStore.getState();
    (async () => {
      try {
        const token = await refreshAccessToken();
        const user = await getCurrentUser();
        setAuth(user, token);
      } catch {
        // Không có phiên (hoặc lấy hồ sơ lỗi): xóa token dở dang, coi là Khách.
        logout();
        void bootstrapGuestSession();
      }
    })();
  }, []);
}

