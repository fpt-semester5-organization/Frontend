/**
 * SCR-22 · meal-plans/MealPlan · `/meal-plans/:id`
 * FN: FN-MEAL-02 (xem, kích hoạt), FN-MEAL-03 (đổi món), FN-MEAL-04 (đã ăn), FN-MEAL-07 (calo),
 *     FN-MEAL-05 (tạo danh sách đi chợ), FN-MEAL-08 (xuất PDF - VIP).
 * Nguyễn Văn Minh Tâm · Sprint 6
 * Chuẩn hóa 100% theo bản mẫu Prototype & Stich AI UI Screen Spec (4 Thẻ KPI + Thanh Tab 7 ngày + 3 Bữa ăn lớn).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { VipUpsellDialog } from '@/components/common/VipUpsell';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { CreateShoppingListDialog } from '@/features/shopping-lists/components/CreateShoppingListDialog';
import { listIdOfPlan } from '@/features/shopping-lists/hooks/shoppingListLinks';
import { toApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useRecipe } from '@/features/recipes/hooks/useRecipes';
import { SwapMealDialog } from '../components/SwapMealDialog';
import { useExportPdf } from '../hooks/useExportPdf';
import {
  useActivateMealPlan,
  useCompleteMealSlot,
  useMealPlan,
  useMealPlanNutrition,
  useSwapMealSlot,
} from '../hooks/useMealPlans';
import { formatDate, getWeekdayFull, getWeekdayShort, todayInVietnam } from '../lib/dates';
import {
  DAYS,
  DAY_LABEL,
  MEAL_BADGE,
  MEAL_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
} from '../lib/labels';
import {
  dateOfDay,
  dayKcal,
  editsOfPhase,
  labelOfDay,
  progress,
  slotsByDay,
} from '../lib/plan.utils';
import type { DayOfWeek, MealSlot, NutritionLevel, SwapReason } from '../types/mealPlan.types';

const KPI_CARD =
  'flex flex-col justify-between rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card';
const BTN_ACTION =
  'inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-3.5 py-2 font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container-high disabled:opacity-60';

interface SlotSwapInfo {
  swapCount: number;
  previousRecipe?: {
    recipeId: number;
    title: string;
    caloriesKcal: number;
    imageUrl?: string;
  };
  originalRecipe?: {
    recipeId: number;
    title: string;
    caloriesKcal: number;
    imageUrl?: string;
  };
}

const MealPlanSlotCard: React.FC<{
  slot: MealSlot;
  swapInfo?: SlotSwapInfo;
  isActive: boolean;
  editable: boolean;
  completePending: boolean;
  onToggleComplete: () => void;
  onOpenSwap: () => void;
}> = ({ slot: s, swapInfo, isActive, editable, completePending, onToggleComplete, onOpenSwap }) => {
  // Kết nối API chi tiết món ăn (/recipes/{id}) qua useRecipe để số kcal, số tim, thời gian nấu
  // luôn 100% giống hệt khi bấm qua xem chi tiết công thức (RecipeDetail)
  const recipeQuery = useRecipe(s.recipe?.recipeId ?? 0);
  const detail = recipeQuery.data;

  const title = detail?.title ?? s.recipe?.title ?? 'Chưa có món';
  const imageUrl = detail?.imageUrl ?? s.recipe?.imageUrl;
  const caloriesKcal = detail?.caloriesKcal ?? s.recipe?.caloriesKcal ?? 0;
  const cookTimeMinutes = detail?.cookTimeMinutes ?? s.recipe?.cookTimeMinutes ?? 0;
  const voteCount = detail?.voteCount ?? s.recipe?.voteCount ?? 0;

  // Lấy lịch sử đổi món: ưu tiên từ API backend (s.swapCount, s.previousRecipe), fallback vào swapInfo
  const rawSlot = s as unknown as { swapCount?: number; previousRecipe?: SlotSwapInfo['previousRecipe'] };
  const swapCount = rawSlot.swapCount || swapInfo?.swapCount || 0;
  const previousRecipe = rawSlot.previousRecipe || swapInfo?.previousRecipe;

  const diffFromPrev = previousRecipe
    ? Math.round(caloriesKcal) - Math.round(previousRecipe.caloriesKcal)
    : 0;

  return (
    <article
      className={cn(
        'rounded-xl border border-surface-container-high bg-surface-container-lowest p-space-md shadow-card transition-all hover:shadow-md',
        s.isCompleted && 'bg-primary-fixed/20 border-primary-fixed'
      )}
    >
      <div className="flex flex-col justify-between gap-space-md sm:flex-row sm:items-start">
        <div className="flex gap-space-md flex-1 min-w-0">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-container sm:h-28 sm:w-28 shadow-inner">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-primary">
                <Icon name="restaurant" className="text-[28px]" />
              </span>
            )}
            <span className={cn('absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 font-label-sm text-xs font-semibold shadow-xs', MEAL_BADGE[s.mealType])}>
              {MEAL_LABEL[s.mealType]}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {s.isCompleted && (
                <span className="inline-flex items-center gap-0.5 rounded bg-surface-container px-2 py-0.5 font-label-sm text-xs font-semibold text-primary">
                  <Icon name="check" className="text-[13px]" />
                  Đã dùng
                </span>
              )}
              {swapCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed/70 px-2.5 py-0.5 font-label-sm text-xs font-semibold text-primary border border-primary/20">
                  <Icon name="history" className="text-[13px]" />
                  Đã đổi {swapCount} lần
                </span>
              )}
            </div>

            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {title}
            </h2>

            {/* Thông số sơ bộ: kcal, thời gian nấu, số tim — lấy trực tiếp từ API đồng bộ 100% với RecipeDetail */}
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-label-md text-label-md text-on-surface-variant">
              <span className="flex items-center gap-1 tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                <Icon name="local_fire_department" className="text-[18px] text-amber-600" />
                {formatNumber(Math.round(caloriesKcal))} kcal
              </span>
              <span className="flex items-center gap-1 tabular-nums">
                <Icon name="schedule" className="text-[18px] text-outline" />
                {cookTimeMinutes > 0 ? `${cookTimeMinutes} phút` : '20 phút'}
              </span>
              <span className="flex items-center gap-1 tabular-nums" title={`${formatNumber(voteCount)} lượt thích`}>
                <Icon name="favorite" filled className="text-[18px] text-secondary" />
                {formatNumber(voteCount)}
              </span>
            </div>

            {/* Thông tin công thức trước khi đổi và so sánh calo */}
            {swapCount > 0 && previousRecipe && (
              <div className="mt-2 rounded-lg bg-surface-container-low p-2.5 border border-surface-container text-xs text-on-surface-variant flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-on-surface">Món trước khi đổi:</span>
                  <Link
                    to={PATHS.RECIPES.DETAIL(previousRecipe.recipeId)}
                    className="font-semibold text-primary hover:underline"
                    title="Bấm để xem công thức trước khi đổi"
                  >
                    {previousRecipe.title}
                  </Link>
                  <span className="tabular-nums font-medium">({Math.round(previousRecipe.caloriesKcal)} kcal)</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 rounded px-2 py-0.5 font-semibold text-[11px] border',
                      diffFromPrev < 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        : diffFromPrev > 0
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-surface-container text-on-surface-variant border-surface-container-high'
                    )}
                  >
                    <Icon
                      name={diffFromPrev < 0 ? 'trending_down' : diffFromPrev > 0 ? 'trending_up' : 'check'}
                      className="text-[12px]"
                    />
                    {diffFromPrev < 0
                      ? `Ít hơn ${Math.abs(diffFromPrev)} kcal`
                      : diffFromPrev > 0
                      ? `Nhiều hơn ${diffFromPrev} kcal`
                      : 'Calo bằng nhau'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:self-start">
          {s.recipe && (
            <Link
              to={PATHS.RECIPES.DETAIL(s.recipe.recipeId)}
              className="rounded-lg bg-surface-container px-3.5 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
            >
              Xem công thức
            </Link>
          )}
          {isActive && (
            <button
              type="button"
              disabled={completePending}
              onClick={onToggleComplete}
              aria-pressed={s.isCompleted}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-3.5 py-2 font-label-md text-label-md transition-colors',
                s.isCompleted
                  ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              )}
            >
              <Icon name={s.isCompleted ? 'check_circle' : 'radio_button_unchecked'} className="text-[16px]" />
              {s.isCompleted ? 'Đã ăn' : 'Đánh dấu đã ăn'}
            </button>
          )}
          {editable && (
            <button
              type="button"
              onClick={onOpenSwap}
              className="inline-flex items-center gap-1 rounded-lg bg-primary-container px-3.5 py-2 font-label-md text-label-md text-on-primary transition-opacity hover:opacity-90"
            >
              <Icon name="swap_horiz" className="text-[16px]" />
              Đổi món
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

const NotFound: React.FC = () => (
  <EmptyState
    icon="search_off"
    title="Không tìm thấy thực đơn"
    description="Thực đơn không tồn tại hoặc không thuộc về bạn."
    action={
      <Link
        to={PATHS.MEAL_PLANS.ROOT}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-container px-4 py-2.5 font-label-md text-label-md text-on-primary no-underline transition-colors hover:bg-primary"
      >
        Về danh sách thực đơn
      </Link>
    }
  />
);

export const MealPlanDetail: React.FC = () => {
  const { id } = useParams();
  const planId = Number(id);
  const validId = Number.isInteger(planId) && planId > 0;
  const navigate = useNavigate();
  const isVip = useAuthStore((state) => state.user?.isVip ?? false);

  const plan = useMealPlan(planId);
  const [nutritionLevel, setNutritionLevel] = useState<NutritionLevel>(isVip ? 'DETAILED' : 'BASIC');
  const nutrition = useMealPlanNutrition(planId, nutritionLevel, !!plan.data);
  const activate = useActivateMealPlan(planId);
  const swap = useSwapMealSlot(planId);
  const complete = useCompleteMealSlot(planId);
  const exportPdf = useExportPdf(planId);

  const [day, setDay] = useState<DayOfWeek>('MON');
  const [confirmActivate, setConfirmActivate] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [upsell, setUpsell] = useState<{ title: string; message: string } | null>(null);
  const [swapSlot, setSwapSlot] = useState<MealSlot | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swappedAway, setSwappedAway] = useState<Record<number, number[]>>({});
  const [shoppingOpen, setShoppingOpen] = useState(false);

  const [swapHistories, setSwapHistories] = useState<Record<number, SlotSwapInfo>>(() => {
    try {
      const saved = sessionStorage.getItem(`veggielife_meal_swap_histories_${planId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(`veggielife_meal_swap_histories_${planId}`, JSON.stringify(swapHistories));
    } catch {
      // ignore
    }
  }, [swapHistories, planId]);

  // VIP hết hạn: DETAILED bị 403 ERR_VIP_REQUIRED thì chuyển về BASIC
  useEffect(() => {
    if (nutrition.error && toApiError(nutrition.error).errorCode === 'ERR_VIP_REQUIRED') {
      setNutritionLevel('BASIC');
    }
  }, [nutrition.error]);

  const data = plan.data;
  const byDay = useMemo(() => (data ? slotsByDay(data.slots) : null), [data]);

  // Mặc định chọn hôm nay nếu nằm trong tuần của thực đơn
  useEffect(() => {
    if (!data) return;
    const today = todayInVietnam();
    const hit = DAYS.find((d) => {
      const dt = dateOfDay(data.startDate, d);
      return dt === today;
    });
    if (hit) setDay(hit);
  }, [data?.planId, data?.startDate]);

  if (!validId) return <NotFound />;

  if (plan.isPending) {
    return (
      <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-[1280px] bg-surface-container-lowest pt-[72px]">
        <div className="flex flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin" role="status" aria-busy="true">
          <Skeleton className="h-10 w-1/3" />
          <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-16" />
          <div className="space-y-space-md">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (plan.isError || !data || !byDay) {
    if (toApiError(plan.error).status === 404) return <NotFound />;
    return (
      <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-[1280px] bg-surface-container-lowest pt-[72px]">
        <div className="px-margin-mobile py-space-lg sm:px-margin">
          <ErrorState error={plan.error} onRetry={() => plan.refetch()} retrying={plan.isRefetching} />
        </div>
      </main>
    );
  }

  const status = data.planStatus;
  const isDraft = status === 'DRAFT';
  const isActive = status === 'ACTIVE';
  const editable = isDraft || isActive;
  const edits = editsOfPhase(data);
  const editsLeft = Math.max(0, edits.limit - edits.used);
  const prog = progress(data);

  const nutDay = nutrition.data?.days.find((d) => d.dayOfWeek === day);
  const daySlots = byDay[day] ?? [];
  const dayTotal = dayKcal(daySlots);
  const weekTotal = dayKcal(data.slots);
  const avg = Math.round(weekTotal / 7);
  const hitPct = data.targetDailyKcal > 0 ? Math.round((avg / data.targetDailyKcal) * 100) : null;
  const today = todayInVietnam();
  const knownListId = listIdOfPlan(planId);

  const dayKcalOf = (d: DayOfWeek) => dayKcal(byDay[d] ?? []);

  const handleOpenShopping = () => {
    if (knownListId) {
      navigate(PATHS.SHOPPING_LISTS.DETAIL(knownListId));
      return;
    }
    if (!isActive) {
      setNotice({
        title: 'Cần kích hoạt thực đơn',
        message: 'Bạn cần kích hoạt thực đơn trước khi tạo danh sách đi chợ.',
      });
      return;
    }
    setShoppingOpen(true);
  };

  const isFuturePlan = data.startDate > today;
  const isExpiredPlan = data.endDate < today;

  const handleOpenActivate = () => {
    if (isFuturePlan) {
      setNotice({
        title: 'Chưa đến thời gian áp dụng',
        message: `Thực đơn này bắt đầu từ ${getWeekdayFull(data.startDate)}, ${formatDate(data.startDate)}. Bạn có thể đổi món tùy ý ngay bây giờ để chuẩn bị, và bấm Kích hoạt khi đến ngày bắt đầu.`,
      });
      return;
    }
    if (isExpiredPlan) {
      setNotice({
        title: 'Thực đơn đã hết hạn áp dụng',
        message: `Thực đơn này áp dụng cho tuần đã qua (${formatDate(data.startDate)} – ${formatDate(data.endDate)}) nên không thể kích hoạt. Bạn vui lòng tạo thực đơn mới.`,
      });
      return;
    }
    setConfirmActivate(true);
  };

  const runActivate = () => {
    activate.mutate(undefined, {
      onSuccess: (res) => {
        setConfirmActivate(false);
        notifySuccess(res.message || 'Đã kích hoạt thực đơn thành công.');
      },
      onError: (error) => {
        setConfirmActivate(false);
        const apiError = toApiError(error);
        if (apiError.status === 409) {
          setNotice({ title: 'Không kích hoạt được', message: getErrorMessage(apiError) });
        } else {
          notifyApiError(apiError);
        }
      },
    });
  };

  const runExport = () => {
    if (!isVip) {
      setUpsell({
        title: 'Xuất PDF dành cho thành viên VIP',
        message: 'Nâng cấp VIP để tải bản in PDF thực đơn tuần và danh sách đi chợ chuyên nghiệp.',
      });
      return;
    }
    exportPdf.mutate(knownListId ? 'PLAN,SHOPPING' : 'PLAN', {
      onSuccess: () => {
        notifySuccess('Đã tạo tệp PDF thành công.');
      },
      onError: (error) => {
        const apiError = toApiError(error);
        if (apiError.errorCode === 'ERR_VIP_REQUIRED') {
          setUpsell({ title: 'Xuất PDF dành cho VIP', message: getErrorMessage(apiError) });
        } else {
          notifyApiError(apiError);
        }
      },
    });
  };

  const openSwap = (slot: MealSlot) => {
    if (editsLeft <= 0) {
      const message = `Bạn đã dùng hết ${edits.limit} lần ${isDraft ? 'chỉnh sửa' : 'đổi món'} của thực đơn này.`;
      if (isVip) setNotice({ title: 'Hết lượt đổi món', message });
      else setUpsell({ title: 'Bạn đã dùng hết lượt đổi món', message });
      return;
    }
    setSwapError(null);
    setSwapSlot(slot);
  };

  const confirmSwap = (reason: SwapReason | null) => {
    if (!swapSlot) return;
    const { slotId } = swapSlot;
    const oldRecipe = swapSlot.recipe;
    const oldCalories = Math.round(oldRecipe.caloriesKcal);
    const excluded = [swapSlot.recipe.recipeId, ...(swappedAway[slotId] ?? [])];
    setSwapError(null);
    swap.mutate(
      { slotId, body: { ...(reason ? { swapReason: reason } : {}), excludedRecipeIds: excluded } },
      {
        onSuccess: (res) => {
          setSwappedAway((current) => ({ ...current, [slotId]: excluded }));
          setSwapSlot(null);
          const newRecipe = res.data.slot.recipe;
          const newCalories = Math.round(newRecipe.caloriesKcal);
          const diffKcal = newCalories - oldCalories;

          const slotFromRes = res.data.slot as unknown as { swapCount?: number; previousRecipe?: SlotSwapInfo['previousRecipe']; originalRecipe?: SlotSwapInfo['originalRecipe'] };
          setSwapHistories((current) => {
            const existing = current[slotId];
            const newCount = slotFromRes?.swapCount || (existing?.swapCount ?? 0) + 1;
            return {
              ...current,
              [slotId]: {
                swapCount: newCount,
                previousRecipe: slotFromRes?.previousRecipe ?? {
                  recipeId: oldRecipe.recipeId,
                  title: oldRecipe.title,
                  caloriesKcal: oldRecipe.caloriesKcal,
                  imageUrl: oldRecipe.imageUrl,
                },
                originalRecipe: slotFromRes?.originalRecipe ?? existing?.originalRecipe ?? {
                  recipeId: oldRecipe.recipeId,
                  title: oldRecipe.title,
                  caloriesKcal: oldRecipe.caloriesKcal,
                  imageUrl: oldRecipe.imageUrl,
                },
              },
            };
          });

          let diffMsg = '';
          if (diffKcal < 0) {
            diffMsg = `Món mới ít hơn ${Math.abs(diffKcal)} kcal so với món trước khi đổi (${newCalories} vs ${oldCalories} kcal).`;
          } else if (diffKcal > 0) {
            diffMsg = `Món mới nhiều hơn ${diffKcal} kcal so với món trước khi đổi (${newCalories} vs ${oldCalories} kcal).`;
          } else {
            diffMsg = `Món mới có cùng lượng calo với món trước khi đổi (${newCalories} kcal).`;
          }

          notifySuccess(`${res.message || 'Đã đổi món.'} Món mới: ${newRecipe.title}. ${diffMsg}`);
        },
        onError: (error) => {
          const apiError = toApiError(error);
          if (apiError.errorCode === 'ERR_QUOTA_MEAL_SWAP_EXCEEDED') {
            if (isVip) setSwapError(getErrorMessage(apiError));
            else setUpsell({ title: 'Hết lượt đổi món', message: getErrorMessage(apiError) });
          } else if (apiError.errorCode === 'ERR_MEAL_NO_SUBSTITUTE' || apiError.status === 422) {
            setSwapError(getErrorMessage(apiError));
          } else if (apiError.status === 409) {
            setSwapSlot(null);
            setNotice({ title: 'Không đổi được món', message: getErrorMessage(apiError) });
          } else {
            notifyApiError(apiError);
          }
        },
      }
    );
  };

  const toggleComplete = (slot: MealSlot) => {
    complete.mutate(
      { slotId: slot.slotId, isCompleted: !slot.isCompleted },
      {
        onError: (error) => {
          const apiError = toApiError(error);
          if (apiError.status === 409) setNotice({ title: 'Chưa thể đánh dấu', message: getErrorMessage(apiError) });
          else notifyApiError(apiError);
        },
      }
    );
  };

  return (
    <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-[1280px] bg-surface-container-lowest pt-[72px]">
      <div className="flex w-full flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin">
        {/* Navigation & Header Actions */}
        <section className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
          <div className="flex flex-col gap-1.5">
            <nav aria-label="Điều hướng" className="flex flex-wrap items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
              <Link to={PATHS.HOME} className="hover:text-primary">
                Trang chủ
              </Link>
              <span>/</span>
              <Link to={PATHS.MEAL_PLANS.ROOT} className="hover:text-primary">
                Thực đơn tuần
              </Link>
              <span>/</span>
              <span className="font-semibold text-on-surface">
                {formatDate(data.startDate)} – {formatDate(data.endDate)}
              </span>
            </nav>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg tracking-tight">
                {data.planName}
              </h1>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-xs font-semibold', STATUS_CLASS[status])}>
                {STATUS_LABEL[status]}
              </span>
              {data.generatedByAi && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-0.5 font-label-sm text-xs text-on-secondary-fixed-variant">
                  <Icon name="auto_awesome" className="text-[14px]" />
                  AI tạo
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isDraft && (
              <button
                type="button"
                onClick={handleOpenActivate}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-label-md text-label-md shadow-sm transition-all',
                  isFuturePlan
                    ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                    : 'bg-secondary text-on-secondary hover:opacity-95'
                )}
                title={isFuturePlan ? `Sẵn sàng kích hoạt từ ${getWeekdayFull(data.startDate)}, ${formatDate(data.startDate)}` : undefined}
              >
                <Icon name={isFuturePlan ? 'schedule' : 'rocket_launch'} className="text-[18px]" />
                {isFuturePlan ? `Kích hoạt (từ ${formatDate(data.startDate)})` : 'Kích hoạt thực đơn'}
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenShopping}
              className={BTN_ACTION}
            >
              <Icon name="shopping_basket" className="text-[18px] text-secondary" />
              Đi chợ
            </button>
            <button
              type="button"
              onClick={runExport}
              disabled={exportPdf.isPending}
              className={BTN_ACTION}
            >
              <Icon name="picture_as_pdf" className="text-[18px] text-on-surface-variant" />
              {exportPdf.isPending ? 'Đang tạo PDF…' : isVip ? 'Xuất PDF' : 'Xuất PDF (VIP)'}
            </button>
            <Link
              to={PATHS.MEAL_PLANS.NEW}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md text-on-primary shadow-sm hover:opacity-95 transition-opacity"
            >
              <Icon name="auto_awesome" className="text-[18px]" />
              Sinh thực đơn AI
            </Link>
          </div>
        </section>

        {/* Draft Notice Alert */}
        {isDraft && (
          <FormAlert
            tone="info"
            title={isFuturePlan ? `Bản nháp kế hoạch (${formatDate(data.startDate)} – ${formatDate(data.endDate)})` : 'Đây là bản nháp thực đơn'}
          >
            {isFuturePlan ? (
              <p>
                Bạn có tối đa <strong>{data.edits.preDeployLimit} lượt đổi món</strong> để chuẩn bị thực đơn.
                Hệ thống sẽ mở quyền kích hoạt khi đến ngày áp dụng (từ <strong>{getWeekdayFull(data.startDate)}, {formatDate(data.startDate)}</strong>).
              </p>
            ) : (
              <p>
                Chỉnh sửa tối đa <strong>{data.edits.preDeployLimit} lần</strong> trước khi kích hoạt. Hãy đổi món ưng ý rồi
                nhấn <strong>Kích hoạt thực đơn</strong> để bắt đầu theo dõi bữa ăn và đi chợ.
              </p>
            )}
          </FormAlert>
        )}

        {/* 4 Thẻ KPI Chỉ số thực đơn */}
        <section className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4" aria-label="Chỉ số thực đơn">
          <div className={KPI_CARD}>
            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span>MỤC TIÊU NĂNG LƯỢNG</span>
              <Icon name="bolt" className="text-[20px] text-primary" />
            </div>
            <div className="my-2 font-headline-md text-headline-md font-bold text-on-surface">
              {formatNumber(Math.round(data.targetDailyKcal))}{' '}
              <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">kcal / ngày</span>
            </div>
          </div>

          <div className={KPI_CARD}>
            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span>TRUNG BÌNH THỰC ĐƠN</span>
              <Icon name="verified" className="text-[20px] text-secondary" />
            </div>
            <div className="my-2">
              <div className="font-headline-md text-headline-md font-bold text-primary">
                {formatNumber(avg)}{' '}
                <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">kcal / ngày</span>
              </div>
              {hitPct !== null && (
                <div className="font-body-sm text-body-sm text-on-surface-variant">{hitPct}% so với mục tiêu</div>
              )}
            </div>
          </div>

          <div className={KPI_CARD}>
            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span>HẠN MỨC ĐỔI MÓN</span>
              <Icon name="swap_horizontal_circle" className="text-[20px] text-on-surface-variant" />
            </div>
            <div className="my-2 font-headline-md text-headline-md font-bold text-on-surface">
              {editsLeft}{' '}
              <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">
                / {edits.limit} lượt còn lại ({edits.phase})
              </span>
            </div>
          </div>

          <div className={KPI_CARD}>
            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span>TIẾN ĐỘ TUẦN</span>
              <Icon name="task_alt" className="text-[20px] text-secondary" />
            </div>
            <div className="my-1.5 font-headline-md text-headline-md font-bold text-on-surface">
              {prog.done}{' '}
              <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">
                / {prog.total} bữa đã ăn
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container"
              role="progressbar"
              aria-valuenow={prog.done}
              aria-valuemax={prog.total}
              aria-label="Tiến độ bữa đã ăn"
            >
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${prog.pct}%` }} />
            </div>
          </div>
        </section>

        {/* Thanh Tab 7 ngày */}
        <section className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-1.5 shadow-sm" aria-label="Chọn ngày">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7" role="tablist">
            {DAYS.map((d) => {
              const dt = dateOfDay(data.startDate, d);
              const isToday = dt === today;
              const active = d === day;
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDay(d)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg px-2 py-2.5 transition-all',
                    active
                      ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                      : 'border border-surface-container-high bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                  )}
                >
                  <span className={cn('font-label-sm text-label-sm', !active && 'text-on-surface-variant')}>
                    {isToday ? 'Hôm nay' : labelOfDay(data.startDate, d)}
                  </span>
                  <span className="font-headline-sm text-headline-sm font-bold">{getWeekdayShort(dt)}</span>
                  <span className={cn('mt-0.5 font-body-sm text-body-sm', active ? 'text-primary-fixed' : 'text-on-surface-variant')}>
                    {formatNumber(dayKcalOf(d))} kcal
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Danh sách 3 bữa ăn của ngày đang chọn */}
        <section className="flex flex-col gap-space-md" aria-label={`Các bữa ${getWeekdayFull(dateOfDay(data.startDate, day))}`}>
          <div className="flex items-center justify-between rounded-xl bg-surface-container px-space-md py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Icon name="calendar_today" className="text-[20px] text-primary" />
              <span className="font-headline-sm text-headline-sm text-on-surface">
                {getWeekdayFull(dateOfDay(data.startDate, day))}, {labelOfDay(data.startDate, day)}
              </span>
            </div>
            <div className="flex items-center gap-4 font-label-md text-label-md text-on-surface-variant">
              <span>
                Tổng calo: <strong className="text-on-surface font-bold">{formatNumber(dayTotal)} kcal</strong>
              </span>
              {isVip && data.targetDailyKcal > 0 && (
                <span className={dayTotal - data.targetDailyKcal > 0 ? 'text-secondary font-medium' : 'text-primary font-medium'}>
                  {dayTotal - data.targetDailyKcal > 0 ? '+' : ''}
                  {Math.round(dayTotal - data.targetDailyKcal)} so với mục tiêu ({formatNumber(Math.round(data.targetDailyKcal))} kcal)
                </span>
              )}
            </div>
          </div>

          {!isVip && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3 border border-surface-container"
              role="note"
            >
              <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                <Icon name="lock" className="text-[18px] text-secondary" />
                Phân tích dinh dưỡng chuyên sâu và xuất thực đơn PDF dành cho thành viên VIP.
              </span>
              <Link
                to={PATHS.SUBSCRIPTION.PRICING}
                className="rounded-lg bg-secondary px-3 py-1.5 font-label-md text-label-md text-on-secondary hover:opacity-90"
              >
                Nâng cấp VIP
              </Link>
            </div>
          )}

          {daySlots.length === 0 ? (
            <p className="rounded-xl bg-surface-container-low p-space-md font-body-md text-body-md text-on-surface-variant" role="status">
              Ngày này chưa có bữa nào.
            </p>
          ) : (
            daySlots.map((s) => (
              <MealPlanSlotCard
                key={s.slotId}
                slot={s}
                swapInfo={swapHistories[s.slotId]}
                isActive={isActive}
                editable={editable}
                completePending={complete.isPending}
                onToggleComplete={() => toggleComplete(s)}
                onOpenSwap={() => openSwap(s)}
              />
            ))
          )}
        </section>
      </div>

      {/* Swap Modal */}
      <SwapMealDialog
        key={swapSlot?.slotId ?? 'none'}
        slot={swapSlot}
        remaining={editsLeft}
        limit={edits.limit}
        swapCount={(swapSlot as unknown as { swapCount?: number })?.swapCount || swapHistories[swapSlot?.slotId ?? 0]?.swapCount}
        previousRecipe={(swapSlot as unknown as { previousRecipe?: SlotSwapInfo['previousRecipe'] })?.previousRecipe || swapHistories[swapSlot?.slotId ?? 0]?.previousRecipe}
        submitting={swap.isPending}
        error={swapError}
        onCancel={() => setSwapSlot(null)}
        onConfirm={confirmSwap}
      />

      {/* Confirm Activate Dialog */}
      <ConfirmDialog
        show={confirmActivate}
        title="Kích hoạt thực đơn?"
        message={
          <>
            Sau khi kích hoạt, bạn có thể đánh dấu bữa đã ăn và tạo danh sách đi chợ; việc đổi món chuyển sang hạn mức{' '}
            <strong>{data.edits.postDeployLimit} lượt</strong> của giai đoạn áp dụng.
          </>
        }
        confirmLabel={activate.isPending ? 'Đang kích hoạt…' : 'Kích hoạt'}
        loading={activate.isPending}
        onConfirm={runActivate}
        onCancel={() => setConfirmActivate(false)}
      />

      {/* Notice Info Modal */}
      <Modal show={notice !== null} onHide={() => setNotice(null)} title={notice?.title} size="sm">
        <div className="flex flex-col gap-space-md p-space-lg">
          <p className="font-body-md text-body-md text-on-surface-variant">{notice?.message}</p>
          <div className="flex justify-end">
            <Button onClick={() => setNotice(null)}>Đã hiểu</Button>
          </div>
        </div>
      </Modal>

      {/* VIP Upsell Dialog */}
      <VipUpsellDialog
        show={upsell !== null}
        onHide={() => setUpsell(null)}
        title={upsell?.title ?? ''}
        message={upsell?.message}
      />

      {/* Create Shopping List Dialog */}
      {isActive && (
        <CreateShoppingListDialog planId={planId} show={shoppingOpen} onHide={() => setShoppingOpen(false)} />
      )}
    </main>
  );
};

export default MealPlanDetail;
