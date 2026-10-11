import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { logout as logoutRequest } from '../api/auth.api';

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Phiên phía server có thể đã hết hạn; vẫn xóa phiên ở trình duyệt.
    }
    useAuthStore.getState().logout();
    queryClient.clear();
    navigate(PATHS.HOME);
  }, [queryClient, navigate]);
}
