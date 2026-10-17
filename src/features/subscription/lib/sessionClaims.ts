import { refreshAccessToken } from '@/api/session';
import { useAuthStore } from '@/stores/auth.store';

interface Claims {
  role?: string;
  isVip?: boolean;
}

const ROLE_CLAIM_LONG = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

/** Đọc payload JWT (không xác thực chữ ký — chỉ để đồng bộ giao diện; server vẫn kiểm tra mọi request). */
export function decodeJwtClaims(token: string): Claims {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const p = JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
    const role = (p.role ?? p[ROLE_CLAIM_LONG]) as string | string[] | undefined;
    const isVipRaw = p.isVip ?? p.is_vip;
    return {
      role: Array.isArray(role) ? role[0] : role,
      isVip: typeof isVipRaw === 'string' ? isVipRaw.toLowerCase() === 'true' : typeof isVipRaw === 'boolean' ? isVipRaw : undefined,
    };
  } catch {
    return {};
  }
}

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
