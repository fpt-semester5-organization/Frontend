import { useEffect } from 'react';
import { apiErrorCode, apiErrorMessage, apiErrorStatus, refreshAccessToken } from '@/api/http';
import { bootstrapGuestSession, handleAccountBanned } from '@/api/session';
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
      } catch (err) {
        const code = apiErrorCode(err);
        const status = apiErrorStatus(err);
        const msg = apiErrorMessage(err);

        // Nếu tài khoản đã bị cấm/đình chỉ: lập tức thu hồi token và quay về trang login hiển thị cảnh báo
        if (code === 'ERR_AUTH_ACCOUNT_BANNED' || (status === 403 && /banned|đình chỉ|cấm/i.test(msg))) {
          handleAccountBanned(msg);
          return;
        }

        // Không có phiên (hoặc lấy hồ sơ lỗi thông thường): xóa token dở dang, coi là Khách.
        logout();
        await bootstrapGuestSession();
      }
    })();
  }, []);
}


