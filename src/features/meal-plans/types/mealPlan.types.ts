import type { DeepRequired, Schemas } from '@/api/types';

// Mọi type lấy từ src/api/generated (sinh từ docs/08. OpenAPI); chỉ bổ sung chỗ OpenAPI bỏ trống.

/** GET /meal-plans/{id} (FN-MEAL-02): 21 bữa, hạn mức chỉnh sửa trước/sau khi kích hoạt. */
export type MealPlanDetail = DeepRequired<Schemas['GetMealPlanResponse']['data']>;
export type MealSlot = MealPlanDetail['slots'][number];
export type MealPlanEdits = MealPlanDetail['edits'];
export type PlanStatus = MealPlanDetail['planStatus'];
export type BudgetTier = MealPlanDetail['budgetTier'];
export type DayOfWeek = MealSlot['dayOfWeek'];
export type MealType = MealSlot['mealType'];

/** GET /meal-plans (FN-MEAL-02). */
export type MealPlanListItem = DeepRequired<Schemas['ListMealPlansResponse']['data'][number]>;

/** POST /meal-plans (FN-MEAL-01). */
export type CreateMealPlanBody = Schemas['CreateMealPlanRequest'];

/** PUT /meal-plans/{id}/slots/{slotId} (FN-MEAL-03). */
export type SwapSlotBody = Schemas['UpdateMealPlanSlotRequest'];
export type SwapReason = NonNullable<SwapSlotBody['swapReason']>;
export type SwapSlotResult = DeepRequired<Schemas['UpdateMealPlanSlotResponse']['data']>;

/** PATCH /meal-plans/{id}/slots/{slotId} (FN-MEAL-04). */
export type CompleteSlotResult = DeepRequired<Schemas['PatchMealPlanSlotResponse']['data']>;

/** POST /meal-plans/{id}/activate (FN-MEAL-02). */
export type ActivateResult = DeepRequired<Schemas['ActivateMealPlanResponse']['data']>;

type NutritionData = DeepRequired<Schemas['GetMealPlanNutritionResponse']['data']>;
export type NutritionLevel = 'BASIC' | 'DETAILED';

/**
 * GET /meal-plans/{id}/nutrition (FN-MEAL-07). BASIC (mọi thành viên) chỉ có tổng calo mỗi ngày;
 * DETAILED (VIP) thêm calo từng bữa, tổng tuần và chênh lệch so với mục tiêu.
 */
export type MealPlanNutrition = Omit<NutritionData, 'targetKcalPerDay' | 'totalKcalWeek' | 'days'> & {
  targetKcalPerDay: number | null;
  totalKcalWeek: number | null;
  days: (Omit<NutritionData['days'][number], 'deltaKcal' | 'meals'> & {
    deltaKcal: number | null;
    meals: NutritionData['days'][number]['meals'] | null;
  })[];
};
