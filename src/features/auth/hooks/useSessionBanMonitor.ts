import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { getCurrentUser } from '../api/auth.api';

/**
 * Hook chủ động kiểm tra token người dùng và trạng thái tài khoản:
 * - Định kỳ mỗi 60 giây khi người dùng đang đăng nhập.
 * - Khi người dùng quay lại tab (focus / visibilitychange), throttled tối thiểu 15 giây.
 *
 * Nếu tài khoản bị admin cấm hoặc vô hiệu hóa, request kiểm tra token sẽ kích hoạt
 * interceptor của http, thu hồi token ngay lập tức và đẩy về trang đăng nhập (/auth/login)
 * kèm theo thông báo tài khoản bị cấm.
 */
export function useSessionBanMonitor() {
  const lastCheckRef = useRef<number>(Date.now());

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const checkSession = async () => {
      const { isAuthenticated, user } = useAuthStore.getState();
      if (!isAuthenticated || !user) return;

      lastCheckRef.current = Date.now();
      try {
        await getCurrentUser();
      } catch {
        // Lỗi 401 hoặc 403 (banned) đã được http interceptor xử lý thu hồi token và điều hướng
      }
    };

    // Định kỳ kiểm tra mỗi 60 giây
    timer = setInterval(() => {
      checkSession();
    }, 60_000);

    // Kiểm tra ngay khi người dùng chuyển qua lại tab
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheckRef.current > 15_000) {
        void checkSession();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, []);
}
