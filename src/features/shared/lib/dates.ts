/** Định dạng YYYY-MM-DD theo giờ địa phương (không dùng toISOString — lệch 1 ngày ở UTC+7). */
export function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Phân tích YYYY-MM-DD thành Date giờ địa phương 00:00 (không qua UTC). */
export function parseLocalIsoDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
}

export const isMonday = (d: Date) => d.getDay() === 1;

/** Thứ Hai gần nhất tính từ `from` (bao gồm cả `from` nếu đang là Thứ Hai) trở đi. */
export function nextMonday(from: Date, includeToday = true): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const add = (8 - d.getDay()) % 7;
  d.setDate(d.getDate() + (add === 0 && !includeToday ? 7 : add));
  return d;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

export const formatDayMonth = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
