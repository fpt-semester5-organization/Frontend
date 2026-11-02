export interface JwtClaims {
  role?: string;
  isVip?: boolean;
}

const ROLE_CLAIM_LONG = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

/** Đọc payload JWT (không xác thực chữ ký — chỉ để đồng bộ giao diện; server vẫn kiểm tra mọi request). */
export function decodeJwtClaims(token: string): JwtClaims {
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
