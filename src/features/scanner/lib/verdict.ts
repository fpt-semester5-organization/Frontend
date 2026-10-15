import type { AdditiveStatus, AllergenWarning, VeganVerdict } from '../types/scanner.types';

/** Ba mức kết luận (BR-USR-09) và cách hiển thị. */
export const VERDICT_INFO: Record<
  VeganVerdict,
  { label: string; short: string; icon: string; hero: string; badge: string; dot: string }
> = {
  GREEN: {
    label: 'Thuần chay',
    short: 'Xanh',
    icon: 'verified',
    hero: 'bg-success-container text-success',
    badge: 'bg-success-container text-success',
    dot: 'bg-success',
  },
  YELLOW: {
    label: 'Cần xem lại',
    short: 'Vàng',
    icon: 'help',
    hero: 'bg-warning-container text-warning',
    badge: 'bg-warning-container text-warning',
    dot: 'bg-warning',
  },
  RED: {
    label: 'Không thuần chay',
    short: 'Đỏ',
    icon: 'block',
    hero: 'bg-error-container text-on-error-container',
    badge: 'bg-error-container text-on-error-container',
    dot: 'bg-error',
  },
};

/** Ba cấp của từ điển E-numbers (BR-ADM-MAS-002). */
export const ADDITIVE_INFO: Record<AdditiveStatus, { label: string; className: string }> = {
  VEGAN: { label: 'Thực vật', className: 'bg-success-container text-success' },
  DOUBTFUL: { label: 'Nghi vấn', className: 'bg-warning-container text-warning' },
  NON_VEGAN: { label: 'Động vật', className: 'bg-error-container text-on-error-container' },
};

/** Phụ gia đáng chú ý lên trước: động vật → nghi vấn → thực vật. */
export const ADDITIVE_ORDER: AdditiveStatus[] = ['NON_VEGAN', 'DOUBTFUL', 'VEGAN'];

export const allergenLabel = (warning: AllergenWarning) =>
  typeof warning === 'string' ? warning : (warning.allergenName ?? warning.code ?? 'Chất gây dị ứng');
