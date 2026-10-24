import { formatDateTime } from '@/lib/format';

/** "2026-10-26T10:00:00" (không có Z hay +07:00). */
const NO_TIMEZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/**
 * Backend lưu DateTime.UtcNow nhưng có chỗ trả về không kèm múi giờ; `new Date()` sẽ hiểu đó là giờ máy và lệch 7 giờ.
 * Chuỗi không có múi giờ được coi là UTC.
 */
export function parseServerDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(NO_TIMEZONE.test(value) ? `${value}Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** dd/MM/yyyy HH:mm theo giờ Việt Nam (UI-2); rỗng nếu không có giá trị. */
export const formatServerDateTime = (value: string | null | undefined) => formatDateTime(parseServerDate(value));
