import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { refreshAccessToken } from '@/api/http';
import { useAuthStore } from '@/stores/auth.store';
import { getCurrentUser } from '../api/auth.api';

let restoreStarted = false;

/**
 * Access token chỉ nằm trong bộ nhớ nên mỗi lần mở app phải khôi phục phiên:
 * POST /auth/refresh-token (cookie HttpOnly) → GET /users/me. Thất bại thì là Khách.
 */
export function useSessionRestore() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (restoreStarted) return;
    restoreStarted = true;

    const { setAuth, logout } = useAuthStore.getState();
    (async () => {
      try {
        const token = await refreshAccessToken();
        const user = await getCurrentUser();
        setAuth(user, token);
        // Dữ liệu đã tải trong lúc chờ khôi phục được gọi như Khách (thiếu token, memberActions = false).
        await queryClient.invalidateQueries();
      } catch {
        // Không có phiên (hoặc lấy hồ sơ lỗi): xóa token dở dang, coi là Khách.
        logout();
      }
    })();
  }, [queryClient]);
}
