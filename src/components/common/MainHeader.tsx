import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Dropdown from 'react-bootstrap/Dropdown';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { Icon } from '@/components/ui/Icon';
import { ACCOUNT_NAV, MAIN_NAV, isNavActive } from '@/config/nav';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { cn } from '@/lib/cn';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { Logo } from './Logo';

const menuItemClass =
  'flex items-center gap-space-sm rounded-lg px-space-sm py-2 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface';

/** Header dùng chung cho Khách / Thành viên / VIP (MainLayout), cao 72px, dính đầu trang. */
export const MainHeader: React.FC = () => {
  const { user, sessionStatus } = useAuthStore();
  const logout = useLogout();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const returnUrl = `${location.pathname}${location.search}`;

  return (
    <header className="sticky top-0 z-50 bg-surface-container-lowest/95 shadow-header backdrop-blur-md">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between gap-space-md px-margin-sm lg:px-margin">
        <div className="flex shrink-0 items-center gap-space-sm">
          <button
            type="button"
            aria-label="Mở menu"
            onClick={() => setMenuOpen(true)}
            className="flex rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container xl:hidden"
          >
            <Icon name="menu" />
          </button>
          <Logo tagline="Ẩm thực chay" />
        </div>

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-space-xs xl:flex">
          {MAIN_NAV.filter((item) => !item.mobileOnly).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                'whitespace-nowrap rounded-lg px-space-sm py-1.5 font-body-sm text-body-sm no-underline transition-colors',
                isNavActive(item, location.pathname)
                  ? 'bg-primary-container font-semibold text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              )}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-space-sm">
          {sessionStatus === 'restoring' ? null : user ? (
            <>
              <Link
                to={PATHS.RECIPES.NEW}
                title="Đăng công thức"
                aria-label="Đăng công thức"
                className="hidden items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 font-label-md text-label-md text-on-secondary no-underline shadow-sm transition-all hover:bg-on-secondary-fixed-variant sm:flex 2xl:px-space-md"
              >
                <Icon name="add" className="text-[16px]" />
                <span className="hidden 2xl:inline">Đăng công thức</span>
              </Link>
              <Dropdown align="end">
                <Dropdown.Toggle
                  as="button"
                  type="button"
                  aria-label="Tài khoản"
                  className="flex items-center gap-space-xs rounded-lg p-1 hover:bg-surface-container"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-sm">
                    <Icon name="person" className="text-[18px] text-on-primary" />
                  </span>
                  {user.isVip && (
                    <span className="rounded bg-secondary-fixed px-1.5 py-0.5 font-label-sm text-label-sm text-on-secondary-fixed">
                      VIP
                    </span>
                  )}
                </Dropdown.Toggle>
                <Dropdown.Menu className="min-w-[240px] rounded-xl border-0 bg-surface-container-lowest p-space-sm shadow-xl">
                  <div className="px-space-sm pb-space-sm">
                    <p className="font-label-md text-label-md text-on-surface">{user.fullName}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{user.email}</p>
                  </div>
                  {ACCOUNT_NAV.map((item) => (
                    <Dropdown.Item key={item.to} as={Link} to={item.to} className={menuItemClass}>
                      {item.icon && <Icon name={item.icon} className="text-[18px]" />}
                      {item.label}
                    </Dropdown.Item>
                  ))}
                  <Dropdown.Divider />
                  <Dropdown.Item as="button" onClick={logout} className={cn(menuItemClass, 'w-full text-error hover:text-error')}>
                    <Icon name="logout" className="text-[18px]" />
                    Đăng xuất
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </>
          ) : (
            <>
              <Link
                to={withReturnUrl(PATHS.AUTH.LOGIN, returnUrl)}
                className="rounded-lg px-3 py-2 font-label-md text-label-md text-on-surface-variant no-underline hover:bg-surface-container hover:text-on-surface"
              >
                Đăng nhập
              </Link>
              <Link
                to={withReturnUrl(PATHS.AUTH.REGISTER, returnUrl)}
                className="rounded-lg bg-primary-container px-space-md py-2 font-label-md text-label-md text-on-primary no-underline shadow-sm hover:bg-primary"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>

      <Offcanvas show={menuOpen} onHide={() => setMenuOpen(false)} placement="start" style={{ width: 300 }}>
        <Offcanvas.Header closeButton closeLabel="Đóng menu">
          <Offcanvas.Title as="span">
            <Logo tagline="Ẩm thực chay" />
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <nav aria-label="Điều hướng di động" className="flex flex-col gap-1">
            {MAIN_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'rounded-lg px-space-md py-2.5 font-body-md text-body-md no-underline',
                  isNavActive(item, location.pathname)
                    ? 'bg-primary-container font-semibold text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container'
                )}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </Offcanvas.Body>
      </Offcanvas>
    </header>
  );
};
