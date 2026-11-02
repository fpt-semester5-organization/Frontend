// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { mockApi } from '@/test/mockApi';
import { _resetBanHandlingForTests, getBannedReason, handleAccountBanned, refreshAccessToken, syncRoleClaims } from './session';

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (claims: object) => `h.${b64(claims)}.s`;

describe('session - đồng bộ role/isVip theo JWT mới (D104)', () => {
  const member = { userId: 101, fullName: 'An', email: 'an@x.vn', role: 'MEMBER' as const, isVip: false };

  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ user: member, accessToken: 'old', token: 'old', isAuthenticated: true });
  });

  it('webhook đã nâng VIP: lần làm mới token kế tiếp chuyển Thành viên sang VIP, không cần đăng nhập lại', async () => {
    const token = jwt({ role: 'VIP', isVip: 'true' });
    mockApi((req) => (req.url === '/auth/refresh-token' ? { data: { accessToken: token } } : undefined));
    await expect(refreshAccessToken()).resolves.toBe(token);
    expect(useAuthStore.getState().user).toMatchObject({ role: 'VIP', isVip: true });
    expect(useAuthStore.getState().accessToken).toBe(token);
    expect(JSON.parse(window.localStorage.getItem('vl_user') ?? '{}')).toMatchObject({ role: 'VIP', isVip: true });
  });

  it('VIP hết hạn: token mới hạ về Thành viên', () => {
    useAuthStore.setState({ user: { ...member, role: 'VIP', isVip: true } });
    expect(syncRoleClaims(jwt({ role: 'MEMBER', isVip: 'false' }))).toBe(true);
    expect(useAuthStore.getState().user).toMatchObject({ role: 'MEMBER', isVip: false });
  });

  it('không đổi gì khi claim giống hiện tại hoặc token không đọc được', () => {
    expect(syncRoleClaims(jwt({ role: 'MEMBER', isVip: 'false' }))).toBe(false);
    expect(syncRoleClaims('khong-phai-jwt')).toBe(false);
    expect(useAuthStore.getState().user).toMatchObject({ role: 'MEMBER', isVip: false });
  });

  it('chưa đăng nhập thì không tạo user từ token', () => {
    useAuthStore.setState({ user: null });
    expect(syncRoleClaims(jwt({ role: 'VIP', isVip: 'true' }))).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('session - Ban Handling', () => {
  beforeEach(() => {
    _resetBanHandlingForTests();
    window.sessionStorage.clear();
    window.localStorage.clear();
    useAuthStore.setState({
      user: {
        userId: 101,
        fullName: 'Nguyễn Văn An',
        email: 'an@x.vn',
        role: 'MEMBER',
        isVip: false,
      },
      accessToken: 'valid-access-token',
      token: 'valid-access-token',
      isAuthenticated: true,
    });
  });

  it('handleAccountBanned thu hồi token, xóa session và lưu lý do vào sessionStorage', () => {
    const banMsg = 'Tài khoản của bạn đã bị cấm do vi phạm điều khoản dịch vụ.';
    handleAccountBanned(banMsg);

    // Token và user bị thu hồi ngay lập tức
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);

    // Lý do cấm được lưu trong sessionStorage
    expect(getBannedReason()).toBe(banMsg);
    // getBannedReason tự dọn dẹp sau khi đọc
    expect(getBannedReason()).toBeNull();
  });

  it('handleAccountBanned phát custom event vl:account_banned khi đã ở trang login', () => {
    window.history.pushState({}, '', '/auth/login');
    const listener = vi.fn();
    window.addEventListener('vl:account_banned', listener);

    handleAccountBanned('Tài khoản bị cấm.');

    expect(listener).toHaveBeenCalled();
    const event = listener.mock.calls[0][0] as CustomEvent<{ message: string }>;
    expect(event.detail.message).toBe('Tài khoản bị cấm.');

    window.removeEventListener('vl:account_banned', listener);
  });
});
