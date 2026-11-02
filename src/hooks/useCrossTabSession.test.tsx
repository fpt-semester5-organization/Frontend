import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TOKEN_KEY, USER_KEY, useAuthStore } from '@/stores/auth.store';
import { useCrossTabSession } from './useCrossTabSession';

const member = { userId: 7, fullName: 'An', email: 'an@x.vn', role: 'MEMBER' as const, isVip: false };

const fromOtherTab = (key: string, newValue: string | null) =>
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
  });

describe('useCrossTabSession', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ user: member, accessToken: 'old', token: 'old', isAuthenticated: true });
  });

  it('tab quay về từ cổng đã nâng VIP: tab này cập nhật role/isVip và token, không cần tải lại', () => {
    renderHook(() => useCrossTabSession());
    fromOtherTab(USER_KEY, JSON.stringify({ ...member, role: 'VIP', isVip: true }));
    fromOtherTab(TOKEN_KEY, 'new-token');
    expect(useAuthStore.getState().user).toMatchObject({ role: 'VIP', isVip: true });
    expect(useAuthStore.getState().accessToken).toBe('new-token');
  });

  it('bỏ qua tài khoản khác và dữ liệu hỏng', () => {
    renderHook(() => useCrossTabSession());
    fromOtherTab(USER_KEY, JSON.stringify({ ...member, userId: 8, role: 'VIP', isVip: true }));
    fromOtherTab(USER_KEY, '{hong');
    expect(useAuthStore.getState().user).toMatchObject({ userId: 7, role: 'MEMBER', isVip: false });
  });

  it('đăng xuất ở tab khác (giá trị bị xóa) không đổi tab này; chưa đăng nhập thì không nhận phiên', () => {
    renderHook(() => useCrossTabSession());
    fromOtherTab(USER_KEY, null);
    fromOtherTab(TOKEN_KEY, null);
    expect(useAuthStore.getState().user).toMatchObject({ userId: 7 });

    useAuthStore.setState({ user: null, accessToken: null, token: null, isAuthenticated: false });
    fromOtherTab(TOKEN_KEY, 'token-tab-khac');
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('gỡ lắng nghe khi unmount', () => {
    const { unmount } = renderHook(() => useCrossTabSession());
    unmount();
    fromOtherTab(USER_KEY, JSON.stringify({ ...member, role: 'VIP', isVip: true }));
    expect(useAuthStore.getState().user).toMatchObject({ role: 'MEMBER' });
  });
});
