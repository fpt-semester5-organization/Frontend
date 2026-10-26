import { useCallback, useEffect, useState } from 'react';

/** Debounce giá trị gõ tay (ô tìm kiếm) để không gọi API mỗi phím. */
export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Trạng thái bộ lọc + trang của một danh sách. Đổi bộ lọc luôn đưa về trang 1;
 * `size` cố định theo màn (mặc định 20, tối đa 100 theo openapi).
 */
export function useListState<F extends Record<string, unknown>>(initial: F, size = 20) {
  const [filters, setFilters] = useState<F>(initial);
  const [page, setPage] = useState(1);
  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }, []);
  const setMultipleFilters = useCallback((patch: Partial<F>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);
  const reset = useCallback(() => {
    setFilters(initial);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { filters, page, size, setFilter, setMultipleFilters, setPage, reset };
}
