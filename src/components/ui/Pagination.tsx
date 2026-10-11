import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PaginationProps {
  page: number;
  size: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Phân trang theo meta { page, size, total } (D111). */
export const Pagination: React.FC<PaginationProps> = ({ page, size, total, onPageChange, className }) => {
  const totalPages = Math.max(1, Math.ceil(total / size));
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages);
  const buttonBase =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm focus-visible:outline-2 focus-visible:outline-brand-600';

  return (
    <nav aria-label="Phân trang" className={cn('flex flex-wrap items-center justify-center gap-1', className)}>
      <button
        type="button"
        className={cn(buttonBase, 'text-gray-700 hover:bg-gray-100 disabled:text-gray-300')}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      {pages.map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-gray-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={cn(
              buttonBase,
              item === page ? 'bg-brand-600 font-medium text-white' : 'text-gray-700 hover:bg-gray-100'
            )}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Trang ${item}`}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        className={cn(buttonBase, 'text-gray-700 hover:bg-gray-100 disabled:text-gray-300')}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Trang sau"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
};

/** 1 … 4 5 6 … 12 */
function buildPageList(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const result: (number | 'gap')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) result.push('gap');
  for (let i = start; i <= end; i++) result.push(i);
  if (end < totalPages - 1) result.push('gap');
  result.push(totalPages);
  return result;
}
