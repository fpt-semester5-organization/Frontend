import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

type Patch = Record<string, string | number | boolean | null | undefined>;

/**
 * Bộ lọc + trang lưu trên URL: tải lại trang, quay lại bằng nút Back hay gửi link đều giữ nguyên điều kiện lọc.
 * Đổi bộ lọc thì về trang 1.
 */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams();

  const get = useCallback((key: string) => params.get(key) ?? '', [params]);

  const set = useCallback(
    (patch: Patch) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === null || value === '') next.delete(key);
            else next.set(key, String(value));
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1);
  const hasFilters = [...params.keys()].some((key) => key !== 'page');
  const clear = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  return { get, set, page, hasFilters, clear };
}
