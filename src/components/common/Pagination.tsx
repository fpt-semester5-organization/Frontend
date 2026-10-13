import type { ApiMeta } from '@/api/types';

/** Phân trang theo `meta` {page,size,total} của server. Trang hiển thị: 1 … (p-1) p (p+1) … cuối. */
export function Pagination({ meta, onPage }: { meta: ApiMeta; onPage: (page: number) => void }) {
  const last = Math.max(1, Math.ceil(meta.total / Math.max(1, meta.size)));
  if (last <= 1) return null;
  const set = new Set([1, last, meta.page - 1, meta.page, meta.page + 1].filter((n) => n >= 1 && n <= last));
  const pages = [...set].sort((a, b) => a - b);
  const btn = 'flex h-10 w-10 items-center justify-center rounded-xl font-label-md text-label-md shadow-sm transition-colors';
  return (
    <nav className="flex items-center justify-center gap-2 py-space-md" aria-label="Phân trang">
      <button type="button" aria-label="Trang trước" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} className={`${btn} bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-40`}>
        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - pages[i - 1] > 1 && <span className="text-outline">…</span>}
          {p === meta.page ? (
            <span aria-current="page" className={`${btn} bg-primary text-on-primary`}>{p}</span>
          ) : (
            <button type="button" onClick={() => onPage(p)} className={`${btn} bg-surface-container-lowest text-on-surface hover:bg-surface-container`}>{p}</button>
          )}
        </span>
      ))}
      <button type="button" aria-label="Trang sau" disabled={meta.page >= last} onClick={() => onPage(meta.page + 1)} className={`${btn} bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-40`}>
        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
      </button>
    </nav>
  );
}
