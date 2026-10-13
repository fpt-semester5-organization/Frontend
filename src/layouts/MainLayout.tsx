import React, { Suspense, lazy } from 'react';
import { Outlet } from 'react-router-dom';
import { MainFooter } from '@/components/common/MainFooter';
import { MainHeader } from '@/components/common/MainHeader';
import { PageLoader } from '@/components/common/PageLoader';

// Bảng chọn vai trò giả lập chỉ có khi chạy dữ liệu giả (VITE_ENABLE_MOCKS=true), không vào bản build.
const MockSessionPanel =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true'
    ? lazy(() => import('@/mocks/MockSessionPanel'))
    : null;

/** Layout cho Khách / Thành viên / VIP: header 72px + nội dung (mỗi trang tự đặt khung) + footer. */
export const MainLayout: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <a
      href="#main-content"
      className="sr-only rounded-lg bg-surface-container-lowest px-3 py-2 font-label-md text-label-md text-primary focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60]"
    >
      Bỏ qua tới nội dung chính
    </a>
    <MainHeader />
    <main id="main-content" className="w-full flex-1">
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </main>
    <MainFooter />
    {MockSessionPanel && (
      <Suspense fallback={null}>
        <MockSessionPanel />
      </Suspense>
    )}
  </div>
);
