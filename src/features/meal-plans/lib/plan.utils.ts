import { addDays, formatDayMonth, formatDate } from './dates';
import { DAYS, MEALS } from './labels';
import type { DayOfWeek, MealPlanDetail, MealSlot } from '../types/mealPlan.types';

export const MEAL_ORDER = MEALS;

/** Nhóm bữa theo ngày, sắp xếp Sáng → Trưa → Tối → Phụ. */
export function slotsByDay(slots: MealSlot[]): Record<DayOfWeek, MealSlot[]> {
  const out = Object.fromEntries(DAYS.map((d) => [d, [] as MealSlot[]])) as Record<DayOfWeek, MealSlot[]>;
  for (const s of slots) {
    if (out[s.dayOfWeek]) {
      out[s.dayOfWeek].push(s);
    }
  }
  for (const d of DAYS) {
    out[d].sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType));
  }
  return out;
}

export function dayKcal(slots: MealSlot[]): number {
  return Math.round(slots.reduce((sum, s) => sum + (s.recipe?.caloriesKcal ?? 0), 0));
}

/** Ngày YYYY-MM-DD của thứ `day` trong tuần bắt đầu ở `startDate` (Thứ Hai). */
export function dateOfDay(startDate: string, day: DayOfWeek): string {
  const dayIndex = DAYS.indexOf(day);
  return addDays(startDate.slice(0, 10), dayIndex >= 0 ? dayIndex : 0);
}

export const labelOfDay = (startDate: string, day: DayOfWeek): string => {
  const iso = dateOfDay(startDate, day);
  return formatDayMonth(iso);
};

export function progress(plan: { slots: MealSlot[] }) {
  const total = plan.slots.length;
  const done = plan.slots.filter((s) => s.isCompleted).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/**
 * Hạn mức đổi món theo độ dài thực đơn, giống MealPlanService.CalculateScaledLimit của Backend:
 * mức chuẩn 7 ngày (MEAL_SWAP_LIMIT_DRAFT / MEAL_SWAP_LIMIT_ACTIVE) quy đổi theo số ngày, làm tròn lên, tối thiểu 1.
 */
export function scaledSwapLimit(baseSevenDayLimit: number, durationDays: number): number {
  const days = Math.min(30, Math.max(1, Math.trunc(durationDays) || 1));
  return days === 7 ? baseSevenDayLimit : Math.max(1, Math.ceil((baseSevenDayLimit * days) / 7));
}

/** Giai đoạn chỉnh sửa hiện hành: nháp dùng hạn mức "trước kích hoạt", đang áp dụng dùng "sau kích hoạt" (FN-MEAL-03). */
export function editsOfPhase(plan: Pick<MealPlanDetail, 'planStatus' | 'edits'>) {
  const post = plan.planStatus === 'ACTIVE' || plan.planStatus === 'ARCHIVED';
  return post
    ? { used: plan.edits.postDeployUsed, limit: plan.edits.postDeployLimit, phase: 'sau khi kích hoạt' as const }
    : { used: plan.edits.preDeployUsed, limit: plan.edits.preDeployLimit, phase: 'khi còn bản nháp' as const };
}
