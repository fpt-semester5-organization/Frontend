import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useRecipe } from '@/features/recipes/hooks/useRecipes';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { DAY_LABEL, MEAL_LABEL, SWAP_REASONS } from '../lib/labels';
import type { MealSlot, SwapReason } from '../types/mealPlan.types';

interface SwapMealDialogProps {
  slot: MealSlot | null;
  remaining: number;
  limit: number;
  swapCount?: number;
  previousRecipe?: {
    recipeId: number;
    title: string;
    caloriesKcal: number;
  } | null;
  submitting: boolean;
  /** Lỗi hiện trong hộp thoại (422 không có món thay thế, hết lượt của VIP). */
  error: string | null;
  onCancel: () => void;
  onConfirm: (reason: SwapReason | null) => void;
}

/** Hộp thoại đổi món (FN-MEAL-03): chọn lý do (không bắt buộc), server chọn món tương đương. */
export const SwapMealDialog: React.FC<SwapMealDialogProps> = ({
  slot,
  remaining,
  limit,
  swapCount = 0,
  previousRecipe,
  submitting,
  error,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState<SwapReason | null>(null);

  // Kết nối API chi tiết món ăn để đảm bảo số liệu calo, thời gian nấu, số tim khớp 100%
  const recipeQuery = useRecipe(slot?.recipe.recipeId ?? 0);
  const detail = recipeQuery.data;

  const currentKcal = detail?.caloriesKcal ?? slot?.recipe.caloriesKcal ?? 0;
  const cookTime = detail?.cookTimeMinutes ?? slot?.recipe.cookTimeMinutes ?? (slot?.mealType === 'BREAKFAST' ? 15 : 25);
  const voteCount = detail?.voteCount ?? slot?.recipe.voteCount ?? 0;

  return (
    <Modal show={slot !== null} onHide={onCancel} title="Đổi món" locked={submitting}>
      {slot && (
        <div className="flex flex-col gap-space-md p-space-lg">
          <div className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm border border-surface-container">
            {slot.recipe.imageUrl || detail?.imageUrl ? (
              <img
                src={detail?.imageUrl || slot.recipe.imageUrl || ''}
                alt={detail?.title || slot.recipe.title}
                className="h-14 w-14 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-container text-primary">
                <Icon name="restaurant" className="text-[24px]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {MEAL_LABEL[slot.mealType]} · {DAY_LABEL[slot.dayOfWeek]}
                </p>
                {swapCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-fixed/60 px-2 py-0.5 font-label-sm text-[11px] font-semibold text-primary">
                    <Icon name="history" className="text-[12px]" />
                    Đã đổi {swapCount} lần
                  </span>
                )}
              </div>
              <p className="truncate font-label-lg text-label-lg font-bold text-on-surface">
                {detail?.title || slot.recipe.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 font-label-sm text-label-sm text-on-surface-variant">
                <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                  <Icon name="local_fire_department" className="text-[15px] text-amber-600" />
                  {formatNumber(Math.round(currentKcal))} kcal
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="schedule" className="text-[15px] text-outline" />
                  {cookTime} phút
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="favorite" filled className="text-[15px] text-secondary" />
                  {formatNumber(voteCount)}
                </span>
              </div>
              {previousRecipe && (
                <p className="mt-1 text-xs text-on-surface-variant truncate">
                  Món trước khi đổi: <span className="font-medium text-on-surface">{previousRecipe.title}</span> ({Math.round(previousRecipe.caloriesKcal)} kcal)
                </p>
              )}
            </div>
          </div>

          <fieldset className="flex flex-col gap-space-xs">
            <legend className="mb-space-xs font-label-md text-label-md text-on-surface">
              Lý do đổi <span className="font-body-sm text-body-sm text-outline">(không bắt buộc)</span>
            </legend>
            {SWAP_REASONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-center gap-space-sm rounded-lg px-space-sm py-2 font-body-md text-body-md',
                  reason === option.value ? 'bg-primary-fixed text-on-surface' : 'bg-surface-container-low hover:bg-surface-container'
                )}
              >
                <input
                  type="radio"
                  name="swap-reason"
                  value={option.value}
                  checked={reason === option.value}
                  onChange={() => setReason(option.value)}
                  className="accent-primary"
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          <div className="rounded-lg bg-surface-container-low p-3 border border-surface-container text-body-sm font-body-sm text-on-surface-variant flex flex-col gap-1.5">
            <p className="flex items-center gap-1.5 font-medium text-on-surface">
              <Icon name="info" className="text-[16px] text-primary" />
              Tiêu chuẩn món thay thế (FN-MEAL-03):
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-on-surface-variant">
              <li>Cùng trường phái món chay và không chứa thành phần gây dị ứng của bạn.</li>
              <li>
                Lượng calo món mới chênh lệch <strong>không quá 15%</strong> so với món ban đầu ({Math.round(slot.recipe.caloriesKcal)} kcal): nằm trong khoảng{' '}
                <strong className="text-on-surface">
                  {Math.round(slot.recipe.caloriesKcal * 0.85)} – {Math.round(slot.recipe.caloriesKcal * 1.15)} kcal
                </strong>.
              </li>
              <li>
                Còn <strong>{remaining}/{limit}</strong> lần đổi món.
              </li>
            </ul>
          </div>

          {error && <FormAlert tone="warning">{error}</FormAlert>}

          <div className="flex justify-end gap-space-sm">
            <Button variant="ghost" onClick={onCancel} disabled={submitting}>
              Hủy
            </Button>
            <Button onClick={() => onConfirm(reason)} loading={submitting}>
              <Icon name="swap_horiz" className="text-[18px]" />
              Đổi món
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
