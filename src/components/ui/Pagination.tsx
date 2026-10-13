import React from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface PaginationProps {
  page: number;
  size: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Phân trang theo meta { page, size, total } (D111). Trang hiển thị: 1 … (p-1) p (p+1) … cuối. */
export const Pagination: React.FC<PaginationProps> = ({ page, size, total, onPageChange, className }) => {
  const last = Math.max(1, Math.ceil(total / Math.max(1, size)));
  if (last <= 1) return null;

  const pages = [...new Set([1, last, page - 1, page, page + 1])]
    .filter((n) => n >= 1 && n <= last)
    .sort((a, b) => a - b);
  const btn =
    'flex h-10 w-10 items-center justify-center rounded-xl font-label-md text-label-md shadow-sm transition-colors';

  return (
    <nav aria-label="Phân trang" className={cn('flex items-center justify-center gap-2 py-space-md', className)}>
      <button
        type="button"
        aria-label="Trang trước"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={cn(btn, 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-40')}
      >
        <Icon name="chevron_left" className="text-[20px]" />
      </button>
      {pages.map((item, index) => (
        <span key={item} className="flex items-center gap-2">
          {index > 0 && item - pages[index - 1] > 1 && (
            <span className="text-outline" aria-hidden="true">
              …
            </span>
          )}
          {item === page ? (
            <span aria-current="page" className={cn(btn, 'bg-primary text-on-primary')}>
              {item}
            </span>
          ) : (
            <button
              type="button"
              aria-label={`Trang ${item}`}
              onClick={() => onPageChange(item)}
              className={cn(btn, 'bg-surface-container-lowest text-on-surface hover:bg-surface-container')}
            >
              {item}
            </button>
          )}
        </span>
      ))}
      <button
        type="button"
        aria-label="Trang sau"
        disabled={page >= last}
        onClick={() => onPageChange(page + 1)}
        className={cn(btn, 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-40')}
      >
        <Icon name="chevron_right" className="text-[20px]" />
      </button>
    </nav>
  );
};
