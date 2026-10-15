import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toApiError } from '@/lib/apiError';
import {
  activateMealPlan,
  createMealPlan,
  getMealPlan,
  getMealPlanNutrition,
  listMealPlans,
  setMealSlotCompleted,
  swapMealSlot,
} from '../api/mealPlans.api';
import type { CreateMealPlanBody, MealPlanDetail, NutritionLevel, SwapSlotBody } from '../types/mealPlan.types';

export const mealPlanKeys = {
  all: ['meal-plans'] as const,
  lists: () => [...mealPlanKeys.all, 'list'] as const,
  list: (page: number) => [...mealPlanKeys.lists(), page] as const,
  detail: (planId: number) => [...mealPlanKeys.all, 'detail', planId] as const,
  nutrition: (planId: number) => [...mealPlanKeys.all, 'nutrition', planId] as const,
};

/** Không thử lại lỗi 4xx (404 không thuộc về bạn, 403 VIP...). */
const retryServerErrorsOnce = (failureCount: number, error: unknown) =>
  failureCount < 1 && toApiError(error).status >= 500;

export function useMealPlanList(page: number, size: number) {
  return useQuery({
    queryKey: mealPlanKeys.list(page),
    queryFn: () => listMealPlans({ page, size }),
    placeholderData: keepPreviousData,
    retry: retryServerErrorsOnce,
  });
}

export function useMealPlan(planId: number) {
  return useQuery({
    queryKey: mealPlanKeys.detail(planId),
    queryFn: () => getMealPlan(planId),
    enabled: Number.isInteger(planId) && planId > 0,
    retry: retryServerErrorsOnce,
  });
}

/** Calo theo ngày (BASIC) hoặc chi tiết so với mục tiêu (DETAILED, VIP). */
export function useMealPlanNutrition(planId: number, level: NutritionLevel, enabled: boolean) {
  return useQuery({
    queryKey: [...mealPlanKeys.nutrition(planId), level],
    queryFn: () => getMealPlanNutrition(planId, level),
    enabled,
    retry: retryServerErrorsOnce,
  });
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMealPlanBody) => createMealPlan(body),
    onSuccess: (res) => {
      queryClient.setQueryData(mealPlanKeys.detail(res.data.planId), res.data);
      void queryClient.invalidateQueries({ queryKey: mealPlanKeys.lists() });
    },
  });
}

export function useActivateMealPlan(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => activateMealPlan(planId),
    onSuccess: (res) => {
      queryClient.setQueryData<MealPlanDetail>(mealPlanKeys.detail(planId), (plan) =>
        plan ? { ...plan, planStatus: res.data.planStatus } : plan
      );
      // Thực đơn ACTIVE khác cùng tuần chuyển ARCHIVED: làm mới danh sách.
      void queryClient.invalidateQueries({ queryKey: mealPlanKeys.lists() });
    },
  });
}

/** Đổi món: thay bữa trong cache, cập nhật số lần chỉnh sửa còn lại của giai đoạn hiện tại, tính lại calo. */
export function useSwapMealSlot(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, body }: { slotId: number; body: SwapSlotBody }) => swapMealSlot(planId, slotId, body),
    onSuccess: (res) => {
      const { slot, swapsRemaining } = res.data;
      queryClient.setQueryData<MealPlanDetail>(mealPlanKeys.detail(planId), (plan) => {
        if (!plan) return plan;
        const edits =
          plan.planStatus === 'DRAFT'
            ? { ...plan.edits, preDeployUsed: plan.edits.preDeployLimit - swapsRemaining }
            : { ...plan.edits, postDeployUsed: plan.edits.postDeployLimit - swapsRemaining };
        return { ...plan, edits, slots: plan.slots.map((item) => (item.slotId === slot.slotId ? slot : item)) };
      });
      void queryClient.invalidateQueries({ queryKey: mealPlanKeys.nutrition(planId) });
    },
  });
}

/** Đánh dấu đã ăn: cập nhật ngay trên giao diện, lỗi thì trả lại như cũ. */
export function useCompleteMealSlot(planId: number) {
  const queryClient = useQueryClient();
  const key = mealPlanKeys.detail(planId);
  const setCompleted = (slotId: number, isCompleted: boolean) =>
    queryClient.setQueryData<MealPlanDetail>(key, (plan) =>
      plan
        ? { ...plan, slots: plan.slots.map((item) => (item.slotId === slotId ? { ...item, isCompleted } : item)) }
        : plan
    );

  return useMutation({
    mutationFn: ({ slotId, isCompleted }: { slotId: number; isCompleted: boolean }) =>
      setMealSlotCompleted(planId, slotId, isCompleted),
    onMutate: async ({ slotId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: key });
      setCompleted(slotId, isCompleted);
    },
    onError: (_error, { slotId, isCompleted }) => setCompleted(slotId, !isCompleted),
  });
}
