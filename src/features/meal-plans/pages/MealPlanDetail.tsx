import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { VipLockCard, VipUpsellDialog } from '@/components/common/VipUpsell';
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
import { DayColumn } from '../components/DayColumn';
import { MealSlotCard } from '../components/MealSlotCard';
import { SwapMealDialog } from '../components/SwapMealDialog';
import { useExportPdf } from '../hooks/useExportPdf';
import {
  useActivateMealPlan,
  useCompleteMealSlot,
  useMealPlan,
  useMealPlanNutrition,
  useSwapMealSlot,
} from '../hooks/useMealPlans';
import { addDays, formatWeekRange, todayInVietnam } from '../lib/dates';
import { BUDGET_LABEL, DAYS, MEALS, STATUS_CLASS, STATUS_LABEL } from '../lib/labels';
import type { MealSlot, NutritionLevel, SwapReason } from '../types/mealPlan.types';

const PAGE = 'mx-auto flex w-full max-w-[1280px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin';
const CARD = 'rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card';
const LINK_BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 font-label-md text-label-md no-underline transition-colors';

const NotFound: React.FC = () => (
  <EmptyState
    icon="search_off"
    title="Không tìm thấy thực đơn"
    description="Thực đơn không tồn tại hoặc không thuộc về bạn."
    action={
      <Link to={PATHS.MEAL_PLANS.ROOT} className={`${LINK_BUTTON} bg-primary-container text-on-primary hover:bg-primary`}>
        Về danh sách thực đơn
      </Link>
    }
  />
);

/**
 * SCR-22 meal-plans/MealPlan — /meal-plans/:id. FN-MEAL-02 (xem, kích hoạt), FN-MEAL-03 (đổi món),
 * FN-MEAL-04 (đã ăn), FN-MEAL-07 (calo); tạo danh sách đi chợ (FN-MEAL-05) và xuất PDF (FN-MEAL-08, VIP).
 */
