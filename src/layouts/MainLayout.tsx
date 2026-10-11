import React, { Suspense, lazy } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Leaf, LogOut } from 'lucide-react';
import { PageLoader } from '@/components/common/PageLoader';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { cn } from '@/lib/cn';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';

// Bảng chọn vai trò giả lập chỉ có khi chạy dữ liệu giả (VITE_ENABLE_MOCKS=true), không vào bản build.
const MockSessionPanel =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true'
    ? lazy(() => import('@/mocks/MockSessionPanel'))
    : null;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors',
    isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
  );

export const MainLayout: React.FC = () => {
  const { user, sessionStatus } = useAuthStore();
  const logout = useLogout();
  const location = useLocation();
  const returnUrl = `${location.pathname}${location.search}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Bỏ qua tới nội dung chính
      </a>
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to={PATHS.HOME} className="flex items-center gap-2 text-lg font-bold text-brand-700 no-underline">
            <Leaf className="h-6 w-6" aria-hidden="true" />
            VeggieLife
          </Link>
          <nav aria-label="Điều hướng chính" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            <NavLink to={PATHS.HOME} end className={navLinkClass}>
              Trang chủ
            </NavLink>
            <NavLink to={PATHS.COMMUNITY.ROOT} className={navLinkClass}>
              Cộng đồng
            </NavLink>
            {user && (
              <NavLink to={PATHS.ME.POSTS} className={navLinkClass}>
                Bài viết của tôi
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {sessionStatus === 'restoring' ? null : user ? (
              <>
                <span className="hidden max-w-[12rem] truncate text-sm text-gray-700 sm:inline">
                  {user.fullName}
                  {user.isVip && (
                    <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                      VIP
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to={withReturnUrl(PATHS.AUTH.LOGIN, returnUrl)}
                  className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-gray-700 no-underline hover:bg-gray-100"
                >
                  Đăng nhập
                </Link>
                <Link
                  to={withReturnUrl(PATHS.AUTH.REGISTER, returnUrl)}
                  className="inline-flex h-9 items-center rounded-md bg-brand-600 px-3 text-sm font-medium text-white no-underline hover:bg-brand-700"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-gray-500">
          SWP391 — VeggieLife © 2026
        </div>
      </footer>

      {MockSessionPanel && (
        <Suspense fallback={null}>
          <MockSessionPanel />
        </Suspense>
      )}
    </div>
  );
};
