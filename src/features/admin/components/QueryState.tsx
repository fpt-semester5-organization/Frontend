import type { ReactNode } from 'react';
import { apiErrorMessage } from '@/api/http';

/** Bốn trạng thái của một khối dữ liệu: đang tải (skeleton) · lỗi (thử lại) · rỗng · có dữ liệu. */
export function QueryState({
  isLoading,
  isError,
  error,
  refetch,
  isEmpty,
  emptyTitle = 'Chưa có dữ liệu',
  emptyHint = 'Chưa có bản ghi nào khớp bộ lọc hiện tại.',
  rows = 5,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => unknown;
  isEmpty: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  rows?: number;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-3 p-space-lg" role="status" aria-busy="true" aria-label="Đang tải">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-12 rounded-lg bg-surface-container" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-space-xl text-center" role="alert">
        <span className="material-symbols-outlined text-[40px] text-outline">cloud_off</span>
        <p className="font-body-md text-body-md text-on-surface-variant">{apiErrorMessage(error, 'Không tải được dữ liệu. Vui lòng thử lại.')}</p>
        <button type="button" onClick={() => void refetch()} className="rounded-lg bg-primary-container px-5 py-2 font-label-md text-label-md text-on-primary hover:bg-primary">
          Thử lại
        </button>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-2 p-space-xl text-center" role="status">
        <span className="material-symbols-outlined text-[40px] text-outline">inbox</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">{emptyTitle}</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{emptyHint}</p>
      </div>
    );
  }
  return <>{children}</>;
}
