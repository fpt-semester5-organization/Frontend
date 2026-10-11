import React from 'react';
import Toast from 'react-bootstrap/Toast';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUiStore, type ToastVariant } from '@/stores/ui.store';

const variantStyle: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-brand-700' },
  info: { icon: Info, className: 'text-sky-700' },
  warning: { icon: AlertTriangle, className: 'text-amber-700' },
  danger: { icon: XCircle, className: 'text-red-700' },
};

/**
 * Toast qua react-bootstrap (D102). Vị trí đặt bằng Tailwind vì ToastContainer của
 * react-bootstrap dùng class tiện ích Bootstrap (top-0, position-fixed) không được nạp.
 */
export const AppToaster: React.FC = () => {
  const toasts = useUiStore((state) => state.toasts);
  const dismiss = useUiStore((state) => state.dismissToast);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-4 left-4 z-[1090] flex flex-col items-end gap-2 sm:left-auto"
    >
      {toasts.map((toast) => {
        const { icon: Icon, className } = variantStyle[toast.variant];
        return (
          <Toast
            key={toast.id}
            onClose={() => dismiss(toast.id)}
            delay={toast.variant === 'danger' ? 7000 : 4500}
            autohide
            className="pointer-events-auto w-full sm:w-[360px]"
          >
            <Toast.Body className="flex items-start gap-3">
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', className)} aria-hidden="true" />
              <span className="flex-1 text-sm text-gray-800">{toast.message}</span>
              <button
                type="button"
                className="btn-close shrink-0"
                aria-label="Đóng thông báo"
                onClick={() => dismiss(toast.id)}
              />
            </Toast.Body>
          </Toast>
        );
      })}
    </div>
  );
};
