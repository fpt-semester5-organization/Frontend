import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundPage } from '@/app/NotFoundPage';
import { RouteErrorPage } from '@/app/RouteErrorPage';
import { RequireAdmin } from '@/routes/guards';
import { useAuthStore } from '@/stores/auth.store';

// Header/footer thật gọi API và store khác; ở đây chỉ cần biết trang trạng thái nằm trong layout chung.
vi.mock('@/layouts/MainLayout', () => ({
  MainLayout: ({ children }: { children?: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

describe('Trang 404 / 403 / lỗi route', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useAuthStore.setState({ user: null, isAuthenticated: false, sessionStatus: 'ready' });
  });

  it('404 có tiêu đề và lối về trang chủ', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/');
  });

  it('Thành viên mở /admin thấy trang 403 trong layout chung thay vì bị chuyển trang', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { userId: 1, email: 'm@example.com', fullName: 'Thành viên', role: 'MEMBER' } as never,
    });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<RequireAdmin />}>
            <Route index element={<p>Bảng quản trị</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument();
    expect(screen.queryByText('Bảng quản trị')).not.toBeInTheDocument();
  });

  it('Khách mở /admin được chuyển tới đăng nhập kèm returnUrl', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<RequireAdmin />}>
            <Route index element={<p>Bảng quản trị</p>} />
          </Route>
          <Route path="/auth/login" element={<p>Trang đăng nhập</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument();
  });

  it('lỗi render trong trang hiện màn lỗi thân thiện, không hiện màn lỗi mặc định của React Router', async () => {
    const Broken = () => {
      throw new Error('Cannot read properties of undefined (reading "map")');
    };
    const router = createMemoryRouter(
      [{ path: '/', element: <Broken />, errorElement: <RouteErrorPage withLayout /> }],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Đã có lỗi xảy ra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải lại trang' })).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Application Error/i)).not.toBeInTheDocument();
  });
});
