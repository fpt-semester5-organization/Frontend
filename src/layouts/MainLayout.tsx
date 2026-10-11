import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import { useAuthStore } from '../stores/auth.store';
import { toast } from '../stores/ui.store';

export const MainLayout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info('Đã đăng xuất tài khoản.');
    navigate(PATHS.HOME);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={PATHS.HOME} className="flex items-center gap-2 text-xl font-bold text-[#133e2e]">
            <span>🥗</span>
            <span>VeggieLife</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to={PATHS.HOME} className="text-gray-600 hover:text-[#133e2e]">
              Trang chủ
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  {user?.fullName || user?.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <>
                <Link to={PATHS.AUTH.LOGIN} className="text-gray-600 hover:text-[#133e2e]">
                  Đăng nhập
                </Link>
                <Link
                  to={PATHS.AUTH.REGISTER}
                  className="bg-[#133e2e] text-white px-3 py-1.5 rounded-lg hover:bg-[#1b553f] transition"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © 2026 VeggieLife — Sống xanh, An lành
      </footer>
    </div>
  );
};
