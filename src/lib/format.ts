// Định dạng hiển thị theo UI-2: ngày dd/MM/yyyy HH:mm theo UTC+7, số theo vi-VN.

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "2026-10-26T10:00:00" (không có Z hay +07:00). */
const NO_TIMEZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/**
 * Backend lưu DateTime.UtcNow. API đã trả kèm Z, nhưng chuỗi thiếu múi giờ (mock, bên thứ ba, phản hồi lỗi) sẽ bị `new Date()`
 * hiểu là giờ máy và lệch 7 giờ, nên chuỗi không có múi giờ được coi là UTC.
 */
export function parseServerDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(NO_TIMEZONE.test(value) ? `${value}Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2026-10-05T10:00:00Z" → "05/10/2026 17:00". */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = typeof value === 'string' ? parseServerDate(value) : value;
  if (!date || Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(
    dateTimeFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

const numberFormatter = new Intl.NumberFormat('vi-VN');

export const formatNumber = (value: number) => numberFormatter.format(value);

/** 12 400 000 → "12.400.000 ₫" */
export const formatVnd = (value: number) => `${numberFormatter.format(value)} ₫`;

/** Thời lượng video: 95 → "1:35". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
