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

const cleanIso = (isoDate?: string | null): string => {
  if (!isoDate) return todayInVietnam();
  return isoDate.slice(0, 10);
};

const toUtc = (isoDate: string) => {
  const clean = cleanIso(isoDate);
  const [year, month, day] = clean.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const fromUtc = (time: number) => {
  const date = new Date(time);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

export const addDays = (isoDate: string, days: number) => fromUtc(toUtc(isoDate) + days * DAY_MS);

/** 1 = Thứ Hai … 7 = Chủ nhật. */
export const isoWeekday = (isoDate: string) => ((new Date(toUtc(isoDate)).getUTCDay() + 6) % 7) + 1;

export const isMonday = (isoDate: string) => /^\d{4}-\d{2}-\d{2}$/.test(cleanIso(isoDate)) && isoWeekday(isoDate) === 1;

/** Các Thứ Hai từ hôm nay trở đi (hôm nay là Thứ Hai thì tính luôn hôm nay). */
export function upcomingMondays(count: number, today = todayInVietnam()): string[] {
  const offset = (8 - isoWeekday(today)) % 7;
  const first = addDays(today, offset);
  return Array.from({ length: count }, (_, index) => addDays(first, index * 7));
}

/** "2026-10-19" → "19/10". */
export function formatDayMonth(isoDate?: string | null): string {
  if (!isoDate) return '';
  const clean = isoDate.slice(0, 10);
  const [, month, day] = clean.split('-');
  return `${day}/${month}`;
}

/** "2026-10-19" → "19/10/2026". */
export function formatDate(isoDate?: string | null): string {
  if (!isoDate) return '';
  const clean = isoDate.slice(0, 10);
  const [year, month, day] = clean.split('-');
  return `${day}/${month}/${year}`;
}

/** Tuần bắt đầu từ startDate: "19/10 – 25/10/2026". */
export const formatWeekRange = (startDate: string) => `${formatDayMonth(startDate)} – ${formatDate(addDays(startDate, 6))}`;

export function toLocalIsoDate(d: Date): string {
  const padNum = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${padNum(d.getMonth() + 1)}-${padNum(d.getDate())}`;
}

export function nextMonday(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diff = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Thứ dạng ngắn: "T2", "T3", ..., "CN" theo ngày ISO. */
export function getWeekdayShort(isoDate: string): string {
  const weekday = isoWeekday(isoDate); // 1 = T2 ... 7 = CN
  return weekday === 7 ? 'CN' : `T${weekday + 1}`;
}

/** Thứ dạng đầy đủ: "Thứ Hai", "Thứ Ba", ..., "Chủ Nhật" theo ngày ISO. */
export function getWeekdayFull(isoDate: string): string {
  const weekday = isoWeekday(isoDate);
  const map: Record<number, string> = {
    1: 'Thứ Hai',
    2: 'Thứ Ba',
    3: 'Thứ Tư',
    4: 'Thứ Năm',
    5: 'Thứ Sáu',
    6: 'Thứ Bảy',
    7: 'Chủ Nhật',
  };
  return map[weekday] ?? '';
}

export interface QuickStartDate {
  iso: string;
  label: string;
  badge?: string;
}

/** Danh sách các tùy chọn ngày xuất phát nhanh (áp dụng 7 ngày từ ngày chọn):
 * 1. Hôm nay
 * 2. Ngày mai
 * 3. Sau 7 ngày
 */
export function getQuickStartDates(today = todayInVietnam()): QuickStartDate[] {
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  return [
    { iso: today, label: `Hôm nay (${formatDayMonth(today)})`, badge: 'Áp dụng ngay' },
    { iso: tomorrow, label: `Ngày mai (${formatDayMonth(tomorrow)})` },
    { iso: nextWeek, label: `Sau 7 ngày (${formatDayMonth(nextWeek)})` },
  ];
}

/** Thứ Hai của tuần hiện tại (chứa ngày hôm nay). */
export function getCurrentMonday(today = todayInVietnam()): string {
  const weekday = isoWeekday(today); // 1 = T2 ... 7 = CN
  return addDays(today, -(weekday - 1));
}

export interface AvailableMonday {
  iso: string;
  label: string;
  badge?: string;
  isCurrentWeek: boolean;
}

/** Danh sách các Thứ Hai khả dụng để tạo thực đơn:
 * 1. Tuần hiện tại (chứa cả ngày hôm nay): getCurrentMonday()
 * 2. Tuần tới: +7 ngày
 * 3. Tuần kế tiếp: +14 ngày
 */
export function getAvailableMondays(today = todayInVietnam()): AvailableMonday[] {
  const curMon = getCurrentMonday(today);
  const nextMon = addDays(curMon, 7);
  const next2Mon = addDays(curMon, 14);

  return [
    { iso: curMon, label: `Tuần này (${formatDayMonth(curMon)})`, badge: 'Áp dụng ngay', isCurrentWeek: true },
    { iso: nextMon, label: `Tuần tới (${formatDayMonth(nextMon)})`, badge: 'Kế hoạch', isCurrentWeek: false },
    { iso: next2Mon, label: `Sau 2 tuần (${formatDayMonth(next2Mon)})`, isCurrentWeek: false },
  ];
}

/** Chuyển ngày ISO sang mã thứ: MON, TUE, WED, THU, FRI, SAT, SUN. */
export function isoToDayOfWeek(isoDate: string): 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN' {
  const map: Record<number, 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'> = {
    1: 'MON',
    2: 'TUE',
    3: 'WED',
    4: 'THU',
    5: 'FRI',
    6: 'SAT',
    7: 'SUN',
  };
  return map[isoWeekday(isoDate)] ?? 'MON';
}

/**
 * Hiển thị tiêu đề chuẩn theo yêu cầu:
 * - Nếu ít hơn 1 tuần (< 7 ngày): không cần ghi từ ngày nào đến ngày nào, chỉ cần ghi "Thực đơn dinh dưỡng (N ngày)".
 * - Nếu từ 7 ngày trở lên: "Thực đơn từ Thứ [X] DD/MM/YYYY đến Thứ [Y] DD/MM/YYYY (N ngày)".
 */
export function formatMealPlanTitle(startDate: string, daysCount: number): string {
  if (!startDate) return '';
  const safeDays = Math.max(1, daysCount);
  if (safeDays < 7) {
    return `Thực đơn dinh dưỡng (${safeDays} ngày)`;
  }
  const endDate = addDays(startDate.slice(0, 10), safeDays - 1);
  const startDay = getWeekdayFull(startDate);
  const endDay = getWeekdayFull(endDate);
  return `Thực đơn từ ${startDay} ${formatDate(startDate)} đến ${endDay} ${formatDate(endDate)} (${safeDays} ngày)`;
}

/**
 * Hiển thị tiêu đề thẻ ngày:
 * - Nếu < 7 ngày: Ngày 1, Ngày 2, Ngày 3... (không ghi thứ, không ghi ngày bao nhiêu)
 * - Nếu >= 7 ngày: Thứ + ngày/tháng (ví dụ: Thứ Ba, 04/11).
 */
export function formatDayCardHeader(isoDate: string, dayIndex?: number, totalDays = 7): string {
  if (!isoDate) return '';
  if (totalDays < 7 && typeof dayIndex === 'number') {
    return `Ngày ${dayIndex + 1}`;
  }
  return `${getWeekdayFull(isoDate)}, ${formatDayMonth(isoDate)}`;
}

export interface CalendarDayItem {
  index: number;
  isoDate: string;
  dayOfWeek: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  weekdayFull: string;
  weekdayShort: string;
  dayMonth: string;
  formattedDate: string;
  header: string;
  displayTitle: string;
  displaySubtitle: string;
  isToday: boolean;
}

/** Tạo danh sách các ngày thực tế từ startDate với số ngày mong muốn. */
export function getCalendarDays(startDate: string, daysCount: number, today = todayInVietnam()): CalendarDayItem[] {
  const safeDays = Math.max(1, daysCount);
  const cleanStart = (startDate || today).slice(0, 10);

  return Array.from({ length: safeDays }, (_, index) => {
    const isoDate = addDays(cleanStart, index);
    const weekdayFull = getWeekdayFull(isoDate);
    const isLessThanWeek = safeDays < 7;
    return {
      index,
      isoDate,
      dayOfWeek: isoToDayOfWeek(isoDate),
      weekdayFull,
      weekdayShort: getWeekdayShort(isoDate),
      dayMonth: formatDayMonth(isoDate),
      formattedDate: formatDate(isoDate),
      header: formatDayCardHeader(isoDate, index, safeDays),
      displayTitle: isLessThanWeek ? `Ngày ${index + 1}` : weekdayFull,
      displaySubtitle: isLessThanWeek ? '' : (isoDate === today ? 'Hôm nay' : formatDayMonth(isoDate)),
      isToday: isoDate === today,
    };
  });
}


