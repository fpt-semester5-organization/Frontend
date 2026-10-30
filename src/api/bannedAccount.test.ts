// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllTokensFromStorage, handleAccountBanned, registerRouterNavigator } from '@/api/session';
import { http } from '@/api/http';
import { PATHS } from '@/routes/paths';
import { useAuthStore, type AuthUser } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { mockApi } from '@/test/mockApi';

const dummyUser: AuthUser = {
  userId: 300,
  fullName: 'Nguyễn Văn Vi Phạm',
  email: 'member.ban.test@veggielife.vn',
  role: 'MEMBER',
  isVip: false,
};

describe('Xử lý tài khoản bị Admin cấm/khóa (Frontend Ban Revocation)', () => {
  const mockNavigator = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockNavigator.mockClear();
    registerRouterNavigator(mockNavigator);

    useAuthStore.setState({
      user: null,
      accessToken: null,
      token: null,
      guestToken: null,
      isAuthenticated: false,
      sessionStatus: 'ready',
    });

    useUiStore.setState({
      toasts: [],
      bannedModal: { open: false, message: '' },
    });
  });

  describe('1. clearAllTokensFromStorage & handleAccountBanned', () => {
    it('xóa sạch mọi loại Access Token và Refresh Token trong localStorage', () => {
      window.localStorage.setItem('vl_access_token', 'jwt-token-123');
      window.localStorage.setItem('access_token', 'legacy-access-token');
      window.localStorage.setItem('accessToken', 'camel-access-token');
      window.localStorage.setItem('token', 'simple-token');
      window.localStorage.setItem('vl_refresh_token', 'refresh-token-456');
      window.localStorage.setItem('refresh_token', 'refresh-token-789');
      window.localStorage.setItem('refreshToken', 'camel-refresh-token');
      window.localStorage.setItem('vl_user', JSON.stringify(dummyUser));
      window.localStorage.setItem('user', JSON.stringify(dummyUser));
      window.localStorage.setItem('vl_guest_token', 'guest-jwt-999');

      clearAllTokensFromStorage();

      expect(window.localStorage.getItem('vl_access_token')).toBeNull();
      expect(window.localStorage.getItem('access_token')).toBeNull();
      expect(window.localStorage.getItem('accessToken')).toBeNull();
      expect(window.localStorage.getItem('token')).toBeNull();
      expect(window.localStorage.getItem('vl_refresh_token')).toBeNull();
      expect(window.localStorage.getItem('refresh_token')).toBeNull();
      expect(window.localStorage.getItem('refreshToken')).toBeNull();
      expect(window.localStorage.getItem('vl_user')).toBeNull();
      expect(window.localStorage.getItem('user')).toBeNull();
      expect(window.localStorage.getItem('vl_guest_token')).toBeNull();
    });

    it('handleAccountBanned dọn sạch phiên, lưu sessionStorage, bật Toast/Modal và điều hướng về /login', () => {
      useAuthStore.setState({
        user: dummyUser,
        accessToken: 'active-token-300',
        token: 'active-token-300',
        isAuthenticated: true,
      });
      window.localStorage.setItem('vl_access_token', 'active-token-300');

      const banMessage = 'Tài khoản của bạn đã bị khóa bởi Quản trị viên';
      handleAccountBanned(banMessage);

      // Token và phiên đã bị xóa
      expect(window.localStorage.getItem('vl_access_token')).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // SessionStorage lưu thông báo
      expect(window.sessionStorage.getItem('vl_banned_notice')).toBe(banMessage);

      // Toast thông báo được kích hoạt
      const toasts = useUiStore.getState().toasts;
      expect(toasts.some((t) => t.message.includes(banMessage))).toBe(true);

      // Modal thông báo được bật
      expect(useUiStore.getState().bannedModal.open).toBe(true);
      expect(useUiStore.getState().bannedModal.message).toBe(banMessage);

      // Điều hướng về /auth/login
      expect(mockNavigator).toHaveBeenCalledWith(PATHS.AUTH.LOGIN, {
        replace: true,
        state: { banned: true, bannedMessage: banMessage },
      });
    });
  });

  describe('2. Axios Interceptor bắt mã 403 Forbidden ERR_AUTH_ACCOUNT_BANNED', () => {
    it('khi đang thao tác mà nhận 403 ERR_AUTH_ACCOUNT_BANNED: lập tức văng ra login và báo lỗi', async () => {
      useAuthStore.setState({
        user: dummyUser,
        accessToken: 'banned-jwt-token',
        token: 'banned-jwt-token',
        isAuthenticated: true,
      });
      window.localStorage.setItem('vl_access_token', 'banned-jwt-token');

      mockApi((req) => {
        if (req.url === '/users/me') {
          return {
            status: 403,
            errorCode: 'ERR_AUTH_ACCOUNT_BANNED',
            message: 'Tài khoản của bạn đã bị quản trị viên khóa hoặc cấm. Phiên làm việc đã bị thu hồi ngay lập tức.',
          };
        }
        return undefined;
      });

      await expect(http.get('/users/me')).rejects.toThrow();

      // Token đã bị xóa
      expect(window.localStorage.getItem('vl_access_token')).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Điều hướng về login
      expect(mockNavigator).toHaveBeenCalledWith(PATHS.AUTH.LOGIN, expect.objectContaining({
        replace: true,
        state: expect.objectContaining({ banned: true }),
      }));

      // Toast và Modal được bật
      const toasts = useUiStore.getState().toasts;
      expect(toasts.length).toBeGreaterThan(0);
      expect(useUiStore.getState().bannedModal.open).toBe(true);
    });

    it('khi refresh token thất bại với 403 ERR_AUTH_ACCOUNT_BANNED: cũng văng ra login và dọn token', async () => {
      useAuthStore.setState({
        user: dummyUser,
        accessToken: 'expired-token',
        token: 'expired-token',
        isAuthenticated: true,
      });
      window.localStorage.setItem('vl_access_token', 'expired-token');

      mockApi((req) => {
        if (req.url === '/fridge/items') {
          return {
            status: 401,
            errorCode: 'ERR_AUTH_INVALID_TOKEN',
            message: 'Phiên đăng nhập đã hết hạn.',
          };
        }
        if (req.url === '/auth/refresh-token') {
          return {
            status: 403,
            errorCode: 'ERR_AUTH_ACCOUNT_BANNED',
            message: 'Tài khoản bị đình chỉ hoặc cấm.',
          };
        }
        return undefined;
      });

      await expect(http.get('/fridge/items')).rejects.toThrow();

      expect(window.localStorage.getItem('vl_access_token')).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(mockNavigator).toHaveBeenCalledWith(PATHS.AUTH.LOGIN, expect.objectContaining({ replace: true }));
      expect(useUiStore.getState().bannedModal.open).toBe(true);
    });

    it('khi gửi request tại trang /auth/login bị 403 ERR_AUTH_ACCOUNT_BANNED: dọn token nhưng không chuyển trang lặp', async () => {
      window.localStorage.setItem('vl_access_token', 'stale-token');

      mockApi((req) => {
        if (req.url === '/auth/login') {
          return {
            status: 403,
            errorCode: 'ERR_AUTH_ACCOUNT_BANNED',
            message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.',
          };
        }
        return undefined;
      });

      await expect(http.post('/auth/login', { email: 'banned@x.vn', password: '123' })).rejects.toThrow();

      // Dọn token cũ
      expect(window.localStorage.getItem('vl_access_token')).toBeNull();

      // Không gọi navigate vì đã ở trang login
      expect(mockNavigator).not.toHaveBeenCalled();
    });
  });
});
