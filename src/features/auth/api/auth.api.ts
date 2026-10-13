import http from '@/api/http';
import type { ApiEnvelope, DeepRequired, Schemas } from '@/api/types';
import type { AuthUser } from '@/stores/auth.store';

type LoginRequest = Schemas['LoginRequest'];
type LoginData = DeepRequired<Schemas['LoginResponse']['data']>;
type CurrentUserData = DeepRequired<Schemas['GetCurrentUserResponse']['data']>;

/** POST /auth/login (FN-AUTH-08). */
export async function login(body: LoginRequest) {
  const res = await http.post<ApiEnvelope<LoginData>>('/auth/login', body, { withCredentials: true });
  return res.data;
}

/** POST /auth/logout (FN-AUTH-10): thu hồi refresh token, xóa cookie. */
export async function logout() {
  await http.post<ApiEnvelope<null>>('/auth/logout', null, { withCredentials: true });
}

/** GET /users/me (FN-PROF-01): chỉ lấy các field phiên đăng nhập cần. */
export async function getCurrentUser(): Promise<AuthUser> {
  const res = await http.get<ApiEnvelope<CurrentUserData>>('/users/me');
  const { userId, fullName, email, role, isVip, avatarUrl } = res.data.data;
  return { userId, fullName, email, role, isVip, avatarUrl };
}
