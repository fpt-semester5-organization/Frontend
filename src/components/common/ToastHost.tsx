import BsToast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import { useUiStore, type ToastKind } from '@/stores/ui.store';

const STYLE: Record<ToastKind, { box: string; icon: string }> = {
  success: { box: 'bg-primary text-on-primary', icon: 'check_circle' },
  error: { box: 'bg-error text-on-error', icon: 'error' },
  warning: { box: 'bg-secondary text-on-secondary', icon: 'warning' },
  info: { box: 'bg-inverse-surface text-inverse-on-surface', icon: 'info' },
};

/** Toast toàn cục (react-bootstrap Toast — D102). Gọi bằng `toast.success('...')` từ `@/stores/ui.store`. */
export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <ToastContainer position="bottom-end" className="p-4" style={{ zIndex: 1090, position: 'fixed' }}>
      {toasts.map((t) => (
        <BsToast
          key={t.id}
          onClose={() => dismiss(t.id)}
          className={`!border-0 !rounded-lg shadow-xl ${STYLE[t.kind].box}`}
        >
          <div className="flex items-center gap-3 px-space-md py-3">
            <span className="material-symbols-outlined text-[20px]">{STYLE[t.kind].icon}</span>
            <span className="font-body-sm text-body-sm">{t.message}</span>
          </div>
        </BsToast>
      ))}
    </ToastContainer>
  );
}
