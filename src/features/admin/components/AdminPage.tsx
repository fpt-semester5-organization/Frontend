import type { ReactNode } from 'react';

/** Khung trang quản trị chung: tiêu đề + thao tác + nội dung, khớp bố cục Stitch (pt-16, max 1360). */
export function AdminPage({ title, subtitle, actions, children, wide }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto flex w-full flex-col gap-space-lg ${wide ? 'max-w-[1440px]' : 'max-w-[1360px]'}`}>
      <header className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
        <div className="flex flex-col gap-space-xs">
          <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">{title}</h1>
          {subtitle && <p className="max-w-2xl font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-space-sm">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Panel({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-space-sm px-space-lg pt-space-lg">
          {title && <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'alert' }) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
      <span className={`font-label-sm text-label-sm font-semibold ${tone === 'alert' ? 'text-secondary' : 'text-on-surface-variant'}`}>{label}</span>
      <span className={`mt-1 font-headline-lg text-headline-lg tracking-tight ${tone === 'alert' ? 'text-secondary' : 'text-on-surface'}`}>{value}</span>
      {hint && <span className="mt-1 font-label-sm text-label-sm text-on-surface-variant">{hint}</span>}
    </div>
  );
}
