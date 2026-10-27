// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuthStore } from '@/stores/auth.store';
import { _resetBanHandlingForTests, getBannedReason } from '@/api/session';
import { mockApi } from '@/test/mockApi';
import { useSessionRestore } from './useSessionRestore';

describe('useSessionRestore - Ban Handling', () => {
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
      accessToken: 'old-access-token',
      token: 'old-access-token',
      isAuthenticated: true,
    });
  });

  it('khi refresh-token trả về 403 ERR_AUTH_ACCOUNT_BANNED thì thu hồi token và lưu lý do', async () => {
    mockApi((req) => {
      if (req.url.includes('/auth/refresh-token')) {
        return {
          status: 403,
          errorCode: 'ERR_AUTH_ACCOUNT_BANNED',
          message: 'Tài khoản của bạn đã bị đình chỉ hoặc cấm.',
        };
      }
      return undefined;
    });

    renderHook(() => useSessionRestore());

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
    });

    expect(getBannedReason()).toBe('Tài khoản của bạn đã bị đình chỉ hoặc cấm.');
  });
});
