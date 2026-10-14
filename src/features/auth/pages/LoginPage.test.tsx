// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import { useAuthStore } from '@/stores/auth.store';
import { LoginPage } from './LoginPage';

beforeEach(() => {
  window.localStorage.clear();
  useAuthStore.setState({ user: null, accessToken: null, guestToken: 'guest-jwt' });
});

describe('LoginPage (SCR-01)', () => {
  it('báo lỗi dưới từng trường khi dữ liệu sai và không gọi API', async () => {
    const calls = mockApi(() => ({ data: {} }));
    renderPage(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/Email/), 'abc');
    await userEvent.click(screen.getByRole('button', { name: /^Đăng nhập/ }));
    expect((await screen.findAllByText('Email không đúng định dạng'))[0]).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('401 hiển thị số lần thử còn lại do server trả', async () => {
    mockApi(() => ({ status: 401, errorCode: 'ERR_AUTH_INVALID_CREDENTIALS', message: 'Sai email hoặc mật khẩu.', data: { remainingAttempts: 3 } }));
    renderPage(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/Email/), 'an@x.vn');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'Veggie@2026');
    await userEvent.click(screen.getByRole('button', { name: /^Đăng nhập/ }));
    expect(await screen.findByText(/Còn 3 lần thử/)).toBeInTheDocument();
  });

  it('409 PENDING_DELETION mở hộp thoại khôi phục và gửi restoreAccount=true khi xác nhận', async () => {
    const calls = mockApi((r) => {
      if (r.url !== '/auth/login') return undefined;
      return (r.body as { restoreAccount?: boolean }).restoreAccount
        ? { data: { tokenType: 'Bearer', accessToken: 'new-token', expiresIn: 900, user: { userId: 1, email: 'an@x.vn', fullName: 'An', role: 'MEMBER', isVip: false } } }
        : { status: 409, errorCode: 'ERR_AUTH_ACCOUNT_PENDING_DELETION', message: 'Tài khoản đang chờ xóa.' };
    });
    renderPage(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/Email/), 'an@x.vn');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'Veggie@2026');
    await userEvent.click(screen.getByRole('button', { name: /^Đăng nhập/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Khôi phục/ }));
    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('new-token'));
    expect(calls.map((c) => (c.body as { restoreAccount: boolean }).restoreAccount)).toEqual([false, true]);
    expect(useAuthStore.getState().guestToken).toBeNull(); // phiên Khách đã hợp nhất vào tài khoản
  });
});
