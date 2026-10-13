import { create } from 'zustand';
import { ROLES, type Role } from '@/constants/roles';
import { storage } from '@/lib/storage';

export interface AuthUser {
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: Exclude<Role, 'GUEST'>;
  isVip: boolean;
  /** Có trong phản hồi login/verify-otp (xem openapi LoginResponse). */
  accountStatus?: string;
  isProfileCompleted?: boolean;
  phoneNumber?: string | null;
}

const TOKEN_KEY = 'vl_access_token';
const USER_KEY = 'vl_user';
const GUEST_KEY = 'vl_guest_token';

const readUser = (): AuthUser | null => {
  const raw = storage.get(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

interface AuthState {
  /** Access Token của Thành viên/VIP/Admin (15 phút). Refresh Token nằm trong cookie HttpOnly. */
  accessToken: string | null;
  /** Anonymous JWT của Khách (24 giờ, role GUEST). */
  guestToken: string | null;
  user: AuthUser | null;
  setSession: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setGuestToken: (token: string) => void;
  /** Bỏ Anonymous JWT (sau khi đăng nhập/kích hoạt: ngữ cảnh Khách đã được server hợp nhất). */
  clearGuestToken: () => void;
  /** Cập nhật một phần thông tin người dùng (vd. sau PATCH /users/me hoặc GET /users/me). */
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
  clearAuth: () => void;
  setAuth: (user: any, accessToken: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: storage.get(TOKEN_KEY),
  guestToken: storage.get(GUEST_KEY),
  user: readUser(),
  setSession: (user, accessToken) => {
    storage.set(TOKEN_KEY, accessToken);
    storage.set(USER_KEY, JSON.stringify(user));
    set({ user, accessToken });
  },
  setAccessToken: (accessToken) => {
    storage.set(TOKEN_KEY, accessToken);
    set({ accessToken });
  },
  setGuestToken: (guestToken) => {
    storage.set(GUEST_KEY, guestToken);
    set({ guestToken });
  },
  clearGuestToken: () => {
    storage.remove(GUEST_KEY);
    set({ guestToken: null });
  },
  updateUser: (patch) =>
    set((s) => {
      if (!s.user) return s;
      const user = { ...s.user, ...patch };
      storage.set(USER_KEY, JSON.stringify(user));
      return { user };
    }),
  logout: () => {
    storage.remove(TOKEN_KEY);
    storage.remove(USER_KEY);
    set({ accessToken: null, user: null });
  },
  clearAuth: () => {
    storage.remove(TOKEN_KEY);
    storage.remove(USER_KEY);
    set({ accessToken: null, user: null });
  },
  setAuth: (user: any, accessToken: string) => {
    storage.set(TOKEN_KEY, accessToken);
    storage.set(USER_KEY, JSON.stringify(user));
    set({ user, accessToken });
  },
}));

/** Vai trò hiện hành của người đang dùng app (GUEST khi chưa đăng nhập). */
export const selectRole = (s: AuthState): Role => (s.user ? s.user.role : ROLES.GUEST);
export const selectIsAuthenticated = (s: AuthState) => !!s.user && !!s.accessToken;
export const selectIsVip = (s: AuthState) => !!s.user && (s.user.role === 'VIP' || s.user.isVip);
export const selectIsAdmin = (s: AuthState) => s.user?.role === 'ADMIN';

export const useRole = () => useAuthStore(selectRole);
export const useIsAuthenticated = () => useAuthStore(selectIsAuthenticated);
export const useIsVip = () => useAuthStore(selectIsVip);
