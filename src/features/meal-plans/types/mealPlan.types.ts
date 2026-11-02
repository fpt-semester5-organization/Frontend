import type { DeepRequired, Schemas } from '@/api/types';

// Mọi type lấy từ src/api/generated (sinh từ docs/08. OpenAPI); chỉ bổ sung chỗ OpenAPI bỏ trống.

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'TEMPLATE' | 'CANCELLED';

export type MealPlanStatusFilter = 'ALL' | 'ACTIVE' | 'DRAFT' | 'CANCELLED' | 'ARCHIVED';

export type MealPlanSortOption = 'newest' | 'oldest' | 'startDateDesc' | 'startDateAsc';

export interface MealPlanFilterState {
  status: MealPlanStatusFilter;
  keyword: string;
  sort: MealPlanSortOption;
}

/** GET /meal-plans/{id} (FN-MEAL-02): 21 bữa, hạn mức chỉnh sửa trước/sau khi kích hoạt. */
export type MealPlanDetail = Omit<DeepRequired<Schemas['GetMealPlanResponse']['data']>, 'planStatus'> & {
  planStatus: PlanStatus;
};
type RawMealSlot = MealPlanDetail['slots'][number];
export type MealSlot = RawMealSlot & {
  swapCount?: number;
  swapHistories?: MealSlotSwapHistoryItem[];
  previousRecipe?: {
    recipeId: number;
    title: string;
    caloriesKcal: number;
    imageUrl?: string | null;
  } | null;
  notes?: string | null;
};
export type MealPlanEdits = MealPlanDetail['edits'];
export type BudgetTier = MealPlanDetail['budgetTier'];
export type DayOfWeek = MealSlot['dayOfWeek'];
export type MealType = MealSlot['mealType'];

/** GET /meal-plans (FN-MEAL-02). */
export type MealPlanListItem = Omit<DeepRequired<Schemas['ListMealPlansResponse']['data'][number]>, 'planStatus'> & {
  planStatus: PlanStatus;
};

/** POST /meal-plans (FN-MEAL-01). */
export type CreateMealPlanBody = Schemas['CreateMealPlanRequest'] & {
  durationDays?: number;
  numberOfDays?: number;
};

/** PUT /meal-plans/{id}/slots/{slotId} (FN-MEAL-03). */
export type SwapSlotBody = Schemas['UpdateMealPlanSlotRequest'] & {
  newRecipeId?: number;
  customNote?: string;
};
export type SwapReason = NonNullable<SwapSlotBody['swapReason']>;
export type SwapSlotResult = DeepRequired<Schemas['UpdateMealPlanSlotResponse']['data']>;

/** GET /meal-plans/slots/{slotId}/swap-history (FN-MEAL-03): Lịch sử đối chứng các lần đổi món của một bữa ăn. */
export interface MealSlotSwapHistoryItem {
  historyId: number;
  slotId: number;
  oldRecipeId: number;
  oldRecipeTitle: string;
  oldRecipeImageUrl?: string | null;
  oldRecipeCalories: number;
  oldRecipe?: {
    recipeId: number;
    title: string;
    caloriesKcal: number;
    imageUrl?: string | null;
  } | null;
  newRecipeId: number;
  newRecipeTitle: string;
  newRecipeImageUrl?: string | null;
  newRecipeCalories: number;
  newRecipe?: {
    recipeId: number;
    title: string;
    caloriesKcal: number;
    imageUrl?: string | null;
  } | null;
  swapReason?: string | null;
  caloriesDelta: number;
  swappedAt: string;
}

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
