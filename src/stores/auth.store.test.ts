import { beforeEach, describe, expect, it } from 'vitest';
import { selectIsAdmin, selectIsAuthenticated, selectIsVip, selectRole, useAuthStore, type AuthUser } from './auth.store';

const member: AuthUser = { userId: 7, fullName: 'An', email: 'an@x.vn', role: 'MEMBER', isVip: false };

beforeEach(() => {
  window.localStorage.clear();
  useAuthStore.setState({ user: null, accessToken: null, guestToken: null });
});

describe('auth store', () => {
  it('setSession lưu user + token và chuyển sang đã đăng nhập', () => {
    useAuthStore.getState().setSession(member, 'tok');
    const s = useAuthStore.getState();
    expect(selectIsAuthenticated(s)).toBe(true);
    expect(selectRole(s)).toBe('MEMBER');
    expect(window.localStorage.getItem('vl_access_token')).toBe('tok');
  });

  it('Khách (chưa đăng nhập) có vai trò GUEST', () => {
    expect(selectRole(useAuthStore.getState())).toBe('GUEST');
    expect(selectIsAuthenticated(useAuthStore.getState())).toBe(false);
  });

  it('VIP nhận biết qua role VIP hoặc claim isVip; ADMIN riêng', () => {
    useAuthStore.getState().setSession({ ...member, role: 'MEMBER', isVip: true }, 't');
    expect(selectIsVip(useAuthStore.getState())).toBe(true);
    useAuthStore.getState().setSession({ ...member, role: 'ADMIN' }, 't');
    expect(selectIsAdmin(useAuthStore.getState())).toBe(true);
    expect(selectIsVip(useAuthStore.getState())).toBe(false);
  });

  it('updateUser gộp một phần thông tin và lưu lại', () => {
    useAuthStore.getState().setSession(member, 't');
    useAuthStore.getState().updateUser({ fullName: 'Bình', isVip: true });
    expect(useAuthStore.getState().user).toMatchObject({ fullName: 'Bình', isVip: true, userId: 7 });
    expect(JSON.parse(window.localStorage.getItem('vl_user') ?? '{}').fullName).toBe('Bình');
  });

  it('updateUser không làm gì khi chưa đăng nhập', () => {
    useAuthStore.getState().updateUser({ fullName: 'X' });
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('logout xóa token + user nhưng giữ guestToken; clearGuestToken xóa phiên Khách', () => {
    useAuthStore.getState().setGuestToken('g');
    useAuthStore.getState().setSession(member, 't');
    useAuthStore.getState().logout();
    expect(useAuthStore.getState()).toMatchObject({ user: null, accessToken: null, guestToken: 'g' });
    useAuthStore.getState().clearGuestToken();
    expect(useAuthStore.getState().guestToken).toBeNull();
  });
});
