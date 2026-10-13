import type { AdditiveVeganStatus, AllergenWarningRaw, VeganVerdict } from '../types/scanner.types';

export const VERDICT_META: Record<VeganVerdict, { label: string; dot: string; text: string; icon: string; panel: string }> = {
  GREEN: { label: 'Thuần chay', dot: 'bg-primary', text: 'text-primary', icon: 'task_alt', panel: 'bg-primary-fixed/25' },
  YELLOW: { label: 'Cần lưu ý (nghi vấn)', dot: 'bg-secondary', text: 'text-secondary', icon: 'help', panel: 'bg-secondary-fixed/40' },
  RED: { label: 'Không thuần chay', dot: 'bg-error', text: 'text-error', icon: 'cancel', panel: 'bg-error-container/50' },
};

export const verdictMeta = (v: string) => VERDICT_META[v as VeganVerdict] ?? { label: v, dot: 'bg-outline', text: 'text-on-surface-variant', icon: 'help', panel: 'bg-surface-container' };

export const ADDITIVE_STATUS: Record<AdditiveVeganStatus, { label: string; cls: string }> = {
  VEGAN: { label: 'Thực vật / tổng hợp', cls: 'bg-primary-fixed/60 text-primary' },
  DOUBTFUL: { label: 'Nghi vấn', cls: 'bg-secondary-fixed text-on-secondary-fixed' },
  NON_VEGAN: { label: 'Nguồn gốc động vật', cls: 'bg-error-container text-on-error-container' },
};

export const additiveStatus = (s: string) => ADDITIVE_STATUS[s as AdditiveVeganStatus] ?? { label: s, cls: 'bg-surface-container-highest text-on-surface-variant' };

/** Chuẩn hóa phần tử `allergenWarnings` (UNSPECIFIED trong openapi) thành chuỗi hiển thị. */
export function allergenWarningText(w: AllergenWarningRaw): string {
  if (typeof w === 'string') return w;
  return (w.allergenName ?? w.name ?? '').toString() || 'Chất gây dị ứng';
}
