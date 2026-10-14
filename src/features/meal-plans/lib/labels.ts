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
};

export const STATUS_CLASS: Record<PlanStatus, string> = {
  DRAFT: 'bg-warning-container text-warning',
  ACTIVE: 'bg-primary-fixed text-on-primary-fixed',
  ARCHIVED: 'bg-surface-container text-on-surface-variant',
  TEMPLATE: 'bg-surface-container text-on-surface-variant',
};

/** Mức ngân sách (D72). */
export const BUDGET_OPTIONS: { value: BudgetTier; label: string; description: string; icon: string }[] = [
  { value: 'ECONOMICAL', label: 'Tiết kiệm', description: 'Nguyên liệu phổ biến, dễ mua ở chợ.', icon: 'savings' },
  { value: 'STANDARD', label: 'Tiêu chuẩn', description: 'Cân bằng giữa chi phí và độ đa dạng.', icon: 'balance' },
  { value: 'PREMIUM', label: 'Cao cấp', description: 'Thêm hạt, nấm quý và món cầu kỳ hơn.', icon: 'diamond' },
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
