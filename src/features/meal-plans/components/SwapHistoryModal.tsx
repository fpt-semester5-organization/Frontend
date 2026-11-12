import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { MEAL_LABEL, SWAP_REASON_LABEL } from '../lib/labels';
import { useMealSlotSwapHistory } from '../hooks/useMealPlans';
import type { MealSlot, MealSlotSwapHistoryItem, SwapReason } from '../types/mealPlan.types';

export interface SwapHistoryModalProps {
  slot: MealSlot | null;
  dayLabel?: string;
  planId?: number;
  fallbackHistory?: {
    swapCount?: number;
    previousRecipe?: {
      recipeId: number;
      title: string;
      caloriesKcal: number;
      imageUrl?: string;
    } | null;
    originalRecipe?: {
      recipeId: number;
      title: string;
      caloriesKcal: number;
      imageUrl?: string;
    } | null;
    history?: Array<{
      recipeId: number;
      title: string;
      caloriesKcal: number;
      imageUrl?: string;
    }>;
  } | null;
  onClose: () => void;
  /** Tiện ích chọn lại món cũ chỉ với 1 thao tác */
  onRevertToRecipe?: (recipeId: number, recipeTitle: string) => void;
  isReverting?: boolean;
}

function formatIsoDateTime(isoStr?: string | null): string {
  if (!isoStr) return 'Không rõ';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return isoStr;
  }
}

function formatReason(reason?: string | null): string {
  if (!reason) return 'Không có ghi chú lý do';
  if (reason in SWAP_REASON_LABEL) {
    return SWAP_REASON_LABEL[reason as SwapReason];
  }
  return reason;
}

