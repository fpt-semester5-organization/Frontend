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
  accountStatus?: string;
  isProfileCompleted?: boolean;
  phoneNumber?: string | null;
}

export type UserRole = AuthUser['role'];

export type SessionStatus = 'restoring' | 'ready';

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
  accessToken: string | null;
  token: string | null;
  guestToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  sessionStatus: SessionStatus;
  setSession: (user: AuthUser, accessToken: string) => void;
  setAuth: (user: AuthUser, token: string) => void;
  setAccessToken: (accessToken: string) => void;
  setToken: (token: string) => void;
  setGuestToken: (token: string) => void;
  clearGuestToken: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  setSessionStatus: (status: SessionStatus) => void;
  logout: () => void;
}

const initialUser = readUser();
const initialToken = storage.get(TOKEN_KEY);

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: initialToken,
  token: initialToken,
  guestToken: storage.get(GUEST_KEY),
  user: initialUser,
  isAuthenticated: !!initialUser && !!initialToken,
  sessionStatus: 'ready',
  setSession: (user, accessToken) => {
    storage.set(TOKEN_KEY, accessToken);
    storage.set(USER_KEY, JSON.stringify(user));
    set({ user, accessToken, token: accessToken, isAuthenticated: true, sessionStatus: 'ready' });
  },
  setAuth: (user, token) => {
    storage.set(TOKEN_KEY, token);
    storage.set(USER_KEY, JSON.stringify(user));
    set({ user, accessToken: token, token, isAuthenticated: true, sessionStatus: 'ready' });
  },
  setAccessToken: (accessToken) => {
    storage.set(TOKEN_KEY, accessToken);
    set((s) => ({ accessToken, token: accessToken, isAuthenticated: !!s.user && !!accessToken }));
  },
  setToken: (token) => {
    storage.set(TOKEN_KEY, token);
    set((s) => ({ accessToken: token, token, isAuthenticated: !!s.user && !!token }));
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
  setSessionStatus: (sessionStatus) => set({ sessionStatus }),
  logout: () => {
    storage.remove(TOKEN_KEY);
    storage.remove(USER_KEY);
    set({ accessToken: null, token: null, user: null, isAuthenticated: false, sessionStatus: 'ready' });
  },
}));

/** Vai trò hiện hành của người đang dùng app (GUEST khi chưa đăng nhập). */
export const selectRole = (s: AuthState): Role => (s.user ? s.user.role : ROLES.GUEST);
export const selectIsAuthenticated = (s: AuthState) => !!s.user && (!!s.accessToken || !!s.token);
export const selectIsVip = (s: AuthState) => !!s.user && (s.user.role === 'VIP' || s.user.isVip);
export const selectIsAdmin = (s: AuthState) => s.user?.role === 'ADMIN';

export const useRole = () => useAuthStore(selectRole);
export const useIsAuthenticated = () => useAuthStore(selectIsAuthenticated);
export const useIsVip = () => useAuthStore(selectIsVip);
