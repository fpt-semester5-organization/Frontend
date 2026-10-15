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

/** "2026-10-05T10:00:00Z" → "05/10/2026 17:00". */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
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
