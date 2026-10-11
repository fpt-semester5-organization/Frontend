import { Link, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { PATHS } from '@/routes/paths';

/** Layout cho SCR-01 … SCR-05 (đăng nhập, đăng ký, OTP, quên/đặt lại mật khẩu). */
export function AuthLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === PATHS.AUTH.LOGIN;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-surface-container-high bg-surface-container-lowest shadow-[0_1px_8px_rgba(43,42,39,0.04)] backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-margin-sm md:px-margin">
          <Logo size={40} tagline="Ẩm thực chay" />
          <nav className="flex items-center gap-space-lg">
            <Link to={PATHS.HOME} className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface">Quay lại trang chủ</Link>
            {isLoginPage ? (
              <Link to={PATHS.AUTH.REGISTER} className="hidden font-label-md text-label-md font-semibold text-primary transition-colors hover:underline sm:block">Đăng ký</Link>
            ) : (
              <Link to={PATHS.AUTH.LOGIN} className="hidden font-label-md text-label-md font-semibold text-primary transition-colors hover:underline sm:block">Đăng nhập</Link>
            )}
          </nav>
        </div>
      </header>
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <footer className="w-full border-t border-surface-container-high bg-transparent py-space-md text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">© 2026 VeggieLife</p>
      </footer>
    </div>
  );
}
