/**
 * SCR-22 · meal-plans/MealPlan · `/meal-plans/:id`
 * FN: FN-MEAL-02 (xem, kích hoạt), FN-MEAL-03 (đổi món), FN-MEAL-04 (đã ăn), FN-MEAL-07 (calo),
 *     FN-MEAL-05 (tạo danh sách đi chợ), FN-MEAL-08 (xuất PDF - VIP).
 * Nguyễn Văn Minh Tâm · Sprint 6
 * Cập nhật:
 * - Tiêu đề dạng: “Thực đơn từ Thứ [X] DD/MM/YYYY đến Thứ [Y] DD/MM/YYYY (N ngày)”
 * - Mỗi ngày là một thẻ (card) hiển thị Thứ + ngày/tháng (ví dụ: Thứ Ba, 04/11), đúng thứ theo lịch thật
 * - Thanh trên cùng có ô search (icon kính lúp) debounce 300ms tìm theo tên món và dropdown kết quả
 * - Tự tìm món trong database để thay thế món bất kỳ
 * - Đổi món: gợi ý theo lý do (backend tự động lấy) hoặc ghi chú cho AI (backend gọi AI)
 * - Khối lưu ý & "Context AI đã hiểu" với các chip/tag có thể sửa, xoá, thêm và bấm "Áp dụng lưu ý"
 * - Danh sách đi chợ theo số ngày và số món thực tế đã tạo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import type { RecipeListItem } from '@/features/recipes/types/recipe.types';
import { SwapMealDialog } from '../components/SwapMealDialog';
import { SwapHistoryModal } from '../components/SwapHistoryModal';
import { DishSearchModal } from '../components/DishSearchModal';
import {
  AiParsedChip,
  parseRawNoteToChips,
} from '../lib/aiContextParser';
import { useExportPdf } from '../hooks/useExportPdf';
import {
  useActivateMealPlan,
  useCancelMealPlan,
  useCompleteMealSlot,
  useMealPlan,
  useMealPlanNutrition,
  useSwapMealSlot,
  useSwapMealSlotByNote,
} from '../hooks/useMealPlans';
import {
  addDays,
  formatDate,
  formatDayCardHeader,
  formatMealPlanTitle,
  getCalendarDays,
  getWeekdayFull,
  getWeekdayShort,
  todayInVietnam,
} from '../lib/dates';
import {
  DAYS,
  DAY_LABEL,
  MEAL_BADGE,
  MEAL_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
} from '../lib/labels';
import {
  dayKcal,
  editsOfPhase,
  progress,
} from '../lib/plan.utils';
import type { DayOfWeek, MealSlot, NutritionLevel, SwapReason } from '../types/mealPlan.types';

const KPI_CARD =
  'flex flex-col justify-between rounded-2xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card';
const BTN_ACTION =
  'inline-flex items-center gap-1.5 rounded-xl bg-surface-container px-3.5 py-2 font-label-md text-label-md text-on-surface shadow-xs transition-colors hover:bg-surface-container-high disabled:opacity-60';

export interface SwappedRecipeHistoryItem {
  recipeId: number;
  title: string;
  caloriesKcal: number;
  imageUrl?: string;
  swapReason?: string;
  caloriesDelta?: number;
  swappedAt?: string;
  diffFromCurrent?: number;
}

export interface SlotSwapInfo {
  swapCount: number;
  history?: SwappedRecipeHistoryItem[];
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
  slotNote?: string;
  isActive: boolean;
  editable: boolean;
  completePending: boolean;
  onToggleComplete: () => void;
  onOpenSwap: () => void;
  onOpenSearchDb?: () => void;
  onOpenHistory?: () => void;
  planId: number;
  currentDay: DayOfWeek;
}> = ({
  slot: s,
  swapInfo,
  slotNote,
  isActive,
  editable,
  completePending,
  onToggleComplete,
  onOpenSwap,
  onOpenHistory,
  planId,
  currentDay,
}) => {
  const recipeQuery = useRecipe(s.recipe?.recipeId ?? 0);
  const detail = recipeQuery.data;

  const title = detail?.title ?? s.recipe?.title ?? 'Chưa có món';
  const imageUrl = detail?.imageUrl ?? s.recipe?.imageUrl;
  const caloriesKcal = detail?.caloriesKcal ?? s.recipe?.caloriesKcal ?? 0;
  const cookTimeMinutes = detail?.cookTimeMinutes ?? s.recipe?.cookTimeMinutes ?? 0;
  const voteCount = detail?.voteCount ?? s.recipe?.voteCount ?? 0;

  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  const rawSlot = s as unknown as {
    swapCount?: number;
    previousRecipe?: SlotSwapInfo['previousRecipe'];
    swapHistories?: Array<{
      historyId?: number;
      oldRecipeId?: number;
      oldRecipeTitle?: string;
      oldRecipeCalories?: number;
      oldRecipeImageUrl?: string;
      caloriesDelta?: number;
      swapReason?: string;
      swappedAt?: string;
    }>;
  };
  const swapCount = rawSlot.swapCount || swapInfo?.swapCount || 0;
  const previousRecipe = rawSlot.previousRecipe || swapInfo?.previousRecipe;

  // Thu thập toàn bộ lịch sử các món đã đổi trước đó (mới nhất trước)
  const fullHistoryList = useMemo(() => {
    if (rawSlot.swapHistories && rawSlot.swapHistories.length > 0) {
      return rawSlot.swapHistories.map((h) => ({
        recipeId: h.oldRecipeId ?? 0,
        title: h.oldRecipeTitle ?? 'Món cũ',
        caloriesKcal: h.oldRecipeCalories ?? 0,
        imageUrl: h.oldRecipeImageUrl,
        swapReason: h.swapReason,
        diffFromCurrent: Math.round(caloriesKcal) - Math.round(h.oldRecipeCalories ?? 0),
        swappedAt: h.swappedAt,
      }));
    }
    if (swapInfo?.history && swapInfo.history.length > 0) {
      return swapInfo.history.map((h) => ({
        ...h,
        diffFromCurrent: Math.round(caloriesKcal) - Math.round(h.caloriesKcal),
      }));
    }
    if (previousRecipe) {
      return [
        {
          recipeId: previousRecipe.recipeId,
          title: previousRecipe.title,
          caloriesKcal: previousRecipe.caloriesKcal,
          imageUrl: previousRecipe.imageUrl,
          diffFromCurrent: Math.round(caloriesKcal) - Math.round(previousRecipe.caloriesKcal),
        },
      ];
    }
    return [];
  }, [rawSlot.swapHistories, swapInfo?.history, previousRecipe, caloriesKcal]);

  return (
    <article
      className={cn(
        'rounded-2xl border border-surface-container-high bg-surface-container-lowest p-space-md shadow-card transition-all hover:shadow-md',
        s.isCompleted && 'bg-primary-fixed/20 border-primary-fixed'
      )}
    >
      <div className="flex flex-col justify-between gap-space-md sm:flex-row sm:items-start">
        <div className="flex gap-space-md flex-1 min-w-0 items-stretch">
          <div className="relative w-28 shrink-0 overflow-hidden rounded-xl bg-surface-container shadow-inner self-stretch min-h-[104px] sm:w-36 sm:min-h-[120px]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex h-full w-full items-center justify-center text-primary">
                <Icon name="restaurant" className="text-[28px]" />
              </span>
            )}
            <span
              className={cn(
                'absolute left-1.5 top-1.5 z-10 rounded-md px-2 py-0.5 font-label-sm text-xs font-bold shadow-xs',
                MEAL_BADGE[s.mealType]
              )}
            >
              {MEAL_LABEL[s.mealType]}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {s.isCompleted && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-fixed text-on-primary-fixed px-2.5 py-0.5 font-label-sm text-xs font-semibold">
                  <Icon name="check" className="text-[13px]" />
                  Đã dùng
                </span>
              )}
              {swapCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenHistory}
                  title="Bấm để xem lại món trước đó và đối chứng calo, lý do đổi"
                  aria-label={`Xem lại món trước đó: Đã đổi ${swapCount === 1 ? '1 lần' : `${swapCount} lần`}`}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-fixed text-on-primary-fixed px-2.5 py-0.5 font-label-sm text-xs font-semibold border border-primary/30 transition-all hover:bg-primary-fixed-dim hover:shadow-2xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                >
                  <Icon name="history" className="text-[13px]" />
                  <span>{swapCount === 1 ? 'Đã đổi 1 lần' : `Đã đổi ${swapCount} lần`}</span>
                  <Icon name="open_in_new" className="text-[11px] opacity-80" />
                </button>
              )}
            </div>

            <h2 className="font-headline-sm font-serif text-headline-sm font-bold text-on-surface">
              {title}
            </h2>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-label-md text-label-md text-on-surface-variant">
              <span className="flex items-center gap-1 tabular-nums font-semibold text-secondary">
                <Icon name="local_fire_department" className="text-[18px] text-secondary" />
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

            {/* Lưu ý riêng cho món này nếu có */}
            {slotNote && (
              <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-primary-fixed/40 border border-primary/20 px-3 py-2 text-xs text-on-surface">
                <Icon name="sticky_note_2" className="text-[16px] text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-primary mr-1">Lưu ý riêng cho món này:</span>
                  <span className="text-on-surface font-medium">{slotNote}</span>
                </div>
              </div>
            )}

            {/* Thanh xem lại món trước đó & đối chứng */}
            {swapCount > 0 && (
              <div className="mt-2.5 flex items-center justify-between rounded-xl border border-surface-container bg-surface-container-low px-3 py-2 text-xs">
                <div className="flex items-center gap-1.5 text-on-surface-variant min-w-0">
                  <Icon name="history" className="text-[15px] text-primary shrink-0" />
                  <span className="truncate">
                    Món đã đổi {swapCount === 1 ? '1 lần' : `${swapCount} lần`}
                    {fullHistoryList[0] ? ` (trước đó: ${fullHistoryList[0].title})` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer shrink-0 ml-2"
                >
                  <span>Chi tiết món cũ</span>
                  <Icon name="arrow_forward" className="text-[14px]" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:self-start">
          {s.recipe && (
            <Link
              to={PATHS.RECIPES.DETAIL(s.recipe.recipeId)}
              state={{ fromPlanId: planId, fromDay: currentDay }}
              className="rounded-lg bg-surface-container px-3.5 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
            >
              Công thức
            </Link>
          )}

          {isActive && (
            <button
              type="button"
              disabled={completePending}
              onClick={onToggleComplete}
              aria-pressed={s.isCompleted}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-3.5 py-2 font-label-md text-label-md transition-all',
                s.isCompleted
                  ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              )}
            >
              <Icon name={s.isCompleted ? 'check_circle' : 'radio_button_unchecked'} className="text-[16px]" />
              {s.isCompleted ? 'Đã dùng' : 'Đánh dấu đã ăn'}
            </button>
          )}

          {editable && (
            <button
              type="button"
              onClick={onOpenSwap}
              className="inline-flex items-center gap-1 rounded-lg bg-primary-container px-3.5 py-2 font-label-md text-label-md text-on-primary shadow-xs transition-opacity hover:opacity-95"
              title="Đổi món theo gợi ý hoặc ghi chú AI"
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
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-container px-4 py-2.5 font-label-md text-label-md text-on-primary no-underline transition-colors hover:bg-primary shadow-sm"
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

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(PATHS.MEAL_PLANS.ROOT);
    }
  };

  const plan = useMealPlan(planId);
  const [nutritionLevel, setNutritionLevel] = useState<NutritionLevel>(isVip ? 'DETAILED' : 'BASIC');
  const nutrition = useMealPlanNutrition(planId, nutritionLevel, !!plan.data);
  const activate = useActivateMealPlan(planId);
  const cancel = useCancelMealPlan(planId);
  const swap = useSwapMealSlot(planId);
  const swapByNote = useSwapMealSlotByNote(planId);
  const complete = useCompleteMealSlot(planId);
  const exportPdf = useExportPdf(planId);

  const [searchParams, setSearchParams] = useSearchParams();
  const paramDay = searchParams.get('day');
  const sessionDayKey = `veggielife_meal_plan_day_${planId}`;

  // Trạng thái ngày đang chọn
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [selectedDayCode, setSelectedDayCode] = useState<DayOfWeek>('MON');

  // Trạng thái tìm kiếm & đổi món
  const [swapSlot, setSwapSlot] = useState<MealSlot | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swappedAway, setSwappedAway] = useState<Record<number, number[]>>({});
  const [dishSearchModalOpen, setDishSearchModalOpen] = useState<boolean>(false);
  const [searchTargetSlot, setSearchTargetSlot] = useState<MealSlot | null>(null);
  const [historySlot, setHistorySlot] = useState<MealSlot | null>(null);

  // Context AI ban đầu của thực đơn (chỉ xem, không sửa context tổng tại đây)
  const [aiChips, setAiChips] = useState<AiParsedChip[]>([]);

  // Dialogs
  const [confirmActivate, setConfirmActivate] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [upsell, setUpsell] = useState<{ title: string; message: string } | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);

  const handleConfirmCancel = () => {
    cancel.mutate(undefined, {
      onSuccess: () => {
        setShowCancelModal(false);
        notifySuccess('Đã hủy thực đơn thành công. Trạng thái thực đơn đã chuyển sang Đã hủy.');
      },
      onError: (err) => {
        const apiError = toApiError(err);
        setShowCancelModal(false);
        if (apiError.status === 409) {
          setNotice({ title: 'Không thể hủy thực đơn', message: 'Thực đơn này đã ở trạng thái đã hủy trước đó.' });
        } else {
          notifyApiError(apiError);
        }
      },
    });
  };

  // Lưu ý riêng cho từng món ăn (theo slotId)
  const [slotNotes, setSlotNotes] = useState<Record<number, string>>(() => {
    try {
      const saved = sessionStorage.getItem(`veggielife_meal_slot_notes_${planId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(`veggielife_meal_slot_notes_${planId}`, JSON.stringify(slotNotes));
    } catch {
      // ignore
    }
  }, [slotNotes, planId]);

  // Lịch sử đổi món lưu trong sessionStorage
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

  // Đồng bộ tiêu chí AI từ customInstructions khi dữ liệu thực đơn tải xong
  useEffect(() => {
    if (plan.data?.customInstructions) {
      setAiChips(parseRawNoteToChips(plan.data.customInstructions));
    }
  }, [plan.data?.customInstructions]);

  const data = plan.data;

  // Tính toán số ngày thực tế trong kế hoạch
  const totalDays = useMemo(() => {
    if (!data?.startDate) return 7;
    if (data.endDate) {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      const diff = Math.round((end - start) / (24 * 3600 * 1000)) + 1;
      if (diff > 0) return diff;
    }
    // Hoặc tính từ số lượng slot (mỗi ngày 3 bữa)
    if (data.slots && data.slots.length > 0) {
      return Math.max(1, Math.ceil(data.slots.length / 3));
    }
    return 7;
  }, [data?.startDate, data?.endDate, data?.slots]);

  // Tạo danh sách các ngày thực tế theo lịch thật
  const calendarDays = useMemo(() => {
    if (!data?.startDate) return [];
    return getCalendarDays(data.startDate, totalDays);
  }, [data?.startDate, totalDays]);

  // Tiêu đề chuẩn theo yêu cầu: "Thực đơn từ Thứ Hai 03/11/2026 đến Chủ Nhật 09/11/2026 (7 ngày)"
  const dynamicPlanTitle = useMemo(() => {
    if (!data?.startDate) return data?.planName ?? 'Thực đơn dinh dưỡng';
    return formatMealPlanTitle(data.startDate, totalDays);
  }, [data?.startDate, totalDays, data?.planName]);

  // Lấy các slot của ngày đang chọn
  const daySlots = useMemo(() => {
    if (!data?.slots) return [];
    // Nếu số ngày <= 7, có thể khớp theo dayOfWeek
    if (totalDays <= 7 && DAYS.includes(selectedDayCode)) {
      const match = data.slots.filter((s) => s.dayOfWeek === selectedDayCode);
      if (match.length > 0) return match;
    }
    // Fallback hoặc kế hoạch nhiều ngày: chia theo index ngày (3 bữa / ngày)
    const startIndex = selectedDayIndex * 3;
    const sliced = data.slots.slice(startIndex, startIndex + 3);
    return sliced.length > 0 ? sliced : data.slots.filter((s) => s.dayOfWeek === selectedDayCode);
  }, [data?.slots, selectedDayIndex, selectedDayCode, totalDays]);

  // Đồng bộ chọn ngày
  const handleSelectCalendarDay = (dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    const dayItem = calendarDays[dayIndex];
    if (dayItem) {
      setSelectedDayCode(dayItem.dayOfWeek);
      try {
        sessionStorage.setItem(sessionDayKey, String(dayIndex));
      } catch {
        // ignore
      }
    }
  };

  if (!validId) return <NotFound />;

  if (plan.isPending) {
    return (
      <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-[1280px] bg-background">
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

  if (plan.isError || !data) {
    if (toApiError(plan.error).status === 404) return <NotFound />;
    return (
      <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-[1280px] bg-background">
        <div className="px-margin-mobile py-space-lg sm:px-margin">
          <ErrorState error={plan.error} onRetry={() => plan.refetch()} retrying={plan.isRefetching} />
        </div>
      </main>
    );
  }

  const status = data.planStatus;
  const isDraft = status === 'DRAFT';
  const isActive = status === 'ACTIVE';
  const isCancelled = status === 'CANCELLED';
  const editable = (isDraft || isActive) && !isCancelled;
  const edits = editsOfPhase(data);
  const editsLeft = Math.max(0, edits.limit - edits.used);
  const prog = progress(data);

  const dayTotal = dayKcal(daySlots);
  const weekTotal = dayKcal(data.slots);
  const avg = Math.round(weekTotal / Math.max(1, totalDays));
  const hitPct = data.targetDailyKcal > 0 ? Math.round((avg / data.targetDailyKcal) * 100) : null;
  const today = todayInVietnam();
  const knownListId = listIdOfPlan(planId);

  const isFuturePlan = data.startDate > today;
  const isExpiredPlan = data.endDate && data.endDate < today;

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
        message: `Thực đơn này áp dụng cho thời gian đã qua (${formatDate(data.startDate)} – ${formatDate(data.endDate)}) nên không thể kích hoạt. Bạn vui lòng tạo thực đơn mới.`,
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
        message: 'Nâng cấp VIP để tải bản in PDF thực đơn và danh sách đi chợ chuyên nghiệp.',
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

  const openSearchDbModal = (slot: MealSlot) => {
    if (editsLeft <= 0) {
      const message = `Bạn đã dùng hết ${edits.limit} lần ${isDraft ? 'chỉnh sửa' : 'đổi món'} của thực đơn này.`;
      if (isVip) setNotice({ title: 'Hết lượt đổi món', message });
      else setUpsell({ title: 'Bạn đã dùng hết lượt đổi món', message });
      return;
    }
    setSearchTargetSlot(slot);
    setDishSearchModalOpen(true);
  };

  // Xác nhận đổi món (hỗ trợ cả 3 modality: Lý do, Lưu ý riêng cho món, Chọn món DB)
  const confirmSwap = (reason: SwapReason | null, customNote?: string, newRecipeId?: number) => {
    if (!swapSlot) return;
    const { slotId } = swapSlot;
    const oldRecipe = swapSlot.recipe;
    const oldCalories = Math.round(oldRecipe?.caloriesKcal ?? 0);
    const excluded = [swapSlot.recipe?.recipeId ?? 0, ...(swappedAway[slotId] ?? [])];
    setSwapError(null);

    // Lưu ghi chú dành riêng cho món ăn này
    if (customNote) {
      setSlotNotes((prev) => ({
        ...prev,
        [slotId]: customNote,
      }));
    }

    swap.mutate(
      {
        slotId,
        body: {
          ...(reason ? { swapReason: reason } : {}),
          ...(customNote ? { customNote } : {}),
          ...(newRecipeId ? { newRecipeId } : {}),
          excludedRecipeIds: excluded,
        },
      },
      {
        onSuccess: (res) => {
          setSwappedAway((current) => ({ ...current, [slotId]: excluded }));
          setSwapSlot(null);
          const newRecipe = res.data.slot.recipe;
          const newCalories = Math.round(newRecipe?.caloriesKcal ?? 0);
          const diffKcal = newCalories - oldCalories;

          const slotFromRes = res.data.slot as unknown as {
            swapCount?: number;
            previousRecipe?: SlotSwapInfo['previousRecipe'];
            originalRecipe?: SlotSwapInfo['originalRecipe'];
            swapHistories?: Array<{
              oldRecipeId?: number;
              oldRecipeTitle?: string;
              oldRecipeCalories?: number;
              oldRecipeImageUrl?: string;
            }>;
          };
          setSwapHistories((current) => {
            const existing = current[slotId] || { swapCount: 0, history: [] };
            const newCount = slotFromRes?.swapCount || (existing.swapCount ?? 0) + 1;
            const updatedHistory = [
              {
                recipeId: oldRecipe.recipeId,
                title: oldRecipe.title,
                caloriesKcal: oldRecipe.caloriesKcal,
                imageUrl: oldRecipe.imageUrl,
              },
              ...(existing.history ?? []),
            ];
            return {
              ...current,
              [slotId]: {
                swapCount: newCount,
                history: updatedHistory,
                previousRecipe: {
                  recipeId: oldRecipe.recipeId,
                  title: oldRecipe.title,
                  caloriesKcal: oldRecipe.caloriesKcal,
                  imageUrl: oldRecipe.imageUrl,
                },
                originalRecipe: existing.originalRecipe ?? {
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
            diffMsg = `Món mới ít hơn ${Math.abs(diffKcal)} kcal so với món trước (${newCalories} vs ${oldCalories} kcal).`;
          } else if (diffKcal > 0) {
            diffMsg = `Món mới nhiều hơn ${diffKcal} kcal so với món trước (${newCalories} vs ${oldCalories} kcal).`;
          } else {
            diffMsg = `Món mới có cùng lượng calo với món trước (${newCalories} kcal).`;
          }

          notifySuccess(`${res.message || 'Đã đổi món thành công.'} Món mới: ${newRecipe.title}. ${diffMsg}`);
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

  // Thay thế slot bằng món chọn trực tiếp từ Search Widget / Modal
  const handleReplaceSlotWithDish = (slotId: number, recipe: RecipeListItem) => {
    if (editsLeft <= 0) {
      const message = `Bạn đã dùng hết ${edits.limit} lần ${isDraft ? 'chỉnh sửa' : 'đổi món'} của thực đơn này.`;
      if (isVip) setNotice({ title: 'Hết lượt đổi món', message });
      else setUpsell({ title: 'Bạn đã dùng hết lượt đổi món', message });
      return;
    }

    swap.mutate(
      {
        slotId,
        body: {
          newRecipeId: recipe.recipeId,
        },
      },
      {
        onSuccess: (res) => {
          notifySuccess(`Đã thay thế bữa ăn bằng món: ${recipe.title}.`);
        },
        onError: (err) => {
          notifyApiError(err);
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


  const currentDayItem = calendarDays[selectedDayIndex] || calendarDays[0];

  return (
    <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-[1280px] bg-background">
      <div className="flex w-full flex-col gap-space-lg px-margin-mobile pt-6 pb-space-lg sm:px-margin sm:pt-8">
        {/* Navigation & Header Actions */}
        <section className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-end">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <nav aria-label="Điều hướng" className="flex flex-wrap items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
              <Link to={PATHS.HOME} className="hover:text-primary transition-colors">
                Trang chủ
              </Link>
              <span>/</span>
              <Link to={PATHS.MEAL_PLANS.ROOT} className="hover:text-primary transition-colors">
                Thực đơn tuần
              </Link>
              <span>/</span>
              <span className="font-semibold text-on-surface">
                {totalDays < 7 ? `Thực đơn ${totalDays} ngày` : `${formatDate(data.startDate)} – ${data.endDate ? formatDate(data.endDate) : ''}`}
              </span>
            </nav>

            {/* Tiêu đề chuẩn: < 7 ngày ghi Thực đơn dinh dưỡng (N ngày), >= 7 ngày ghi từ Thứ [X] đến Thứ [Y] */}
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-serif font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg tracking-tight">
                {dynamicPlanTitle}
              </h1>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-xs font-semibold', STATUS_CLASS[status])}>
                {STATUS_LABEL[status]}
              </span>
              {data.generatedByAi && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed text-on-primary-fixed px-2.5 py-0.5 font-label-sm text-xs font-semibold">
                  <Icon name="auto_awesome" className="text-[14px]" />
                  AI tạo
                </span>
              )}
            </div>
          </div>

          {/* Các nút thao tác (Thanh tìm kiếm ngoài đã được lược bỏ vì đã có trong khung đổi món) */}
          <div className="flex flex-wrap items-center gap-2">
            {isDraft && (
              <button
                type="button"
                onClick={handleOpenActivate}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-label-md text-label-md font-semibold shadow-xs transition-all',
                  isFuturePlan
                    ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                    : 'bg-primary-container text-on-primary hover:bg-primary'
                )}
                title={isFuturePlan ? `Sẵn sàng kích hoạt từ ${getWeekdayFull(data.startDate)}, ${formatDate(data.startDate)}` : undefined}
              >
                <Icon name={isFuturePlan ? 'schedule' : 'rocket_launch'} className="text-[18px]" />
                {isFuturePlan ? `Kích hoạt (từ ${formatDate(data.startDate)})` : 'Kích hoạt'}
              </button>
            )}

            {/* Nút Đi chợ: gom đúng số ngày và số món đã tạo thực đơn */}
            <button
              type="button"
              onClick={handleOpenShopping}
              className={BTN_ACTION}
              title={`Đi chợ theo ${totalDays} ngày (${data.slots.length} món)`}
            >
              <Icon name="shopping_basket" className="text-[18px] text-primary" />
              <span>Đi chợ</span>
            </button>

            <button
              type="button"
              onClick={runExport}
              disabled={exportPdf.isPending}
              className={BTN_ACTION}
            >
              <Icon name="picture_as_pdf" className="text-[18px] text-on-surface-variant" />
              <span className="hidden sm:inline">{exportPdf.isPending ? 'Đang tạo…' : isVip ? 'Xuất PDF' : 'Xuất PDF (VIP)'}</span>
            </button>

            {/* Nút Hủy thực đơn này: hiển thị khi thực đơn chưa bị hủy (TASK-T1 / SWP391-232) */}
            {!isCancelled && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                disabled={cancel.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-error/30 bg-surface-container-lowest px-3.5 py-2 font-label-md text-label-md font-semibold text-error hover:bg-error-container/30 transition-all shadow-2xs disabled:opacity-60"
                title="Hủy thực đơn này (chuyển sang trạng thái Đã hủy)"
              >
                <Icon name="cancel" className="text-[18px]" />
                <span className="hidden sm:inline">Hủy thực đơn</span>
              </button>
            )}

            <Link
              to={PATHS.MEAL_PLANS.NEW}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-3.5 py-2 font-label-md text-label-md text-on-primary font-semibold shadow-xs hover:bg-primary transition-all"
            >
              <Icon name="auto_awesome" className="text-[16px]" />
              <span className="hidden sm:inline">Tạo mới</span>
            </Link>
          </div>
        </section>

        {/* Khối Thông báo Đã Hủy (SWP391-232) */}
        {isCancelled && (
          <FormAlert
            tone="error"
            title="Thực đơn này đã bị hủy"
          >
            <p>
              Thực đơn đã chuyển sang trạng thái <strong>Đã hủy</strong> và không còn hiệu lực theo dõi bữa ăn hay đổi món.
              Lưu ý: Lượt tạo thực đơn tuần này đã được sử dụng cho việc sinh AI trước đó.
              Nếu bạn muốn tạo thực đơn khác ngay trong tuần này, vui lòng{' '}
              <Link to={PATHS.SUBSCRIPTION.PRICING} className="font-semibold underline text-primary hover:text-primary-dim">
                Nâng cấp VIP
              </Link>{' '}
              để nhận thêm 3 lượt tạo thực đơn mỗi tuần hoặc chờ sang tuần tiếp theo.
            </p>
          </FormAlert>
        )}

        {/* Khối Thông báo Nháp */}
        {isDraft && (
          <FormAlert
            tone="info"
            title={isFuturePlan ? `Bản nháp kế hoạch (${formatDate(data.startDate)} – ${data.endDate ? formatDate(data.endDate) : ''})` : 'Đây là bản nháp thực đơn'}
          >
            {isFuturePlan ? (
              <p>
                Bạn có tối đa <strong>{data.edits.preDeployLimit} lượt đổi món</strong> để chuẩn bị thực đơn.
                Hệ thống sẽ mở quyền kích hoạt khi đến ngày áp dụng (từ <strong>{getWeekdayFull(data.startDate)}, {formatDate(data.startDate)}</strong>).
              </p>
            ) : (
              <p>
                Chỉnh sửa tối đa <strong>{data.edits.preDeployLimit} lần</strong> trước khi kích hoạt. Bạn có thể đổi món tự do hoặc tìm món trong database rồi
                nhấn <strong>Kích hoạt thực đơn</strong> để bắt đầu theo dõi bữa ăn và đi chợ.
              </p>
            )}
          </FormAlert>
        )}

        {/* BANNER NỔI BẬT ĐỐI CHIẾU GHI CHÚ DINH DƯỠNG AI (SCR-22 / SWP391-232) - CHỈ HIỂN THỊ KHI CÓ GHI CHÚ */}
        {Boolean(data.customInstructions && data.customInstructions.trim()) && (
          <section
            aria-label="Đối chiếu ghi chú dinh dưỡng AI"
            className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary-container/15 via-surface-container-lowest to-surface-container-lowest p-4 sm:p-5 shadow-xs"
          >
            <div className="flex flex-col gap-3">
              {/* Header của Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-on-surface text-sm sm:text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-on-primary shadow-2xs">
                    <Icon name="auto_awesome" className="text-[16px]" />
                  </div>
                  <span>Ghi chú dinh dưỡng cá nhân đã gửi AI</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed text-on-primary-fixed px-3 py-1 text-xs font-semibold shadow-2xs">
                  <Icon name="check_circle" className="text-[14px]" />
                  AI đã áp dụng ghi chú này
                </span>
              </div>

              {/* Nội dung nguyên văn ghi chú đối chiếu */}
              <div className="rounded-xl border-l-4 border-primary bg-surface-container-low/70 px-4 py-3">
                <p className="text-xs text-on-surface-variant font-medium mb-1">Nguyên văn yêu cầu của bạn trước khi sinh thực đơn:</p>
                <p className="text-sm font-semibold italic text-on-surface tracking-wide">
                  "{data.customInstructions}"
                </p>
              </div>

              {/* Các thẻ tiêu chí AI nhận diện được (Context Chips) nếu có */}
              {aiChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-surface-container/60">
                  <span className="text-xs text-on-surface-variant font-medium">Tiêu chí bóc tách:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {aiChips.map((chip) => (
                      <span
                        key={chip.id}
                        className="inline-flex items-center gap-1 rounded-full bg-surface-container-lowest border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary shadow-2xs"
                      >
                        <Icon name={chip.icon as any} className="text-[13px] text-primary" />
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4 Thẻ KPI Chỉ số thực đơn */}
        <section className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4" aria-label="Chỉ số thực đơn">
          <div className={KPI_CARD}>
            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span>MỤC TIÊU NĂNG LƯỢNG</span>
              <Icon name="bolt" className="text-[20px] text-primary" />
            </div>
            <div className="my-2 font-headline-md text-headline-md font-bold text-on-surface font-serif">
              {formatNumber(Math.round(data.targetDailyKcal))}{' '}
              <span className="font-body-sm text-body-sm font-normal text-on-surface-variant font-sans">kcal / ngày</span>
            </div>
          </div>

          <div className={KPI_CARD}>
            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span>TRUNG BÌNH THỰC ĐƠN</span>
              <Icon name="verified" className="text-[20px] text-secondary" />
            </div>
            <div className="my-2">
              <div className="font-headline-md text-headline-md font-bold text-primary font-serif">
                {formatNumber(avg)}{' '}
                <span className="font-body-sm text-body-sm font-normal text-on-surface-variant font-sans">kcal / ngày</span>
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
            <div className="my-2 font-headline-md text-headline-md font-bold text-on-surface font-serif">
              {editsLeft}{' '}
              <span className="font-body-sm text-body-sm font-normal text-on-surface-variant font-sans">
                / {edits.limit} lượt còn lại ({edits.phase})
              </span>
            </div>
          </div>

          <div className={KPI_CARD}>
            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span>TIẾN ĐỘ THỰC ĐƠN</span>
              <Icon name="task_alt" className="text-[20px] text-secondary" />
            </div>
            <div className="my-1.5 font-headline-md text-headline-md font-bold text-on-surface font-serif">
              {prog.done}{' '}
              <span className="font-body-sm text-body-sm font-normal text-on-surface-variant font-sans">
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
              <div className="h-full bg-primary-container transition-all duration-300" style={{ width: `${prog.pct}%` }} />
            </div>
          </div>
        </section>

        {/* LỊCH CÁC NGÀY: MỖI NGÀY LÀ MỘT THẺ CARD HIỂN THỊ THỨ + NGÀY/THÁNG (ĐÚNG THỨ LỊCH THẬT) */}
        <section className="rounded-2xl border border-surface-container bg-surface-container-lowest p-2 sm:p-3 shadow-xs" aria-label="Lịch các ngày trong thực đơn">
          <div className="flex items-center justify-between px-2 py-1 mb-2">
            <span className="font-serif text-xs font-bold text-on-surface uppercase tracking-wider">
              Lịch {calendarDays.length} ngày theo lịch thực tế:
            </span>
            <span className="font-sans text-xs text-on-surface-variant">
              Bấm vào thẻ ngày để xem &amp; đổi món
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" role="tablist">
            {calendarDays.map((dItem) => {
              const active = dItem.index === selectedDayIndex;
              const dateSlots =
                totalDays <= 7
                  ? data.slots.filter((s) => s.dayOfWeek === dItem.dayOfWeek)
                  : data.slots.slice(dItem.index * 3, dItem.index * 3 + 3);
              const kcal = dayKcal(dateSlots);

              return (
                <button
                  key={dItem.isoDate + dItem.index}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectCalendarDay(dItem.index)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl p-2.5 transition-all border text-center cursor-pointer',
                    active
                      ? 'bg-primary-container text-on-primary border-primary-container shadow-xs font-semibold'
                      : 'bg-surface-container-lowest border-surface-container text-on-surface hover:border-outline-variant hover:bg-surface-container-low'
                  )}
                >
                  {/* Hiển thị Thứ + ngày/tháng (nếu >= 7 ngày) hoặc Ngày 1, Ngày 2... (nếu < 7 ngày) */}
                  {dItem.displaySubtitle ? (
                    <span className={cn('text-[11px] font-medium leading-tight', active ? 'text-on-primary/80' : 'text-on-surface-variant')}>
                      {dItem.displaySubtitle}
                    </span>
                  ) : null}
                  <span className="text-sm font-serif font-bold mt-0.5 tracking-tight">
                    {dItem.displayTitle}
                  </span>
                  <span className={cn('mt-1 text-[11px] tabular-nums font-semibold', active ? 'text-primary-fixed' : 'text-secondary')}>
                    {formatNumber(kcal)} kcal
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* DANH SÁCH CÁC BỮA ĂN KÈM MÓN CỦA NGÀY ĐANG CHỌN */}
        <section className="flex flex-col gap-space-md" aria-label={`Các bữa ${currentDayItem?.header}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl bg-surface-container px-space-md py-3.5 shadow-xs gap-2">
            <div className="flex items-center gap-2">
              <Icon name="calendar_today" className="text-[20px] text-primary" />
              <span className="font-headline-sm text-headline-sm text-on-surface font-serif font-bold">
                {currentDayItem?.header || (totalDays < 7 ? `Ngày ${selectedDayIndex + 1}` : 'Hôm nay')}
              </span>
            </div>
            <div className="flex items-center gap-4 font-label-md text-label-md text-on-surface-variant">
              <span>
                Tổng calo ngày: <strong className="text-on-surface font-bold font-serif">{formatNumber(dayTotal)} kcal</strong>
              </span>
              {isVip && data.targetDailyKcal > 0 && (
                <span className={dayTotal - data.targetDailyKcal > 0 ? 'text-secondary font-medium' : 'text-primary font-medium'}>
                  {dayTotal - data.targetDailyKcal > 0 ? '+' : ''}
                  {Math.round(dayTotal - data.targetDailyKcal)} so với mục tiêu ({formatNumber(Math.round(data.targetDailyKcal))} kcal)
                </span>
              )}
            </div>
          </div>

          {daySlots.length === 0 ? (
            <p className="rounded-2xl bg-surface-container-low p-space-md font-body-md text-body-md text-on-surface-variant" role="status">
              Ngày này chưa có bữa ăn nào được sắp xếp.
            </p>
          ) : (
            daySlots.map((s) => (
              <MealPlanSlotCard
                key={s.slotId}
                slot={s}
                swapInfo={swapHistories[s.slotId]}
                slotNote={slotNotes[s.slotId]}
                isActive={isActive}
                editable={editable}
                completePending={complete.isPending && complete.variables?.slotId === s.slotId}
                onToggleComplete={() => toggleComplete(s)}
                onOpenSwap={() => openSwap(s)}
                onOpenSearchDb={() => openSearchDbModal(s)}
                onOpenHistory={() => setHistorySlot(s)}
                planId={planId}
                currentDay={selectedDayCode}
              />
            ))
          )}
        </section>
      </div>

      {/* MODAL 1: Swap Meal Dialog (Hỗ trợ 3 chế độ: Gợi ý lý do, Lưu ý riêng cho món, Tìm kiếm Database) */}
      <SwapMealDialog
        key={swapSlot?.slotId ?? 'none'}
        slot={swapSlot}
        remaining={editsLeft}
        limit={edits.limit}
        swapCount={(swapSlot as unknown as { swapCount?: number })?.swapCount || swapHistories[swapSlot?.slotId ?? 0]?.swapCount}
        previousRecipe={(swapSlot as unknown as { previousRecipe?: SlotSwapInfo['previousRecipe'] })?.previousRecipe || swapHistories[swapSlot?.slotId ?? 0]?.previousRecipe}
        initialCustomNote={swapSlot ? slotNotes[swapSlot.slotId] : undefined}
        submitting={swap.isPending || swapByNote.isPending}
        error={swapError}
        onCancel={() => setSwapSlot(null)}
        onConfirm={confirmSwap}
      />

      {/* MODAL 1.5: Chi tiết món trước đó & Lịch sử đổi món (FN-MEAL-03) */}
      <SwapHistoryModal
        slot={historySlot}
        dayLabel={selectedDayCode ? (DAY_LABEL[selectedDayCode] || selectedDayCode) : undefined}
        planId={planId}
        fallbackHistory={historySlot ? swapHistories[historySlot.slotId] : undefined}
        onClose={() => setHistorySlot(null)}
      />

      {/* MODAL 2: Modal tìm kiếm món ăn độc lập từ Database */}
      <DishSearchModal
        show={dishSearchModalOpen}
        onHide={() => {
          setDishSearchModalOpen(false);
          setSearchTargetSlot(null);
        }}
        targetSlot={searchTargetSlot}
        availableSlots={data.slots}
        onSelectDish={(recipe, targetSlotId) => {
          const slotToReplace = targetSlotId ?? searchTargetSlot?.slotId ?? daySlots[0]?.slotId;
          if (slotToReplace) {
            handleReplaceSlotWithDish(slotToReplace, recipe);
          }
        }}
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

      {/* Confirm Cancel Meal Plan Dialog (TASK-T1 / SWP391-232) */}
      <ConfirmDialog
        show={showCancelModal}
        title="Hủy thực đơn này?"
        danger
        loading={cancel.isPending}
        confirmLabel={cancel.isPending ? 'Đang hủy…' : 'Xác nhận hủy thực đơn'}
        cancelLabel="Giữ lại thực đơn"
        message={
          <div className="flex flex-col gap-3">
            <p>
              Thực đơn này sẽ chuyển sang trạng thái <strong>Đã hủy (CANCELLED)</strong> và không còn hiệu lực theo dõi bữa ăn hay đổi món.
            </p>
            <div className="rounded-xl border border-error/30 bg-error-container/30 p-3 text-xs text-error font-medium leading-relaxed">
              <div className="flex items-center gap-1.5 font-semibold mb-1 text-sm">
                <Icon name="warning" className="text-[16px]" />
                Lưu ý quan trọng về hạn mức:
              </div>
              Lượt tạo thực đơn tuần này sẽ <strong>KHÔNG được hoàn lại</strong> sau khi hủy (Đã sử dụng hạn mức sinh AI của tuần). Bạn sẽ không thể tạo lại thực đơn mới cho tuần này trừ khi nâng cấp tài khoản VIP.
            </div>
          </div>
        }
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
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

      {/* Create Shopping List Dialog (Tính toán theo đúng số ngày và số món trong thực đơn) */}
      {isActive && (
        <CreateShoppingListDialog planId={planId} show={shoppingOpen} onHide={() => setShoppingOpen(false)} />
      )}
    </main>
  );
};

export default MealPlanDetail;
