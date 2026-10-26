import type { ApiMeta } from '@/api/types';
import { windowed } from '../lib/paging';

/** Phân trang theo `meta` {page,size,total} của envelope. */
export function Pager({ meta, onPage, unit = 'mục', fetching }: { meta: ApiMeta; onPage: (page: number) => void; unit?: string; fetching?: boolean }) {
  const pages = Math.max(1, Math.ceil(meta.total / Math.max(1, meta.size)));
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.size + 1;
  const to = Math.min(meta.total, meta.page * meta.size);
  const nums = windowed(meta.page, pages);
  const btn = 'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-label-sm text-label-sm transition-colors';
  return (
    <nav aria-label="Phân trang" className="flex flex-col justify-between gap-space-sm bg-surface-container-low p-space-md sm:flex-row sm:items-center">
      <span className="font-body-sm text-body-sm text-on-surface-variant" aria-live="polite">
        Hiển thị <span className="font-semibold text-on-surface">{from}–{to}</span> trên tổng số <span className="font-semibold text-on-surface">{meta.total}</span> {unit}
        {fetching && <span className="ml-2 text-outline">đang cập nhật…</span>}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Trang trước" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} className={`${btn} bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-40`}>
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        {nums.map((n, i) =>
          n === null ? (
            <span key={`gap${i}`} className="px-1 text-outline">…</span>
          ) : (
            <button key={n} type="button" aria-current={n === meta.page ? 'page' : undefined} onClick={() => onPage(n)} className={`${btn} ${n === meta.page ? 'bg-primary-container font-bold text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}>
              {n}
            </button>
          ),
        )}
        <button type="button" aria-label="Trang sau" disabled={meta.page >= pages} onClick={() => onPage(meta.page + 1)} className={`${btn} bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-40`}>
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </nav>
  );
}
