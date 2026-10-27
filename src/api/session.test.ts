// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { _resetBanHandlingForTests, getBannedReason, handleAccountBanned } from './session';

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
