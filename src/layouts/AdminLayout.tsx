import React, { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { PageLoader } from '@/components/common/PageLoader';
import { ServiceBanner } from '@/components/common/ServiceBanner';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_NAV } from '@/config/adminNav';
import { isNavActive } from '@/config/nav';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';

const linkClass = (active: boolean) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 font-label-md text-label-md no-underline transition-colors',
    active ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
  );

const SidebarNav: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Quản trị" className="flex flex-col gap-1">
      <NavLink to={PATHS.ADMIN.DASHBOARD} end onClick={onNavigate} className={({ isActive }) => linkClass(isActive)}>
        <Icon name="space_dashboard" className="text-[20px]" />
        Tổng quan
      </NavLink>
      {ADMIN_NAV.map((item) => {
        const active = isNavActive(item, pathname);
        return (
          <Link key={item.to} to={item.to} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
            <Icon name={item.icon} className="text-[20px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

/**
 * Layout khu Admin (RequireAdmin). ≥ 1024 px: thanh bên cố định; màn hẹp: thanh trên + menu trượt (NFR UI-1, không cuộn ngang).
 */
export const AdminLayout: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const footer = (
    <div className="flex flex-col gap-1 border-t border-surface-container pt-space-sm">
      {user && (
        <p className="truncate px-3 pb-1 font-body-sm text-body-sm text-on-surface-variant" title={user.email}>
          {user.fullName || user.email}
        </p>
      )}
      <Link to={PATHS.HOME} className={linkClass(false)}>
        <Icon name="home" className="text-[20px]" />
        Về trang người dùng
      </Link>
      <button type="button" onClick={() => logout.mutate()} className={cn(linkClass(false), 'w-full text-left text-error hover:text-error')}>
        <Icon name="logout" className="text-[20px]" />
        Đăng xuất
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <a
        href="#admin-content"
        className="sr-only rounded-lg bg-surface-container-lowest px-3 py-2 font-label-md text-label-md text-primary focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60]"
      >
        Bỏ qua tới nội dung chính
      </a>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-space-md border-r border-surface-container bg-surface-container-lowest p-space-md lg:flex">
        <div className="px-2 pt-1">
          <Logo tagline="Quản trị" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        {footer}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-space-sm border-b border-surface-container bg-surface-container-lowest/95 px-margin-mobile py-2 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="rounded bg-primary-fixed px-1.5 py-0.5 font-label-sm text-label-sm text-on-primary-fixed">Quản trị</span>
          </div>
          <button
            type="button"
            aria-label="Mở menu quản trị"
            aria-expanded={menuOpen}
            aria-controls="admin-drawer"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface hover:bg-surface-container"
          >
            <Icon name="menu" className="text-[24px]" />
          </button>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Đóng menu" className="absolute inset-0 h-full w-full bg-black/40" onClick={() => setMenuOpen(false)} />
            <div
              id="admin-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Menu quản trị"
              className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col gap-space-md overflow-y-auto bg-surface-container-lowest p-space-md shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-label-lg text-on-surface">Quản trị</span>
                <button
                  type="button"
                  aria-label="Đóng menu"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-container"
                >
                  <Icon name="close" className="text-[20px]" />
                </button>
              </div>
              <SidebarNav onNavigate={() => setMenuOpen(false)} />
              <div className="mt-auto">{footer}</div>
            </div>
          </div>
        )}

        <ServiceBanner />
        <main id="admin-content" className="mx-auto w-full max-w-[1280px] flex-1 px-margin-mobile py-space-lg sm:px-margin">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
