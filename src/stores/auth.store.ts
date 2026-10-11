import { create } from 'zustand';
import type { DeepRequired, Schemas } from '@/api/types';

/** Người dùng hiện tại, lấy đúng field từ GET /users/me (FN-PROF-01). */
export type AuthUser = Pick<
  DeepRequired<Schemas['GetCurrentUserResponse']['data']>,
  'userId' | 'fullName' | 'email' | 'role' | 'isVip'
> & { avatarUrl?: string | null };

export type UserRole = AuthUser['role'];

/**
 * - restoring: đang thử khôi phục phiên bằng refresh token (cookie HttpOnly) lúc mở app.
 * - ready: đã biết là Khách hay Thành viên.
 */
export type SessionStatus = 'restoring' | 'ready';

interface AuthState {
  user: AuthUser | null;
  /** Access token chỉ giữ trong bộ nhớ, không lưu localStorage (README quy tắc 5). */
  token: string | null;
  isAuthenticated: boolean;
  sessionStatus: SessionStatus;
  setAuth: (user: AuthUser, token: string) => void;
  setToken: (token: string) => void;
  setSessionStatus: (status: SessionStatus) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  sessionStatus: 'restoring',
  setAuth: (user, token) => set({ user, token, isAuthenticated: true, sessionStatus: 'ready' }),
  setToken: (token) => set({ token }),
  setSessionStatus: (sessionStatus) => set({ sessionStatus }),
  logout: () => set({ user: null, token: null, isAuthenticated: false, sessionStatus: 'ready' }),
}));
