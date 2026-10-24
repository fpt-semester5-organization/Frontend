import React, { type ReactNode } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { isMissingEndpoint } from '../lib/endpoint';
import { TONE_CLASS, type Tone } from '../lib/labels';

/** Khung thẻ trắng dùng chung của các màn Admin. */
export const CARD = 'rounded-2xl border border-surface-container bg-surface-container-lowest shadow-card';

/** Ô lọc/nhập (select, textarea) cùng kiểu INPUT_CLASS nhưng nền trắng trên thẻ. */
export const CONTROL =
  'w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary';

export const AdminPageHeader: React.FC<{ title: string; description?: ReactNode; actions?: ReactNode }> = ({
  title,
  description,
  actions,
}) => (
  <header className="flex flex-wrap items-end justify-between gap-space-md">
    <div className="flex min-w-0 flex-col gap-1">
      <h1 className="font-headline-md text-headline-md text-on-surface sm:text-headline-lg">{title}</h1>
      {description && <p className="max-w-3xl font-body-md text-body-md text-on-surface-variant">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-space-sm">{actions}</div>}
  </header>
);

export const StatusBadge: React.FC<{ tone: Tone; icon?: string; children: ReactNode; className?: string }> = ({
  tone,
  icon,
  children,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 font-label-sm text-label-sm',
      TONE_CLASS[tone],
      className
    )}
  >
    {icon && <Icon name={icon} className="text-[14px]" />}
    {children}
  </span>
);

/**
 * Bảng dữ liệu: cuộn ngang trong khung riêng khi màn hẹp (trang không cuộn ngang — NFR UI-1).
 * `relative` để chữ ẩn `sr-only` (position: absolute) trong bảng nằm trong khung cuộn; thiếu nó, chữ ẩn ở cột cuối
 * lấy khối chứa là cả trang và nới trang rộng ra (đo được 811 px ở màn 360 px).
 * `busy` = đang tải trang/bộ lọc mới, giữ dữ liệu cũ ở độ mờ thấp thay vì nháy skeleton.
 */
export const TableShell: React.FC<{ children: ReactNode; busy?: boolean; label: string; minWidth?: string }> = ({
  children,
  busy,
  label,
  minWidth = 'min-w-[640px]',
}) => (
  <div
    role="region"
    aria-label={label}
    tabIndex={0}
    className={cn(CARD, 'relative overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary', busy && 'opacity-60 transition-opacity')}
    aria-busy={busy || undefined}
  >
    <table className={cn('w-full border-collapse text-left font-body-sm text-body-sm', minWidth)}>{children}</table>
  </div>
);

export const TH = 'whitespace-nowrap border-b border-surface-container px-4 py-3 font-label-md text-label-md text-on-surface-variant';
export const TD = 'border-b border-surface-container px-4 py-3 align-middle text-on-surface';

export const TableSkeleton: React.FC<{ rows?: number; label?: string }> = ({ rows = 5, label = 'Đang tải dữ liệu' }) => (
  <div role="status" aria-busy="true" aria-label={label} className={cn(CARD, 'flex flex-col gap-3 p-4')}>
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="flex items-center gap-4">
        <div className="h-4 w-1/4 animate-pulse rounded bg-surface-container" />
        <div className="h-4 flex-1 animate-pulse rounded bg-surface-container" />
        <div className="h-4 w-20 animate-pulse rounded bg-surface-container" />
      </div>
    ))}
  </div>
);

/** Lỗi tải dữ liệu; Backend chưa có route thì nói rõ thay vì "Không tìm thấy". */
export const AdminQueryError: React.FC<{ error: unknown; onRetry?: () => void; retrying?: boolean }> = ({
  error,
  onRetry,
  retrying,
}) =>
  isMissingEndpoint(error) ? (
    <div className={CARD}>
      <EmptyState
        icon="construction"
        title="Máy chủ chưa hỗ trợ chức năng này"
        description="API của màn hình này chưa được triển khai ở Backend. Trang sẽ hoạt động ngay khi API sẵn sàng."
        action={
          onRetry ? (
            <Button variant="outline" onClick={onRetry} loading={retrying}>
              Thử lại
            </Button>
          ) : undefined
        }
      />
    </div>
  ) : (
    <div className={CARD}>
      <ErrorState error={error} onRetry={onRetry} retrying={retrying} />
    </div>
  );

/**
 * 409/422: hộp thoại giải thích với message của server (UI Spec 1.1); không xóa dữ liệu đã nhập.
 * `message = null` là đóng.
 */
export const ServerMessageDialog: React.FC<{ title?: string; message: string | null; onClose: () => void }> = ({
  title = 'Không thực hiện được',
  message,
  onClose,
}) => (
  <Modal show={message !== null} onHide={onClose} title={title} size="sm">
    <div className="flex flex-col gap-5 p-space-lg">
      <p className="font-body-md text-body-md text-on-surface-variant">{message}</p>
      <div className="flex justify-end">
        <Button onClick={onClose}>Đã hiểu</Button>
      </div>
    </div>
  </Modal>
);

/** Dòng thống kê nhỏ trong thẻ (nhãn trái, giá trị phải). */
export const StatRow: React.FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-3 border-b border-surface-container py-2 last:border-b-0">
    <dt className="text-on-surface-variant">{label}</dt>
    <dd className="text-right font-medium text-on-surface">{children}</dd>
  </div>
);
