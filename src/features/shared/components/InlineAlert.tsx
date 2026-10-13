import type { ReactNode } from 'react';

type Tone = 'error' | 'warning' | 'info';

const TONE: Record<Tone, { box: string; icon: string }> = {
  error: { box: 'bg-error-container text-on-error-container', icon: 'error' },
  warning: { box: 'bg-secondary-fixed text-on-secondary-fixed', icon: 'warning' },
  info: { box: 'bg-surface-container text-on-surface', icon: 'info' },
};

/** Khung cảnh báo nổi bật trong trang (spec: "Khung cảnh báo nổi bật với message của server; không xóa dữ liệu đã nhập"). */
export function InlineAlert({ tone = 'error', title, children, action, className = '' }: { tone?: Tone; title?: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  const t = TONE[tone];
  return (
    <div role={tone === 'info' ? 'status' : 'alert'} className={`flex items-start gap-3 rounded-xl px-4 py-3 ${t.box} ${className}`}>
      <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px]">{t.icon}</span>
      <div className="min-w-0 flex-1 font-body-sm text-body-sm">
        {title && <p className="font-label-md text-label-md font-semibold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action}
    </div>
  );
}
