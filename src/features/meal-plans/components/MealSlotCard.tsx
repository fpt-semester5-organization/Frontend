import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { MEAL_ICON, MEAL_LABEL } from '../lib/labels';
import type { MealSlot } from '../types/mealPlan.types';

interface MealSlotCardProps {
  slot: MealSlot;
  /** VIP mới xem calo từng món (BR-PAY-SUB-03). */
  showKcal: boolean;
  /** Thực đơn ACTIVE: cho đánh dấu đã ăn. */
  canComplete: boolean;
  /** Còn hạn mức chỉnh sửa và thực đơn chưa lưu trữ. */
  canSwap: boolean;
  completing: boolean;
  onToggleComplete: () => void;
  onSwap: () => void;
}

/** Một ô bữa ăn trong lưới 7 ngày × 3 bữa: ảnh, tên món, calo (VIP), đã ăn, đổi món. */
export const MealSlotCard: React.FC<MealSlotCardProps> = ({
  slot,
  showKcal,
  canComplete,
  canSwap,
  completing,
  onToggleComplete,
  onSwap,
}) => {
  const { recipe } = slot;

  return (
    <article
      className={cn(
        'flex gap-space-sm rounded-lg border bg-surface-container-lowest p-2 transition-colors lg:h-[236px] lg:flex-col',
        slot.isCompleted ? 'border-primary-fixed-dim bg-primary-fixed/30' : 'border-surface-container'
      )}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-linear-to-br from-primary-fixed to-secondary-fixed lg:h-24 lg:w-full">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-primary">
            <Icon name="restaurant" className="text-[28px]" />
          </span>
        )}
        {slot.isCompleted && (
          <span className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary shadow">
            <Icon name="check" className="text-[16px]" />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
          <Icon name={MEAL_ICON[slot.mealType]} className="text-[14px]" />
          {MEAL_LABEL[slot.mealType]}
        </span>
        <Link
          to={PATHS.RECIPES.DETAIL(recipe.recipeId)}
          className="line-clamp-2 font-label-md text-label-md text-on-surface no-underline hover:text-primary"
          title={recipe.title}
        >
          {recipe.title}
        </Link>
        {showKcal && (
          <span className="font-label-sm text-label-sm text-secondary tabular-nums">
            {formatNumber(Math.round(recipe.caloriesKcal))} kcal
          </span>
        )}

        <div className="mt-auto flex items-center gap-1">
          {canComplete && (
            <button
              type="button"
              onClick={onToggleComplete}
              disabled={completing}
              aria-pressed={slot.isCompleted}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 font-label-sm text-label-sm transition-colors disabled:opacity-60',
                slot.isCompleted
                  ? 'bg-primary text-on-primary hover:bg-primary-container'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              )}
            >
              <Icon name={slot.isCompleted ? 'task_alt' : 'radio_button_unchecked'} className="text-[16px]" />
              {slot.isCompleted ? 'Đã ăn' : 'Chưa ăn'}
            </button>
          )}
          {canSwap && (
            <button
              type="button"
              onClick={onSwap}
              title="Đổi món"
              aria-label={`Đổi món ${MEAL_LABEL[slot.mealType].toLowerCase()}: ${recipe.title}`}
              className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 font-label-sm text-label-sm text-primary transition-colors hover:bg-primary-fixed"
            >
              <Icon name="swap_horiz" className="text-[18px]" />
              {!canComplete && 'Đổi món'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
