import React from 'react';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useUiStore, type ToastVariant } from '@/stores/ui.store';

const STYLE: Record<ToastVariant, { box: string; icon: string }> = {
  success: { box: 'bg-primary text-on-primary', icon: 'check_circle' },
  info: { box: 'bg-inverse-surface text-inverse-on-surface', icon: 'info' },
  warning: { box: 'bg-secondary text-on-secondary', icon: 'warning' },
  danger: { box: 'bg-error text-on-error', icon: 'error' },
};

/** Toast toàn cục qua react-bootstrap (D102): khối màu đặc ở góc phải dưới. */
export const AppToaster: React.FC = () => {
  const toasts = useUiStore((state) => state.toasts);
  const dismiss = useUiStore((state) => state.dismissToast);

  return (
    <ToastContainer position="bottom-end" containerPosition="fixed" className="z-[1090] p-4" aria-live="polite">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          onClose={() => dismiss(toast.id)}
          // Toast có nút dẫn trang giữ lâu hơn để người dùng kịp bấm.
          delay={toast.action ? 10000 : toast.variant === 'danger' ? 7000 : 4500}
          autohide
          className={cn('rounded-lg border-0 shadow-xl', STYLE[toast.variant].box)}
        >
          <div className="flex items-center gap-3 px-space-md py-3">
            <Icon name={STYLE[toast.variant].icon} className="text-[20px]" />
            <span className="flex-1 font-body-sm text-body-sm">{toast.message}</span>
            {toast.action && (
              <Link
                to={toast.action.to}
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-md bg-white/15 px-2.5 py-1 font-label-md text-label-md text-inherit no-underline hover:bg-white/25"
              >
                {toast.action.label}
              </Link>
            )}
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => dismiss(toast.id)}
              className="flex rounded p-0.5 opacity-80 hover:opacity-100"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        </Toast>
      ))}
    </ToastContainer>
  );
};
