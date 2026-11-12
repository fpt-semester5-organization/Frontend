import type { BudgetTier, DayOfWeek, MealType, PlanStatus, SwapReason } from '../types/mealPlan.types';

export const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const DAY_LABEL: Record<DayOfWeek, string> = {
  MON: 'Thứ 2',
  TUE: 'Thứ 3',
  WED: 'Thứ 4',
  THU: 'Thứ 5',
  FRI: 'Thứ 6',
  SAT: 'Thứ 7',
  SUN: 'Chủ nhật',
};

/** Lưới 7 ngày × 3 bữa; SNACK có trong enum nhưng thực đơn 21 bữa không dùng. */
export const MEALS: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER'];

export const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: 'Bữa sáng',
  LUNCH: 'Bữa trưa',
  DINNER: 'Bữa tối',
  SNACK: 'Bữa phụ',
};

export const MEAL_ICON: Record<MealType, string> = {
  BREAKFAST: 'wb_twilight',
  LUNCH: 'light_mode',
  DINNER: 'dark_mode',
  SNACK: 'cookie',
};

export const STATUS_LABEL: Record<PlanStatus, string> = {
  DRAFT: 'Bản nháp',
  ACTIVE: 'Đang áp dụng',
  ARCHIVED: 'Đã lưu trữ',
  TEMPLATE: 'Thực đơn mẫu',
  CANCELLED: 'Đã hủy',
};

export const STATUS_CLASS: Record<PlanStatus, string> = {
  DRAFT: 'bg-warning-container text-warning',
  ACTIVE: 'bg-primary-fixed text-on-primary-fixed',
  ARCHIVED: 'bg-surface-container text-on-surface-variant',
  TEMPLATE: 'bg-surface-container text-on-surface-variant',
  CANCELLED: 'bg-error-container text-error border border-error/20 font-medium',
};

export interface BudgetOption {
  value: BudgetTier;
  label: string;
  priceRange: string;
  description: string;
  suggestedIngredients: string;
  icon: string;
  badge?: string;
}

/** Mức ngân sách (D72): Chi tiết hóa số tiền và gợi ý nguyên liệu đi kèm. */
export const BUDGET_TIER_DETAILS: Record<BudgetTier, BudgetOption> = {
  ECONOMICAL: {
    value: 'ECONOMICAL',
    label: 'Tiết kiệm',
    priceRange: '~30k - 50k',
    description: 'Nguyên liệu bình dân, dễ mua ở chợ địa phương, tối ưu chi phí sinh hoạt.',
    suggestedIngredients: 'Đậu hũ, rau muống, nấm rơm, rau củ theo mùa, các loại đậu hạt cơ bản',
    icon: 'savings',
  },
  STANDARD: {
    value: 'STANDARD',
    label: 'Tiêu chuẩn',
    priceRange: '~60k - 100k',
    description: 'Cân bằng hoàn hảo giữa chi phí, dinh dưỡng và độ đa dạng thực đơn.',
    suggestedIngredients: 'Nấm tươi (đùi gà, đông cô), đậu hũ non, hạt sen, bông cải xanh, rong biển',
    icon: 'balance',
    badge: 'Mặc định',
  },
  PREMIUM: {
    value: 'PREMIUM',
    label: 'Cao cấp',
    priceRange: '>120k',
    description: 'Thực phẩm dinh dưỡng thượng hạng, nguyên liệu hữu cơ và nấm quý bổ dưỡng.',
    suggestedIngredients: 'Hạt dinh dưỡng cao cấp (óc chó, macca), nấm quý (bụng dê, linh chi), đồ hữu cơ',
    icon: 'diamond',
  },
};

export const BUDGET_OPTIONS: BudgetOption[] = [
  BUDGET_TIER_DETAILS.ECONOMICAL,
  BUDGET_TIER_DETAILS.STANDARD,
  BUDGET_TIER_DETAILS.PREMIUM,
];

export const BUDGET_LABEL: Record<BudgetTier, string> = {
  ECONOMICAL: 'Tiết kiệm',
  STANDARD: 'Tiêu chuẩn',
  PREMIUM: 'Cao cấp',
};

export const SWAP_REASONS: { value: SwapReason; label: string }[] = [
  { value: 'TASTE_PREFERENCE', label: 'Không hợp khẩu vị' },
  { value: 'MISSING_INGREDIENT', label: 'Thiếu nguyên liệu' },
  { value: 'TIME_LIMIT', label: 'Không đủ thời gian nấu' },
];

export const SWAP_REASON_LABEL: Record<SwapReason, string> = {
  TASTE_PREFERENCE: 'Không hợp khẩu vị',
  MISSING_INGREDIENT: 'Thiếu nguyên liệu',
  TIME_LIMIT: 'Không đủ thời gian nấu',
};

export const MEAL_BADGE: Record<MealType, string> = {
  BREAKFAST: 'bg-primary text-on-primary',
  LUNCH: 'bg-secondary text-on-secondary',
  DINNER: 'bg-primary text-on-primary',
  SNACK: 'bg-outline text-surface-container-lowest',
};
