import { useQuery } from '@tanstack/react-query';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth.store';
import { getMyProfile } from '../api/me.api';

export const myProfileKey = ['shared', 'me', 'profile'] as const;

/** Chỉ gọi khi đã đăng nhập — Khách gọi sẽ nhận 403 ERR_GUEST_PERSONALIZATION_RESTRICTED và bật popup. */
export function useMyProfile() {
  const authed = useAuthStore(selectIsAuthenticated);
  return useQuery({ queryKey: myProfileKey, queryFn: getMyProfile, enabled: authed, staleTime: 60_000 });
}
