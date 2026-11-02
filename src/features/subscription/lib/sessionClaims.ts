import { refreshAccessToken } from '@/api/session';
import { decodeJwtClaims } from '@/lib/jwtClaims';
import { useAuthStore } from '@/stores/auth.store';

export { decodeJwtClaims };

/**
 * Sau khi VIP kích hoạt (IPN thành công), JWT cũ vẫn mang role MEMBER/isVip=false (D104) nên RequireVip và hạn mức sai.
 * Làm mới Access Token (POST /auth/refresh-token) rồi đồng bộ `role` + `isVip` vào store.
 * Trả về true nếu đã cập nhật phiên.
 */
export async function refreshVipSessionClaims(): Promise<boolean> {
  const { user } = useAuthStore.getState();
  if (!user) return false;
  try {
    const token = await refreshAccessToken();
    const c = decodeJwtClaims(token);
    const role = c.role === 'ADMIN' || c.role === 'MEMBER' || c.role === 'VIP' ? c.role : user.role === 'ADMIN' ? 'ADMIN' : 'VIP';
    useAuthStore.getState().setSession({ ...user, role, isVip: c.isVip ?? true }, token);
    return true;
  } catch {
    return false;
  }
}
