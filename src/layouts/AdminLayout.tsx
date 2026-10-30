import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { PageLoader } from '@/components/common/PageLoader';
import { Logo } from '@/components/common/Logo';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { ADMIN_NAV, isNavActive } from '@/config/nav';
import { ServiceBanner } from '@/components/common/ServiceBanner';
import { PATHS } from '@/routes/paths';
import { CommandPalette } from '@/components/common/CommandPalette';
import { toast } from '@/stores/ui.store';
import { apiErrorCode, apiErrorMessage, apiErrorStatus, http } from '@/api/http';
import { endSession, handleAccountBanned } from '@/api/session';
import { logout as logoutSession } from '@/features/auth/api/auth.api';
import { useAiMetrics } from '@/features/admin/hooks/useSystem';
import { useModerationQueue } from '@/features/admin/hooks/useModeration';
import { circuitView } from '@/features/admin/lib/circuit';
import { useIdleLogout } from '@/hooks/useIdleLogout';
import { useAuthStore } from '@/stores/auth.store';

// Bảng chọn vai trò giả lập chỉ có khi chạy dữ liệu giả (VITE_ENABLE_MOCKS=true), không vào bản build.
const MockSessionPanel =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true'
    ? lazy(() => import('@/mocks/MockSessionPanel'))
    : null;

