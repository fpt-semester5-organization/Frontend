// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/app/AppShell';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { http } from '@/api/http';
import { handleAccountBanned } from '@/api/session';
import { mockApi } from '@/test/mockApi';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

describe('BannedAccountFlow - Kiểm thử thực tế trải nghiệm trên Giao diện người dùng', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    useAuthStore.setState({
      user: null,
      accessToken: null,
      token: null,
      guestToken: 'guest-jwt',
      isAuthenticated: false,
      sessionStatus: 'ready',
    });

    useUiStore.setState({
      toasts: [],
      bannedModal: { open: false, message: '' },
    });
  });

  it('1. Đang thao tác trên giao diện thì nhận 403 Forbidden: Modal và Toast bật ngay lập tức, bấm "Đã hiểu" văng về /login kèm cảnh báo đỏ', async () => {
    // Giả lập người dùng đã đăng nhập thành viên
    useAuthStore.setState({
      user: {
        userId: 300,
        fullName: 'Nguyễn Văn Vi Phạm',
        email: 'member.ban.test@veggielife.vn',
        role: 'MEMBER',
        isVip: false,
      },
      accessToken: 'member-valid-jwt-token',
      token: 'member-valid-jwt-token',
      isAuthenticated: true,
      sessionStatus: 'ready',
    });
    window.localStorage.setItem('vl_access_token', 'member-valid-jwt-token');
    window.localStorage.setItem('vl_refresh_token', 'refresh-token-active');
    window.localStorage.setItem('vl_user', JSON.stringify({ userId: 300 }));

    // Mock API trả về 403 ERR_AUTH_ACCOUNT_BANNED khi gọi cập nhật hồ sơ
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

    // Tạo Router đầy đủ với AppShell bao ngoài
    const router = createMemoryRouter(
      [
        {
          element: <AppShell />,
          children: [
            {
              path: '/me/profile',
              element: (
                <div className="p-4">
                  <h1>Trang hồ sơ cá nhân</h1>
                  <button
                    type="button"
                    onClick={() => {
                      http.get('/users/me').catch(() => {});
                    }}
                    className="rounded bg-blue-500 px-4 py-2 text-white"
                  >
                    Gửi yêu cầu lưu thông tin
                  </button>
                </div>
              ),
            },
            {
              path: '/auth/login',
              element: <LoginPage />,
            },
          ],
        },
      ],
      { initialEntries: ['/me/profile'] }
    );

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
      >
        <RouterProvider router={router} />
      </QueryClientProvider>
    );

    // Người dùng đang ở trang hồ sơ cá nhân
    expect(screen.getByText('Trang hồ sơ cá nhân')).toBeInTheDocument();

    // Người dùng click thực hiện thao tác
    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu lưu thông tin' }));

    // 1. Modal thông báo tài khoản bị khóa xuất hiện ngay trên giao diện
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Tài khoản đã bị khóa')).toBeInTheDocument();
    expect(within(dialog).getByText(/Tài khoản của bạn đã bị quản trị viên khóa hoặc cấm/)).toBeInTheDocument();

    // 2. Toàn bộ token trong localStorage đã bị dọn sạch
    expect(window.localStorage.getItem('vl_access_token')).toBeNull();
    expect(window.localStorage.getItem('vl_refresh_token')).toBeNull();
    expect(window.localStorage.getItem('vl_user')).toBeNull();

    // 3. Người dùng bấm "Đã hiểu" trên Modal
    const confirmBtn = within(dialog).getByRole('button', { name: 'Đã hiểu' });
    await userEvent.click(confirmBtn);

    // 4. Giao diện lập tức điều hướng về trang /auth/login
    expect(await screen.findByRole('heading', { name: 'Chào mừng trở lại' })).toBeInTheDocument();

    // 5. Trên form đăng nhập xuất hiện khối cảnh báo đỏ thông báo rõ ràng lý do tài khoản bị cấm
    const form = screen.getByRole('button', { name: /^Đăng nhập/ }).closest('form')!;
    const alertBox = within(form).getByRole('alert');
    expect(within(alertBox).getByText(/Tài khoản của bạn đã bị quản trị viên khóa hoặc cấm/)).toBeInTheDocument();
  });

  it('2. Sự kiện Realtime ForceLogout phát từ máy chủ: Giao diện lập tức hiển thị Modal, xóa sạch token và văng về /login', async () => {
    useAuthStore.setState({
      user: {
        userId: 300,
        fullName: 'Lê Đang Lướt Web',
        email: 'le.banned@veggielife.vn',
        role: 'MEMBER',
        isVip: false,
      },
      accessToken: 'active-jwt-token',
      token: 'active-jwt-token',
      isAuthenticated: true,
      sessionStatus: 'ready',
    });
    window.localStorage.setItem('vl_access_token', 'active-jwt-token');

    const router = createMemoryRouter(
      [
        {
          element: <AppShell />,
          children: [
            {
              path: '/community',
              element: (
                <div className="p-4">
                  <h1>Bảng tin cộng đồng VeggieLife</h1>
                </div>
              ),
            },
            {
              path: '/auth/login',
              element: <LoginPage />,
            },
          ],
        },
      ],
      { initialEntries: ['/community'] }
    );

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
      >
        <RouterProvider router={router} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Bảng tin cộng đồng VeggieLife')).toBeInTheDocument();

    // Giả lập sự kiện Realtime ForceLogout nhận được từ SignalR Hub
    handleAccountBanned('Tài khoản của bạn đã bị khóa bởi Quản trị viên. Lý do: Đăng tải nội dung vi phạm tiêu chuẩn');

    // Modal xuất hiện trên màn hình giải thích rõ ràng lý do bị ban
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Tài khoản đã bị khóa')).toBeInTheDocument();
    expect(within(dialog).getByText(/Đăng tải nội dung vi phạm tiêu chuẩn/)).toBeInTheDocument();

    // Đã chuyển hướng về trang /auth/login
    expect(await screen.findByRole('heading', { name: 'Chào mừng trở lại' })).toBeInTheDocument();
    const form = screen.getByRole('button', { name: /^Đăng nhập/ }).closest('form')!;
    const alertBox = within(form).getByRole('alert');
    expect(within(alertBox).getByText(/Đăng tải nội dung vi phạm tiêu chuẩn/)).toBeInTheDocument();

    // Token đã bị xóa
    expect(window.localStorage.getItem('vl_access_token')).toBeNull();
  });

  it('3. Người dùng đã bị cấm cố đăng nhập lại trên form Login: Hiển thị thông báo cấm rõ ràng ngay trên màn hình đăng nhập', async () => {
    mockApi((req) => {
      if (req.url === '/auth/login') {
        return {
          status: 403,
          errorCode: 'ERR_AUTH_ACCOUNT_BANNED',
          message: 'Tài khoản của bạn đã bị đình chỉ hoặc cấm do vi phạm chính sách VeggieLife.',
        };
      }
      return undefined;
    });

    const router = createMemoryRouter(
      [
        {
          path: '/auth/login',
          element: <LoginPage />,
        },
      ],
      { initialEntries: ['/auth/login'] }
    );

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
      >
        <RouterProvider router={router} />
      </QueryClientProvider>
    );

    await userEvent.type(screen.getByLabelText(/Email/), 'banned.member@veggielife.vn');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'Password@123');
    await userEvent.click(screen.getByRole('button', { name: /^Đăng nhập/ }));

    // Cảnh báo xuất hiện trực tiếp trên form
    const form = screen.getByRole('button', { name: /^Đăng nhập/ }).closest('form')!;
    const alertBox = await within(form).findByRole('alert');
    expect(
      within(alertBox).getByText(/Tài khoản của bạn đã bị đình chỉ hoặc cấm do vi phạm chính sách/i)
    ).toBeInTheDocument();

    // Không có token nào được lưu
    expect(window.localStorage.getItem('vl_access_token')).toBeNull();
  });
});
