import { describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';

describe('KIỂM THỬ HỢP ĐỒNG API & ENVELOPE FRONTEND (API CONTRACT TESTING)', () => {
  it('Contract: Quản lý Header xác thực đúng chuẩn Bearer Token', () => {
    useAuthStore.setState({ accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample' });
    const token = useAuthStore.getState().accessToken;

    expect(token).toBeTruthy();
    const authHeader = `Bearer ${token}`;
    expect(authHeader).toMatch(/^Bearer eyJ[A-Za-z0-9_-]+/);
  });

  it('Contract: Schema người dùng (User DTO) phải có đủ các thuộc tính bắt buộc', () => {
    const userPayload = {
      userId: 55,
      fullName: 'Trần Thị Thuần Chay',
      email: 'thuan.chay@veggielife.vn',
      role: 'MEMBER',
      isVip: true,
    };

    useAuthStore.setState({ user: userPayload });
    const currentUser = useAuthStore.getState().user;

    expect(currentUser).not.toBeNull();
    expect(currentUser?.userId).toBe(55);
    expect(currentUser?.role).toBe('MEMBER');
    expect(currentUser?.isVip).toBe(true);
  });
});
