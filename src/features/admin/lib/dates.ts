/** Ngày cục bộ dạng YYYY-MM-DD (định dạng `from`/`to` của openapi). */
export const toIsoDate = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export type RangePreset = 'TODAY' | 'WEEK' | 'MONTH';

export function presetRange(preset: RangePreset, now = new Date()): { from: string; to: string } {
  const to = toIsoDate(now);
  if (preset === 'TODAY') return { from: to, to };
  if (preset === 'WEEK') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: toIsoDate(d), to };
  }
  return { from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to };
}
