import React, { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { ForbiddenPage } from '@/app/ForbiddenPage';
import { NotFoundPage } from '@/app/NotFoundPage';
import { MainLayout } from '@/layouts/MainLayout';

/**
 * Màn lỗi khi trang gặp sự cố ngoài ý muốn (lỗi render, không tải được phần mã của trang…).
 * Không dùng Link vì có thể nằm ngoài router. Chỉ khi chạy dev mới hiện chi tiết kỹ thuật để lập trình viên sửa (UI-4).
 */
export const AppErrorFallback: React.FC<{ error?: unknown }> = ({ error }) => {
  const detail = error instanceof Error ? error.message : error ? String(error) : '';

  return (
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-space-2xl text-center">
      <Icon name="sentiment_dissatisfied" className="text-[56px] text-outline" />
      <h1 className="font-headline-lg text-headline-lg-mobile text-primary sm:text-headline-lg">Đã có lỗi xảy ra</h1>
      <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
        Trang gặp sự cố ngoài ý muốn. Bạn hãy tải lại trang hoặc quay về trang chủ.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-space-sm">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary hover:bg-primary"
        >
          Tải lại trang
        </button>
        <a
          href="/"
          className="rounded-lg bg-surface-container px-5 py-2.5 font-label-md text-label-md text-on-surface no-underline hover:bg-surface-container-high"
        >
          Về trang chủ
        </a>
      </div>
      {import.meta.env.DEV && detail && (
        <details className="mt-space-md w-full max-w-xl text-left">
          <summary className="cursor-pointer font-label-sm text-label-sm text-on-surface-variant">Chi tiết cho lập trình viên (chỉ hiện khi chạy dev)</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface-container-low p-3 font-label-sm text-label-sm text-on-surface-variant">
            {detail}
          </pre>
        </details>
      )}
    </div>
  );
};

/**
 * errorElement của router: thay màn lỗi mặc định của React Router (có stack trace) bằng trang thân thiện.
 * `withLayout`: hiện trong khung MainLayout (giữ header/footer); nếu chính layout lỗi, router chuyển lên errorElement cấp trên.
 */
export const RouteErrorPage: React.FC<{ withLayout?: boolean }> = ({ withLayout = false }) => {
  const error = useRouteError();

  useEffect(() => {
    console.error('[RouteError]', error);
  }, [error]);

  let content = <AppErrorFallback error={error} />;
  if (isRouteErrorResponse(error) && error.status === 404) content = <NotFoundPage />;
  if (isRouteErrorResponse(error) && error.status === 403) content = <ForbiddenPage />;
  return withLayout ? <MainLayout>{content}</MainLayout> : content;
};
