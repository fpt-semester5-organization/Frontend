import React, { Suspense, lazy, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { ServiceBanner } from '@/components/common/ServiceBanner';
import { PATHS } from '@/routes/paths';
import { LegalDocumentsModal } from '@/features/legal/components/LegalDocumentsModal';
import type { LegalDocType } from '@/features/legal/types/legal.types';

// Bảng chọn vai trò giả lập chỉ có khi chạy dữ liệu giả (VITE_ENABLE_MOCKS=true), không vào bản build.
const MockSessionPanel =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true'
    ? lazy(() => import('@/mocks/MockSessionPanel'))
    : null;

/** Layout cho SCR-01 … SCR-05 (đăng nhập, đăng ký, OTP, quên/đặt lại mật khẩu). */
export function AuthLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === PATHS.AUTH.LOGIN;
  const [previewDoc, setPreviewDoc] = useState<LegalDocType | null>(null);

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
      {/* Header cố định: banner 503 đặt ngay dưới header. */}
      <div className="fixed inset-x-0 top-[72px] z-40">
        <ServiceBanner />
      </div>
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <footer className="w-full border-t border-surface-container-high bg-transparent py-space-md text-center">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-3 px-gutter font-body-sm text-body-sm text-on-surface-variant">
          <p>© 2026 VeggieLife</p>
          <span>•</span>
          <Link
            to={PATHS.TERMS}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPreviewDoc('TERMS');
            }}
            className="cursor-pointer transition-colors hover:text-primary hover:underline"
            title="Điều khoản sử dụng"
          >
            Điều khoản
          </Link>
          <span>•</span>
          <Link
            to={PATHS.PRIVACY}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPreviewDoc('PRIVACY');
            }}
            className="cursor-pointer transition-colors hover:text-primary hover:underline"
            title="Chính sách bảo mật"
          >
            Chính sách bảo mật
          </Link>
        </div>
      </footer>
      {previewDoc && (
        <LegalDocumentsModal
          show={true}
          onHide={() => setPreviewDoc(null)}
          initialDoc={previewDoc}
        />
      )}
      {MockSessionPanel && (
        <Suspense fallback={null}>
          <MockSessionPanel />
        </Suspense>
      )}
    </div>
  );
}
