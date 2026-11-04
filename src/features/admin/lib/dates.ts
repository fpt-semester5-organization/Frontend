/**
 * Múi giờ chuẩn toàn hệ thống VeggieLife: Giờ Việt Nam (UTC+7).
 */
export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Định dạng ngày YYYY-MM-DD theo múi giờ Việt Nam (UTC+7) chuẩn openapi `from`/`to`.
 */
export const toIsoDate = (d: Date, timeZone: string = VIETNAM_TIMEZONE): string => {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(d);
};

export type RangePreset = 'TODAY' | 'WEEK' | 'MONTH';

/**
 * Tạo khoảng ngày from/to theo preset và múi giờ Việt Nam (UTC+7).
 */
export function presetRange(preset: RangePreset, now = new Date()): { from: string; to: string } {
  const to = toIsoDate(now);
  if (preset === 'TODAY') return { from: to, to };
  if (preset === 'WEEK') {
    const [y, m, d] = to.split('-').map(Number);
    const fromDate = new Date(Date.UTC(y, m - 1, d - 6));
    const from = [
      fromDate.getUTCFullYear(),
      String(fromDate.getUTCMonth() + 1).padStart(2, '0'),
      String(fromDate.getUTCDate()).padStart(2, '0'),
    ].join('-');
    return { from, to };
  }
  const [y, m] = to.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  return { from, to };
}
