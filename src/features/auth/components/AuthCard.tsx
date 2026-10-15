import { LogoMark } from '@/components/common/Logo';
import type { ReactNode } from 'react';

/** Khung thẻ trung tâm dùng chung cho SCR-01 … SCR-05 (bố cục theo Stitch SCR-02/03). */
export function AuthCard({ icon, title, subtitle, children, footer, width = 520 }: { icon: string; title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-transparent px-margin-sm pb-space-xl pt-[calc(72px+2.5rem)] md:px-margin">
      <div className="flex w-full flex-col items-center" style={{ maxWidth: width }}>
        <div className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container-lowest p-space-lg shadow-sm sm:p-space-xl">
          <div className="mb-space-lg flex flex-col items-center text-center">
            <div className="mb-space-sm flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low text-secondary shadow-sm">
              {icon === 'potted_plant' ? <LogoMark size={34} /> : <span className="material-symbols-outlined text-[26px]">{icon}</span>}
            </div>
            <h1 className="mb-space-xs font-headline-md text-headline-md tracking-tight text-on-surface">{title}</h1>
            {subtitle && <p className="max-w-[380px] font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="mt-space-lg flex items-center justify-center border-t border-surface-container-highest pt-space-md text-center">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
