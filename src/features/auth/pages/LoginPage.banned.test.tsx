// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockApi } from '@/test/mockApi';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { LoginPage } from './LoginPage';

function renderLoginPage(initialEntry: string | { pathname: string; state?: unknown }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry as string]}>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe('LoginPage - Xử lý hiển thị khi tài khoản bị khóa/cấm', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null, token: null, guestToken: 'guest-jwt', isAuthenticated: false });
    useUiStore.setState({ toasts: [], bannedModal: { open: false, message: '' } });
  });

  it('hiển thị thông báo tài khoản bị khóa khi chuyển hướng từ sessionStorage', async () => {
    const noticeText = 'Tài khoản của bạn đã bị khóa bởi Quản trị viên';
    window.sessionStorage.setItem('vl_banned_notice', noticeText);

    renderLoginPage('/auth/login');

    expect(await screen.findByText(noticeText)).toBeInTheDocument();
    // sessionStorage được dọn dẹp sau khi đọc
    expect(window.sessionStorage.getItem('vl_banned_notice')).toBeNull();
    // Có bật toast lỗi
    expect(useUiStore.getState().toasts.some((t) => t.message.includes(noticeText))).toBe(true);
  });

  it('hiển thị thông báo tài khoản bị khóa khi chuyển hướng qua location state', async () => {
    const banMsg = 'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Lý do: Vi phạm tiêu chuẩn';
    renderLoginPage({ pathname: '/auth/login', state: { banned: true, bannedMessage: banMsg } });

    expect(await screen.findByText(banMsg)).toBeInTheDocument();
    expect(useUiStore.getState().toasts.some((t) => t.message.includes(banMsg))).toBe(true);
  });

  it('khi đăng nhập bằng tài khoản bị khóa (403 ERR_AUTH_ACCOUNT_BANNED): hiện thông báo lỗi cấm rõ ràng', async () => {
    mockApi(() => ({
      status: 403,
      errorCode: 'ERR_AUTH_ACCOUNT_BANNED',
      message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.',
    }));

    renderLoginPage('/auth/login');

    await userEvent.type(screen.getByLabelText(/Email/), 'banned.user@veggielife.vn');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'Password@123');
    await userEvent.click(screen.getByRole('button', { name: /^Đăng nhập/ }));

    expect(await screen.findByText(/Tài khoản của bạn đã bị khóa bởi Quản trị viên/)).toBeInTheDocument();
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('Tài khoản của bạn đã bị khóa bởi Quản trị viên'))).toBe(true);
  });
});

