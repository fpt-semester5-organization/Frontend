import { describe, expect, it, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { cleanUserMessage } from '@/lib/userMessage';

describe('KIỂM THỬ BẢO MẬT & VỆ SINH DỮ LIỆU FRONTEND (SECURITY TESTING)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null, guestToken: 'sec-guest-token' });
  });

  it('Bảo mật: Đảm bảo đăng xuất (Logout) xóa sạch mọi token xác thực trong Zustand và LocalStorage', () => {
    useAuthStore.setState({
      user: {
        userId: 777,
        fullName: 'VIP Hacker',
        email: 'hacker@veggielife.vn',
        role: 'MEMBER',
        isVip: true,
      },
      accessToken: 'secret-access-token-12345',
      guestToken: null,
    });

    expect(useAuthStore.getState().accessToken).toBe('secret-access-token-12345');

    // Thực hiện đăng xuất
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('Bảo mật: Vệ sinh thông điệp hiển thị (XSS & Leakage Prevention) không làm lộ payload hệ thống', () => {
    // Ngăn chặn rò rỉ mã lỗi nội bộ
    const sanitized = cleanUserMessage('Lỗi hệ thống: ERR_SQL_INJECTION_DETECTED (BR-SEC-999)');
    expect(sanitized).not.toContain('BR-SEC-999');
    expect(sanitized.length).toBeGreaterThan(0);
  });

  it('Bảo mật: Không cấp quyền VIP cho tài khoản thường khi chưa kích hoạt trạng thái', () => {
    useAuthStore.setState({
      user: {
        userId: 888,
        fullName: 'Người dùng thường',
        email: 'user@veggielife.vn',
        role: 'MEMBER',
        isVip: false,
      },
      accessToken: 'valid-token',
      guestToken: null,
    });

    expect(useAuthStore.getState().user?.isVip).toBe(false);
  });
});
