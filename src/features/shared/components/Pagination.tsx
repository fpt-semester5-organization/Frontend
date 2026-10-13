/** Phân trang đơn giản theo `meta` (page/size/total). */
export function Pagination({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  const btn = 'inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <nav className="flex items-center justify-between gap-3 py-3" aria-label="Phân trang">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
        Trước
      </button>
      <span className="font-label-md text-label-md text-on-surface-variant">
        Trang {page}/{pages} · {total} mục
      </span>
      <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Sau
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
      </button>
    </nav>
  );
}
