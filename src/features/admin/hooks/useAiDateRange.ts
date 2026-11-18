import { useEffect } from 'react';
import { useUrlFilters } from './useUrlFilters';
import { vnDate } from '../lib/llmops';

export const AI_DATE_PRESETS = [7, 30, 90];
const PRESETS = AI_DATE_PRESETS;
const DEFAULT_DAYS = 30;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Khoảng ngày dùng chung cho các trang Giám sát AI, lưu trên URL (`from`, `to`), mặc định 30 ngày gần nhất (GMT+7).
 */
export function useAiDateRange() {
  const { get, set } = useUrlFilters();
  const today = vnDate();
  const from = ISO_DATE.test(get('from')) ? get('from') : vnDate(DEFAULT_DAYS - 1);
  const to = ISO_DATE.test(get('to')) ? get('to') : today;
  const rangeError =
    from > to
      ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'
      : to > today
        ? 'Ngày kết thúc không được sau hôm nay.'
        : null;
  const preset = PRESETS.find((days) => from === vnDate(days - 1) && to === today);
  return { from, to, today, rangeError, preset, set };
}

/** Cuộn tới phần có id trùng hash của URL sau khi trang render (dùng cho redirect `/analytics` → `#cost`, `/rag` → `#rag`). */
export function useScrollToHash(hash: string) {
  useEffect(() => {
    const id = hash.replace(/^#/, '');
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView?.({ block: 'start' });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [hash]);
}