const MealPlanDetail: React.FC = () => {
  const { id } = useParams();
  const planId = Number(id);
  const validId = Number.isInteger(planId) && planId > 0;
  const isVip = useAuthStore((state) => state.user?.isVip ?? false);

  const plan = useMealPlan(planId);
  const [nutritionLevel, setNutritionLevel] = useState<NutritionLevel>(isVip ? 'DETAILED' : 'BASIC');
  const nutrition = useMealPlanNutrition(planId, nutritionLevel, !!plan.data);
  const activate = useActivateMealPlan(planId);
  const swap = useSwapMealSlot(planId);
  const complete = useCompleteMealSlot(planId);
  const exportPdf = useExportPdf(planId);

  const [confirmActivate, setConfirmActivate] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [upsell, setUpsell] = useState<{ title: string; message: string } | null>(null);
  const [swapSlot, setSwapSlot] = useState<MealSlot | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  /** Các món đã bị đổi đi ở từng bữa trong phiên: không chọn lại (excludedRecipeIds). */
  const [swappedAway, setSwappedAway] = useState<Record<number, number[]>>({});
  const [shoppingOpen, setShoppingOpen] = useState(false);

  // VIP hết hạn: DETAILED bị 403 ERR_VIP_REQUIRED thì chỉ xem tổng calo mỗi ngày.
  useEffect(() => {
    if (nutrition.error && toApiError(nutrition.error).errorCode === 'ERR_VIP_REQUIRED') setNutritionLevel('BASIC');
  }, [nutrition.error]);

  const data = plan.data;
  const slotsByDay = useMemo(() => {
    const map = new Map<string, MealSlot[]>();
    for (const slot of data?.slots ?? []) map.set(slot.dayOfWeek, [...(map.get(slot.dayOfWeek) ?? []), slot]);
    for (const [day, slots] of map) map.set(day, [...slots].sort((a, b) => MEALS.indexOf(a.mealType) - MEALS.indexOf(b.mealType)));
    return map;
  }, [data?.slots]);

  if (!validId) return <NotFound />;

  if (plan.isPending) {
    return (
      <div className={PAGE} role="status" aria-busy="true" aria-label="Đang tải thực đơn">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
          {DAYS.map((day) => (
            <Skeleton key={day} className="h-[420px] lg:h-[760px]" />
          ))}
        </div>
      </div>
    );
  }

  if (plan.isError || !data) {
    if (toApiError(plan.error).status === 404) return <NotFound />;
    return <ErrorState error={plan.error} onRetry={() => plan.refetch()} retrying={plan.isRefetching} />;
  }

  const status = data.planStatus;
  const isDraft = status === 'DRAFT';
  const isActive = status === 'ACTIVE';
  const editable = isDraft || isActive;
  const editLimit = isDraft ? data.edits.preDeployLimit : data.edits.postDeployLimit;
  const editsLeft = Math.max(0, editLimit - (isDraft ? data.edits.preDeployUsed : data.edits.postDeployUsed));
  const completedCount = data.slots.filter((slot) => slot.isCompleted).length;
  const totalSlots = data.slots.length || 21;
  const showDetail = nutritionLevel === 'DETAILED' && !!nutrition.data;
  const today = todayInVietnam();
  const knownListId = listIdOfPlan(planId);

  const dayKcal = (day: string, slots: MealSlot[]) => {
    const fromApi = nutrition.data?.days.find((item) => item.dayOfWeek === day);
    if (fromApi) return { kcal: fromApi.kcal, delta: showDetail ? (fromApi.deltaKcal ?? null) : null };
    // API calo chưa trả lời được: tự cộng tổng ngày (không lộ calo từng món).
    if (nutrition.isError) return { kcal: slots.reduce((sum, slot) => sum + slot.recipe.caloriesKcal, 0), delta: null };
    return { kcal: null, delta: null };
  };

  const quotaUpsell = (message: string) => {
    setSwapSlot(null);
    setUpsell({ title: 'Bạn đã dùng hết lượt đổi món', message });
  };

  const openSwap = (slot: MealSlot) => {
    if (editsLeft <= 0) {
      const message = `Bạn đã dùng hết ${editLimit} lần ${isDraft ? 'chỉnh sửa' : 'đổi món'} của thực đơn này.`;
      if (isVip) setNotice({ title: 'Hết lượt đổi món', message });
      else quotaUpsell(message);
      return;
    }
    setSwapError(null);
    setSwapSlot(slot);
  };

  const confirmSwap = (reason: SwapReason | null) => {
    if (!swapSlot) return;
    const { slotId } = swapSlot;
    const excluded = [swapSlot.recipe.recipeId, ...(swappedAway[slotId] ?? [])];
    setSwapError(null);
    swap.mutate(
      { slotId, body: { ...(reason ? { swapReason: reason } : {}), excludedRecipeIds: excluded } },
      {
        onSuccess: (res) => {
          setSwappedAway((current) => ({ ...current, [slotId]: excluded }));
          setSwapSlot(null);
          notifySuccess(`${res.message || 'Đã đổi món.'} Món mới: ${res.data.slot.recipe.title}.`);
        },
        onError: (error) => {
          const apiError = toApiError(error);
          if (apiError.errorCode === 'ERR_QUOTA_MEAL_SWAP_EXCEEDED') {
            if (isVip) setSwapError(getErrorMessage(apiError));
            else quotaUpsell(getErrorMessage(apiError));
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

  const toggleComplete = (slot: MealSlot) =>
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

  const runActivate = () =>
    activate.mutate(undefined, {
      onSuccess: (res) => {
        setConfirmActivate(false);
        notifySuccess(res.message || 'Đã kích hoạt thực đơn.');
      },
      onError: (error) => {
        setConfirmActivate(false);
        const apiError = toApiError(error);
        if (apiError.status === 409) setNotice({ title: 'Không kích hoạt được', message: getErrorMessage(apiError) });
        else notifyApiError(apiError);
      },
    });

  const runExport = () =>
    exportPdf.mutate(knownListId ? 'PLAN,SHOPPING' : 'PLAN', {
      onError: (error) => {
        const apiError = toApiError(error);
        if (apiError.errorCode === 'ERR_VIP_REQUIRED') {
          setUpsell({ title: 'Xuất PDF dành cho VIP', message: getErrorMessage(apiError) });
        } else {
          notifyApiError(apiError);
        }
      },
    });

  const shoppingAction = !isActive ? (
    <p className="font-body-sm text-body-sm text-on-surface-variant">Kích hoạt thực đơn để tạo danh sách đi chợ.</p>
  ) : knownListId ? (
    <Link
      to={PATHS.SHOPPING_LISTS.DETAIL(knownListId)}
      className={`${LINK_BUTTON} bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant`}
    >
      <Icon name="shopping_cart" className="text-[18px]" />
      Mở danh sách đi chợ
    </Link>
  ) : (
    <Button variant="accent" onClick={() => setShoppingOpen(true)}>
      <Icon name="add_shopping_cart" className="text-[18px]" />
      Tạo danh sách đi chợ
    </Button>
  );

  return (
    <div className={PAGE}>
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
        <Link to={PATHS.MEAL_PLANS.ROOT} className="flex items-center gap-1 text-on-surface-variant no-underline hover:text-primary">
          <Icon name="restaurant_menu" className="text-[16px]" />
          Thực đơn tuần
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="text-primary" aria-current="page">
          {data.planName}
        </span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="flex min-w-0 flex-col gap-space-xs">
          <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">{data.planName}</h1>
          <div className="flex flex-wrap items-center gap-space-xs font-label-sm text-label-sm">
            <span className={cn('rounded-full px-2.5 py-0.5', STATUS_CLASS[status])}>{STATUS_LABEL[status]}</span>
            <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-on-surface-variant">
              Tuần {formatWeekRange(data.startDate)}
            </span>
            <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-on-surface-variant">
              Ngân sách {BUDGET_LABEL[data.budgetTier]}
            </span>
            {data.generatedByAi && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-0.5 text-on-secondary-fixed-variant">
                <Icon name="auto_awesome" className="text-[14px]" />
                AI tạo
              </span>
            )}
          </div>
        </div>
        {isVip && (
          <Button variant="outline" onClick={runExport} loading={exportPdf.isPending}>
            <Icon name="picture_as_pdf" className="text-[18px]" />
            Tải PDF
          </Button>
        )}
      </header>

      {!data.generatedByAi && (
        <FormAlert tone="info" title="Thực đơn được tạo từ mẫu có sẵn">
          AI đang bận nên hệ thống dùng thực đơn mẫu hợp với hồ sơ của bạn. Bạn vẫn đổi món như bình thường.
        </FormAlert>
      )}

      {/* Tóm tắt: trạng thái, tiến độ, hạn mức đổi món, calo mục tiêu */}
      <section aria-label="Tóm tắt thực đơn" className={cn(CARD, 'grid grid-cols-1 gap-space-md md:grid-cols-3')}>
        <div className="flex flex-col gap-space-xs">
          {isDraft && (
            <>
              <p className="font-label-md text-label-md text-on-surface">Bản nháp: đổi món tùy ý rồi kích hoạt</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Sau khi kích hoạt, bạn đánh dấu được bữa đã ăn và tạo danh sách đi chợ.
              </p>
              <Button className="mt-1 self-start" onClick={() => setConfirmActivate(true)}>
                <Icon name="play_circle" className="text-[18px]" />
                Kích hoạt thực đơn
              </Button>
            </>
          )}
          {isActive && (
            <>
              <p className="font-label-md text-label-md text-on-surface">
                Đã ăn {completedCount}/{totalSlots} bữa
              </p>
              <div
                className="h-2 overflow-hidden rounded-full bg-surface-container"
                role="progressbar"
                aria-label="Tiến độ ăn theo thực đơn"
                aria-valuemin={0}
                aria-valuemax={totalSlots}
                aria-valuenow={completedCount}
              >
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(completedCount / totalSlots) * 100}%` }} />
              </div>
              <div className="mt-1">{shoppingAction}</div>
            </>
          )}
          {!editable && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Thực đơn {STATUS_LABEL[status].toLowerCase()}: chỉ xem, không đổi món hay đánh dấu được nữa.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {isDraft ? 'Lần chỉnh sửa còn lại' : 'Lần đổi món còn lại'}
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface tabular-nums">
            {editable ? `${editsLeft}/${editLimit}` : '—'}
          </span>
          <span className="font-body-sm text-body-sm text-outline">
            {isDraft ? 'Trước khi kích hoạt' : 'Sau khi kích hoạt'}, cả gói Free và VIP.
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Calo mục tiêu mỗi ngày</span>
          <span className="font-headline-sm text-headline-sm text-on-surface tabular-nums">
            {formatNumber(Math.round(nutrition.data?.targetKcalPerDay ?? data.targetDailyKcal))} kcal
          </span>
          {showDetail && nutrition.data?.totalKcalWeek != null && (
            <span className="font-body-sm text-body-sm text-outline">
              Cả tuần: {formatNumber(Math.round(nutrition.data.totalKcalWeek))} kcal
            </span>
          )}
        </div>
      </section>

      {data.customInstructions && (
        <p className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
          <Icon name="sticky_note_2" className="mt-0.5 text-[16px]" />
          Ghi chú cho AI: “{data.customInstructions}”
        </p>
      )}

      {!showDetail && (
        <VipLockCard
          title="Calo từng món và so với mục tiêu"
          description="Gói Free xem tổng calo mỗi ngày. Nâng cấp VIP để xem calo từng món, từng bữa và chênh lệch so với mục tiêu."
        />
      )}

      {/* Lưới 7 ngày × 3 bữa */}
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
        {DAYS.map((day, index) => {
          const date = addDays(data.startDate, index);
          const slots = slotsByDay.get(day) ?? [];
          const { kcal, delta } = dayKcal(day, slots);
          return (
            <DayColumn
              key={day}
              day={day}
              date={date}
              isToday={date === today}
              kcal={kcal}
              deltaKcal={delta}
              targetKcal={nutrition.data?.targetKcalPerDay ?? data.targetDailyKcal}
            >
              {slots.map((slot) => (
                <MealSlotCard
                  key={slot.slotId}
                  slot={slot}
                  showKcal={showDetail}
                  canComplete={isActive}
                  canSwap={editable}
                  completing={complete.isPending && complete.variables?.slotId === slot.slotId}
                  onToggleComplete={() => toggleComplete(slot)}
                  onSwap={() => openSwap(slot)}
                />
              ))}
            </DayColumn>
          );
        })}
      </div>

      <SwapMealDialog
        key={swapSlot?.slotId ?? 'none'}
        slot={swapSlot}
        remaining={editsLeft}
        limit={editLimit}
        submitting={swap.isPending}
        error={swapError}
        onCancel={() => setSwapSlot(null)}
        onConfirm={confirmSwap}
      />

      <ConfirmDialog
        show={confirmActivate}
        title="Kích hoạt thực đơn?"
        message={
          <>
            Thực đơn đang áp dụng khác trong cùng tuần (nếu có) sẽ được chuyển sang lưu trữ. Sau khi kích hoạt, bạn có{' '}
            {data.edits.postDeployLimit} lần đổi món.
          </>
        }
        confirmLabel="Kích hoạt"
        loading={activate.isPending}
        onConfirm={runActivate}
        onCancel={() => setConfirmActivate(false)}
      />

      <Modal show={notice !== null} onHide={() => setNotice(null)} title={notice?.title} size="sm">
        <div className="flex flex-col gap-space-md p-space-lg">
          <p className="font-body-md text-body-md text-on-surface-variant">{notice?.message}</p>
          <div className="flex justify-end">
            <Button onClick={() => setNotice(null)}>Đã hiểu</Button>
          </div>
        </div>
      </Modal>

      <VipUpsellDialog
        show={upsell !== null}
        onHide={() => setUpsell(null)}
        title={upsell?.title ?? ''}
        message={upsell?.message}
      />

      {isActive && (
        <CreateShoppingListDialog planId={planId} show={shoppingOpen} onHide={() => setShoppingOpen(false)} />
      )}
    </div>
  );
};

export default MealPlanDetail;