function SidebarBody({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const { pathname } = useLocation();
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-col">
        <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'px-gutter'}`}>
          <Logo to={PATHS.ADMIN.ROOT} onClick={onNavigate} size={36} tagline="Quản trị" markOnly={collapsed} />
        </div>
        <nav className="flex flex-col gap-1 px-space-sm" aria-label="Điều hướng quản trị">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              title={collapsed ? item.label : undefined}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={`flex items-center gap-space-sm rounded-lg py-2 font-label-md no-underline ${
                collapsed ? 'justify-center px-0' : 'px-space-sm'
              } text-label-md transition-all ${
                isNavActive(item, pathname)
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

/** Layout quản trị: sidebar + header; dưới `lg` sidebar thu vào Offcanvas. */
export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [cmd, setCmd] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('vl_admin_sb') === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('vl_admin_sb', c ? '0' : '1');
      } catch {
        /* bỏ qua */
      }
      return !c;
    });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmd(true);
      }
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /** Đăng xuất chủ động: thu hồi Refresh Token ở server (FN-AUTH-10), dọn phiên + cache, về trang đăng nhập. */
  const signOut = useCallback(
    async (notice?: string) => {
      await logoutSession();
      if (notice) toast.warning(notice);
      navigate(PATHS.AUTH.LOGIN, { replace: true });
    },
    [navigate],
  );

  // BR-ADM-SYS-003, SEC-13, UI-9: Admin tự đăng xuất sau đúng 30 phút không thao tác.
  useIdleLogout(
    useCallback(
      () => void signOut('Phiên quản trị đã hết hạn sau 30 phút không thao tác. Vui lòng đăng nhập lại.'),
      [signOut],
    ),
    30,
  );

  // Xử lý phản hồi 403 riêng cho Admin:
  // 403 ERR_ADM_FORBIDDEN: toast cảnh báo theo spec (không đổi trang).
  // 403 ERR_AUTH_ACCOUNT_BANNED đã được interceptor toàn cục tại src/api/http.ts xử lý tự động.
  useEffect(() => {
    const id = http.interceptors.response.use(undefined, (error) => {
      const status = apiErrorStatus(error);
      const code = apiErrorCode(error);
      if (status === 403 && code === 'ERR_ADM_FORBIDDEN') toast.warning(apiErrorMessage(error));
      if (status === 403 && code === 'ERR_AUTH_ACCOUNT_BANNED') {
        handleAccountBanned(apiErrorMessage(error));
      }
      return Promise.reject(error);
    });
    return () => http.interceptors.response.eject(id);
  }, []);

  const ai = useAiMetrics({});
  const circuit = circuitView(ai.data?.circuit?.state);
  const queue = useModerationQueue({ page: 1, size: 1 });
  const queueTotal = queue.data?.meta.total ?? 0;

  return (
    <div className="admin-ui min-h-screen bg-background">
      <aside
        className={`fixed left-0 top-0 z-50 hidden h-full ${
          collapsed ? 'w-16' : 'w-60'
        } bg-surface-container-low shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-[width] duration-200 lg:block`}
      >
        <SidebarBody collapsed={collapsed} />
      </aside>
      <Offcanvas show={open} onHide={() => setOpen(false)} className="!bg-surface-container-low" style={{ width: 240 }}>
        <Offcanvas.Body className="!p-0">
          <SidebarBody onNavigate={() => setOpen(false)} />
        </Offcanvas.Body>
      </Offcanvas>

      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-60'}`}>
        <header
          className={`fixed inset-x-0 top-0 z-40 h-16 bg-surface-bright/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md transition-[left] duration-200 ${
            collapsed ? 'lg:left-16' : 'lg:left-60'
          }`}
        >
          <div className="flex h-16 w-full items-center justify-between gap-space-md px-gutter">
            <div className="flex flex-1 items-center gap-space-sm md:max-w-md">
              <button
                type="button"
                aria-label="Mở menu quản trị"
                onClick={() => setOpen(true)}
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container lg:hidden"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                title="Ctrl+B"
                className="hidden rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container lg:block"
              >
                <span className="material-symbols-outlined">{collapsed ? 'left_panel_open' : 'left_panel_close'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCmd(true)}
                className="flex w-full items-center gap-2 rounded-lg bg-surface-container-lowest px-3 py-2 text-left font-body-sm text-body-sm text-outline shadow-[0_1px_3px_rgba(43,42,39,0.04)] hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span className="flex-1">Tìm trang</span>
                <kbd className="hidden rounded bg-surface-container px-1.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant md:inline">
                  Ctrl K
                </kbd>
              </button>
            </div>
            <div className="flex items-center gap-gutter">
              <Link
                to={PATHS.ADMIN.AI}
                className="hidden items-center gap-2 rounded-lg bg-surface-container-high px-space-sm py-1 text-primary-container no-underline md:flex"
                title="Trạng thái Circuit Breaker AI (BR-ADM-AI-002)"
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    circuit.tone === 'ok' ? 'text-surface-tint' : circuit.tone === 'bad' ? 'text-error' : 'text-outline'
                  }`}
                >
                  smart_toy
                </span>
                <span className="font-label-sm text-label-sm text-on-surface">
                  {ai.isLoading ? 'Đang kiểm tra AI…' : ai.isError ? 'Chưa rõ trạng thái AI' : circuit.text}
                </span>
              </Link>
              <Link
                to={PATHS.ADMIN.MODERATION}
                className="relative rounded-lg p-2 text-on-surface-variant no-underline transition-colors hover:bg-surface-container hover:text-on-surface"
                aria-label="Hàng đợi kiểm duyệt"
              >
                <span className="material-symbols-outlined text-[22px]">fact_check</span>
                {queueTotal > 0 && (
                  <span
                    aria-label={`${queueTotal} mục chờ kiểm duyệt`}
                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-secondary"
                  />
                )}
              </Link>
              <div className="flex items-center gap-space-sm border-l border-outline-variant/30 pl-2">
                <div className="hidden flex-col text-right sm:flex">
                  <span className="font-label-md text-label-md text-on-surface">{user?.fullName ?? 'Quản trị viên'}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">ADMIN</span>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>
        <ServiceBanner />
        <main className="p-space-lg">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <CommandPalette show={cmd} onHide={() => setCmd(false)} />
      {MockSessionPanel && (
        <Suspense fallback={null}>
          <MockSessionPanel />
        </Suspense>
      )}
    </div>
  );
}
