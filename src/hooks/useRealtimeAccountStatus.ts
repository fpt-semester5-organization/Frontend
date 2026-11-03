import { useEffect } from 'react';
import { initRealtimeAuth, stopRealtimeAuth } from '@/services/realtimeAuth';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Hook quản lý kết nối SignalR realtime để phát hiện sự kiện Admin khóa/cấm tài khoản.
 * Tự động kết nối khi đăng nhập và ngắt kết nối khi đăng xuất.
 */
export function useRealtimeAccountStatus(): void {
  const userId = useAuthStore((s) => s.user?.userId);
  const hasToken = useAuthStore((s) => !!s.accessToken);

  useEffect(() => {
    if (hasToken && userId) {
      const cleanup = initRealtimeAuth();
      return () => {
        cleanup();
      };
    } else {
      stopRealtimeAuth();
    }
  }, [hasToken, userId]);
}

