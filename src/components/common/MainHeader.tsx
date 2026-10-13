import { useState } from 'react';
import { Logo } from '@/components/common/Logo';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Dropdown from 'react-bootstrap/Dropdown';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { logout as logoutSession } from '@/features/auth/api/auth.api';
import { ACCOUNT_NAV, MAIN_NAV, isNavActive } from '@/config/nav';
import { PATHS } from '@/routes/paths';
import { selectIsAdmin, selectIsAuthenticated, selectIsVip, useAuthStore } from '@/stores/auth.store';
import { GuestQuotaBadge } from './GuestQuotaBadge';
import { MemberOnly } from './MemberOnly';

/** Header dùng chung cho Khách / Thành viên / VIP (MainLayout). */
export function MainHeader() {
  const user = useAuthStore((s) => s.user);
  const authed = useAuthStore(selectIsAuthenticated);
  const isVip = useAuthStore(selectIsVip);
  const isAdmin = useAuthStore(selectIsAdmin);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const doLogout = () => {
    void logoutSession().then(() => navigate(PATHS.HOME)); // FN-AUTH-10: gọi API trước rồi xóa phiên
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface-container-lowest/95 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between gap-space-md px-margin-sm lg:px-margin">
        <div className="flex shrink-0 items-center gap-space-sm">
          <button type="button" aria-label="Mở menu" onClick={() => setMenuOpen(true)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container xl:hidden">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Logo tagline="Ẩm thực chay" />
        </div>

        <nav className="hidden items-center gap-space-xs xl:flex" aria-label="Điều hướng chính">
          {MAIN_NAV.filter((i) => !i.mobileOnly).map((item) => {
            const active = isNavActive(item, pathname);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`whitespace-nowrap rounded-lg px-space-sm py-1.5 font-body-sm text-body-sm transition-colors ${
                  active ? 'bg-primary-container font-semibold text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-space-sm">
          {!authed && <GuestQuotaBadge className="hidden md:inline-flex" />}
          <MemberOnly>
            <Link to={PATHS.RECIPES.NEW} title="Đăng công thức" aria-label="Đăng công thức" className="hidden items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 2xl:px-space-md font-label-md text-label-md text-on-secondary shadow-sm transition-all hover:bg-on-secondary-container sm:flex">
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span className="hidden 2xl:inline">Đăng Công Thức</span>
            </Link>
          </MemberOnly>
          {authed && user ? (
            <Dropdown align="end">
              <Dropdown.Toggle as="button" type="button" className="flex items-center gap-space-xs rounded-lg p-1 hover:bg-surface-container" aria-label="Tài khoản">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-sm">
                  <span className="material-symbols-outlined text-[18px] text-on-primary">person</span>
                </span>
                {isVip && <span className="rounded bg-secondary-fixed px-1.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-secondary-fixed">VIP</span>}
              </Dropdown.Toggle>
              <Dropdown.Menu className="!min-w-[240px] !rounded-xl !border-0 !bg-surface-container-lowest !p-space-sm shadow-xl">
                <div className="px-space-sm pb-space-sm">
                  <p className="font-label-md text-label-md text-on-surface">{user.fullName}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{user.email}</p>
                </div>
                {ACCOUNT_NAV.map((item) => (
                  <Dropdown.Item key={item.to} as={Link} to={item.to} className="!flex !items-center !gap-space-sm !rounded-lg !px-space-sm !py-2 font-body-sm text-body-sm text-on-surface-variant hover:!bg-surface-container">
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    {item.label}
                  </Dropdown.Item>
                ))}
                {isAdmin && (
                  <Dropdown.Item as={Link} to={PATHS.ADMIN.ROOT} className="!flex !items-center !gap-space-sm !rounded-lg !px-space-sm !py-2 font-body-sm text-body-sm text-secondary">
                    <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                    Trang quản trị
                  </Dropdown.Item>
                )}
                <Dropdown.Divider />
                <Dropdown.Item as="button" onClick={doLogout} className="!flex !items-center !gap-space-sm !rounded-lg !px-space-sm !py-2 font-body-sm text-body-sm text-error">
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Đăng xuất
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <>
              <Link to={PATHS.AUTH.LOGIN} className="rounded-lg px-3 py-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface">Đăng nhập</Link>
              <Link to={PATHS.AUTH.REGISTER} className="rounded-lg bg-primary-container px-space-md py-2 font-label-md text-label-md text-on-primary shadow-sm hover:bg-primary">Đăng ký</Link>
            </>
          )}
        </div>
      </div>

      <Offcanvas show={menuOpen} onHide={() => setMenuOpen(false)} placement="start" className="!bg-surface-container-low" style={{ width: 300 }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="font-headline-sm text-headline-sm text-primary">VeggieLife</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <nav className="flex flex-col gap-1" aria-label="Điều hướng di động">
            {MAIN_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-space-md py-2.5 font-body-md text-body-md ${isNavActive(item, pathname) ? 'bg-primary-container font-semibold text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </Offcanvas.Body>
      </Offcanvas>
    </header>
  );
}
