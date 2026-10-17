import type { ReactNode } from 'react';
import { apiErrorMessage } from '@/api/http';

export function PageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4" role="status" aria-busy="true" aria-label="Đang tải">
      <div className="h-8 w-1/3 rounded-lg bg-surface-container-high" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 rounded-xl bg-surface-container" />
        ))}
      </div>
    </div>
  );
}

export function PageError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl bg-surface-container-lowest p-space-xl text-center shadow-sm">
      <span className="material-symbols-outlined text-[40px] text-outline">cloud_off</span>
      <p className="font-body-md text-body-md text-on-surface-variant">{apiErrorMessage(error, 'Không tải được dữ liệu. Vui lòng thử lại.')}</p>
      <button type="button" onClick={onRetry} className="rounded-lg bg-primary-container px-5 py-2 font-label-md text-label-md text-on-primary hover:bg-primary">
        Thử lại
      </button>
    </div>
  );
}

export function PageEmpty({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 rounded-xl bg-surface-container-lowest p-space-xl text-center shadow-sm">
      <span className="material-symbols-outlined text-[40px] text-outline">inbox</span>
      <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{hint}</p>
      {children}
    </div>
  );
}
