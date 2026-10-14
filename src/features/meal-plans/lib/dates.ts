// Ngày dạng YYYY-MM-DD (không giờ) theo lịch Việt Nam. Tính bằng UTC để không lệch múi giờ.

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');

/** Hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function todayInVietnam(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts; // en-CA cho sẵn dạng YYYY-MM-DD
}

const toUtc = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const fromUtc = (time: number) => {
  const date = new Date(time);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

export const addDays = (isoDate: string, days: number) => fromUtc(toUtc(isoDate) + days * DAY_MS);

/** 1 = Thứ Hai … 7 = Chủ nhật. */
export const isoWeekday = (isoDate: string) => ((new Date(toUtc(isoDate)).getUTCDay() + 6) % 7) + 1;

export const isMonday = (isoDate: string) => /^\d{4}-\d{2}-\d{2}$/.test(isoDate) && isoWeekday(isoDate) === 1;

/** Các Thứ Hai từ hôm nay trở đi (hôm nay là Thứ Hai thì tính luôn hôm nay). */
export function upcomingMondays(count: number, today = todayInVietnam()): string[] {
  const offset = (8 - isoWeekday(today)) % 7;
  const first = addDays(today, offset);
  return Array.from({ length: count }, (_, index) => addDays(first, index * 7));
}

/** "2026-10-19" → "19/10". */
export function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

/** "2026-10-19" → "19/10/2026". */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Tuần bắt đầu từ startDate: "19/10 – 25/10/2026". */
export const formatWeekRange = (startDate: string) => `${formatDayMonth(startDate)} – ${formatDate(addDays(startDate, 6))}`;
