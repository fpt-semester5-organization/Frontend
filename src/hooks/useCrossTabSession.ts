import { useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';
import { TOKEN_KEY, USER_KEY, useAuthStore, type AuthUser } from '@/stores/auth.store';

/**
 * Trang thanh toán của cổng mở ở tab mới, nên tab quay về từ cổng có thể nâng VIP trong khi tab cũ vẫn giữ `user` là MEMBER.
 * Sự kiện `storage` chỉ bắn ở các tab khác: cập nhật token và role/isVip theo tab vừa đổi, không cần tải lại trang.
 * Chỉ áp dụng cho cùng một tài khoản; đăng xuất ở tab khác giữ nguyên hành vi hiện tại.
 */
export function useCrossTabSession() {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.newValue) return;
      const { user, setToken, updateUser } = useAuthStore.getState();
      if (!user) return;
      if (event.key === TOKEN_KEY) {
        setToken(event.newValue);
        return;
      }
      if (event.key !== USER_KEY) return;
      let next: AuthUser;
      try {
        next = JSON.parse(event.newValue) as AuthUser;
      } catch {
        return;
      }
      if (next.userId !== user.userId || (next.role === user.role && next.isVip === user.isVip)) return;
      updateUser({ role: next.role, isVip: next.isVip });
      void queryClient.invalidateQueries();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}