export const SwapHistoryModal: React.FC<SwapHistoryModalProps> = ({
  slot,
  dayLabel,
  planId,
  fallbackHistory,
  onClose,
  onRevertToRecipe,
  isReverting = false,
}) => {
  const slotId = slot?.slotId ?? 0;
  const historyQuery = useMealSlotSwapHistory(slotId, slot !== null);

  const fallbackItem: MealSlotSwapHistoryItem | null = React.useMemo(() => {
    const prev = fallbackHistory?.previousRecipe || slot?.previousRecipe;
    if (!prev || !slot) return null;
    const currentRecipe = slot.recipe;
    const oldKcal = prev.caloriesKcal ?? 0;
    const newKcal = currentRecipe?.caloriesKcal ?? 0;
    return {
      historyId: 0,
      slotId: slot.slotId,
      oldRecipeId: prev.recipeId,
      oldRecipeTitle: prev.title,
      oldRecipeImageUrl: prev.imageUrl,
      oldRecipeCalories: oldKcal,
      oldRecipe: {
        recipeId: prev.recipeId,
        title: prev.title,
        caloriesKcal: oldKcal,
        imageUrl: prev.imageUrl,
      },
      newRecipeId: currentRecipe?.recipeId ?? 0,
      newRecipeTitle: currentRecipe?.title ?? 'Món mới',
      newRecipeImageUrl: currentRecipe?.imageUrl,
      newRecipeCalories: newKcal,
      newRecipe: currentRecipe
        ? {
            recipeId: currentRecipe.recipeId,
            title: currentRecipe.title,
            caloriesKcal: newKcal,
            imageUrl: currentRecipe.imageUrl,
          }
        : null,
      swapReason: slot.notes || 'Đổi món theo yêu cầu',
      caloriesDelta: Math.round(newKcal - oldKcal),
      swappedAt: new Date().toISOString(),
    };
  }, [fallbackHistory, slot]);

  // Ưu tiên dữ liệu từ API query, fallback sang swapHistories gắn sẵn trên slot hoặc fallbackItem từ session
  const histories: MealSlotSwapHistoryItem[] =
    historyQuery.data && historyQuery.data.length > 0
      ? historyQuery.data
      : (slot?.swapHistories && slot.swapHistories.length > 0)
      ? slot.swapHistories
      : fallbackItem
      ? [fallbackItem]
      : [];

  const latestSwap: MealSlotSwapHistoryItem | undefined = histories[0];

  const mealName = slot?.mealType ? MEAL_LABEL[slot.mealType] : 'Bữa ăn';
  const modalTitle = (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon name="history" className="text-[20px]" />
      </span>
      <div>
        <span className="text-base font-bold text-on-surface">Chi tiết món trước đó & Lịch sử đổi</span>
        <p className="text-xs font-normal text-on-surface-variant">
          {mealName} {dayLabel ? `· ${dayLabel}` : ''}
        </p>
      </div>
    </div>
  );

  return (
    <Modal show={slot !== null} onHide={onClose} title={modalTitle} size="lg">
      <div className="flex flex-col gap-4 p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
        {historyQuery.isLoading && histories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
            <Spinner />
            <p className="text-xs font-medium">Đang tải lịch sử đổi món...</p>
          </div>
        ) : historyQuery.isError && histories.length === 0 ? (
          <div className="flex flex-col gap-3 py-4">
            <FormAlert tone="warning">
              Không thể tải lịch sử đổi món lúc này. Vui lòng thử lại sau.
            </FormAlert>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => historyQuery.refetch()}>
                <Icon name="refresh" className="text-[16px]" />
                Thử lại
              </Button>
            </div>
          </div>
        ) : histories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-on-surface-variant">
            <Icon name="info" className="text-[36px] text-outline mb-2" />
            <p className="font-semibold text-sm text-on-surface">Chưa có bản ghi đổi món</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Bữa ăn này đang sử dụng món gốc được tạo ban đầu.
            </p>
          </div>
        ) : (
          <>
            {/* THẺ ĐỐI CHỨNG TRỰC QUAN: MÓN TRƯỚC ĐÓ (CŨ) VS MÓN HIỆN TẠI (MỚI) */}
            {latestSwap && (
              <section aria-label="Đối chứng món ăn" className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                    <Icon name="compare_arrows" className="text-[16px] text-primary" />
                    Đối chứng món trước đó và món mới
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed/60 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <Icon name="history" className="text-[13px]" />
                    Đã đổi {histories.length} lần
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cột trái: Món cũ trước đó */}
                  <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                      <span className="flex items-center gap-1 text-on-surface-variant">
                        <Icon name="history" className="text-[15px]" />
                        Món trước đó (Cũ)
                      </span>
                      <span className="rounded-md bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                        {Math.round(latestSwap.oldRecipeCalories)} kcal
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-surface-container relative">
                        {latestSwap.oldRecipeImageUrl || latestSwap.oldRecipe?.imageUrl ? (
                          <img
                            src={latestSwap.oldRecipeImageUrl || latestSwap.oldRecipe?.imageUrl || ''}
                            alt={latestSwap.oldRecipeTitle}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-primary">
                            <Icon name="restaurant" className="text-[24px]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={PATHS.RECIPES.DETAIL(latestSwap.oldRecipeId)}
                          state={{ fromPlanId: planId }}
                          className="font-bold text-sm text-on-surface line-clamp-2 hover:text-primary hover:underline transition-colors"
                          title="Xem công thức món cũ"
                        >
                          {latestSwap.oldRecipeTitle || latestSwap.oldRecipe?.title || 'Món trước đó'}
                        </Link>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Mã món: #{latestSwap.oldRecipeId}
                        </p>
                      </div>
                    </div>

                    {onRevertToRecipe && (
                      <button
                        type="button"
                        onClick={() => onRevertToRecipe(latestSwap.oldRecipeId, latestSwap.oldRecipeTitle || 'Món trước đó')}
                        disabled={isReverting}
                        title={`Quay lại món cũ: ${latestSwap.oldRecipeTitle}`}
                        className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-container px-3 py-1.5 text-xs font-bold text-on-primary shadow-xs hover:bg-primary transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                      >
                        <Icon name="undo" className="text-[16px]" />
                        <span>Quay lại món cũ</span>
                      </button>
                    )}
                  </div>

                  {/* Cột phải: Món mới hiện tại */}
                  <div className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary-fixed/20 p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-bold text-primary">
                      <span className="flex items-center gap-1">
                        <Icon name="check_circle" className="text-[15px]" />
                        Món hiện tại (Mới)
                      </span>
                      <span className="rounded-md bg-primary-fixed px-2 py-0.5 text-[11px] font-semibold text-on-primary-fixed">
                        {Math.round(latestSwap.newRecipeCalories || (slot?.recipe?.caloriesKcal ?? 0))} kcal
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-surface-container relative">
                        {latestSwap.newRecipeImageUrl || latestSwap.newRecipe?.imageUrl || slot?.recipe?.imageUrl ? (
                          <img
                            src={latestSwap.newRecipeImageUrl || latestSwap.newRecipe?.imageUrl || slot?.recipe?.imageUrl || ''}
                            alt={latestSwap.newRecipeTitle || slot?.recipe?.title || ''}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-primary">
                            <Icon name="restaurant" className="text-[24px]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={PATHS.RECIPES.DETAIL(latestSwap.newRecipeId || (slot?.recipe?.recipeId ?? 0))}
                          state={{ fromPlanId: planId }}
                          className="font-bold text-sm text-primary line-clamp-2 hover:underline transition-colors"
                          title="Xem công thức món mới"
                        >
                          {latestSwap.newRecipeTitle || slot?.recipe?.title || 'Món thay thế'}
                        </Link>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Mã món: #{latestSwap.newRecipeId || slot?.recipe?.recipeId}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thẻ chênh lệch năng lượng Calo */}
                {(() => {
                  const delta = Math.round(latestSwap.caloriesDelta);
                  const isLess = delta < 0;
                  const isMore = delta > 0;
                  return (
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 border text-xs font-medium ${
                        isLess
                          ? 'border-primary/20 bg-primary-fixed/30 text-on-primary-fixed'
                          : isMore
                          ? 'border-secondary/20 bg-secondary-fixed/40 text-on-secondary-fixed'
                          : 'border-surface-container bg-surface-container-low text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          name={isLess ? 'trending_down' : isMore ? 'trending_up' : 'drag_handle'}
                          className="text-[18px]"
                        />
                        <span className="font-semibold">
                          {isLess
                            ? `Món mới giảm ${Math.abs(delta)} kcal so với món trước`
                            : isMore
                            ? `Món mới tăng ${delta} kcal so với món trước`
                            : 'Món mới có năng lượng tương đương món trước'}
                        </span>
                      </div>
                      <span className="font-bold tabular-nums">
                        {Math.round(latestSwap.oldRecipeCalories)} kcal → {Math.round(latestSwap.newRecipeCalories)} kcal
                      </span>
                    </div>
                  );
                })()}

                {/* Ngữ cảnh: Lý do đổi & Thời điểm đổi */}
                <div className="rounded-2xl border border-surface-container bg-surface-container-lowest p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <Icon name="psychology" className="text-[16px] text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-on-surface mr-1">Lý do đã chọn:</span>
                      <span className="text-on-surface-variant font-medium">
                        {formatReason(latestSwap.swapReason)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-surface-container text-on-surface-variant">
                    <Icon name="schedule" className="text-[16px] text-outline shrink-0" />
                    <span>Thời điểm thực hiện:</span>
                    <span className="font-semibold text-on-surface">
                      {formatIsoDateTime(latestSwap.swappedAt)}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* DÒNG THỜI GIAN ĐỔI MÓN NẾU CÓ NHIỀU HƠN 1 LẦN ĐỔI */}
            {histories.length > 1 && (
              <section aria-label="Toàn bộ lịch sử các lần đổi" className="flex flex-col gap-2 pt-2 border-t border-surface-container">
                <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                  <Icon name="timeline" className="text-[16px] text-primary" />
                  Toàn bộ các lần đổi trước ({histories.length} lần)
                </h4>
                <div className="space-y-2">
                  {histories.map((item, idx) => {
                    const delta = Math.round(item.caloriesDelta);
                    return (
                      <div
                        key={item.historyId || `${item.oldRecipeId}_${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container-low p-2.5 border border-surface-container text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[11px] font-bold text-on-surface-variant">
                            {idx + 1}
                          </span>
                          {onRevertToRecipe ? (
                            <button
                              type="button"
                              onClick={() => onRevertToRecipe(item.oldRecipeId, item.oldRecipeTitle)}
                              disabled={isReverting}
                              title={`Bấm để quay lại món cũ: ${item.oldRecipeTitle}`}
                              className="line-through text-on-surface-variant hover:text-primary hover:no-underline truncate max-w-[140px] sm:max-w-[200px] text-left transition-colors cursor-pointer group inline-flex items-center gap-1 font-medium"
                            >
                              <span className="group-hover:underline truncate">{item.oldRecipeTitle}</span>
                              <Icon name="undo" className="text-[13px] opacity-0 group-hover:opacity-100 text-primary transition-opacity shrink-0" />
                            </button>
                          ) : (
                            <span className="line-through text-on-surface-variant truncate max-w-[140px] sm:max-w-[200px]" title={item.oldRecipeTitle}>
                              {item.oldRecipeTitle}
                            </span>
                          )}
                          <Icon name="arrow_forward" className="text-[14px] text-on-surface-variant shrink-0" />
                          <span className="font-bold text-primary truncate max-w-[140px] sm:max-w-[200px]" title={item.newRecipeTitle}>
                            {item.newRecipeTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {onRevertToRecipe && (
                            <button
                              type="button"
                              onClick={() => onRevertToRecipe(item.oldRecipeId, item.oldRecipeTitle)}
                              disabled={isReverting}
                              title={`Quay lại món cũ: ${item.oldRecipeTitle}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary-fixed/80 text-primary hover:bg-primary-fixed hover:text-primary-dim px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50"
                            >
                              <Icon name="undo" className="text-[12px]" />
                              <span>Quay lại món này</span>
                            </button>
                          )}
                          <span className="tabular-nums text-on-surface-variant">
                            {delta > 0 ? `+${delta}` : delta} kcal
                          </span>
                          <span className="text-[11px] text-outline hidden sm:inline">
                            {formatIsoDateTime(item.swappedAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* Nút đóng */}
        <div className="flex justify-end pt-2 border-t border-surface-container">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};
