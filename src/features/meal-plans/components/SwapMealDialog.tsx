import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { DAY_LABEL, MEAL_LABEL, SWAP_REASONS } from '../lib/labels';
import type { MealSlot, SwapReason } from '../types/mealPlan.types';

interface SwapMealDialogProps {
  slot: MealSlot | null;
  remaining: number;
  limit: number;
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
  submitting,
  error,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState<SwapReason | null>(null);

  return (
    <Modal show={slot !== null} onHide={onCancel} title="Đổi món" locked={submitting}>
      {slot && (
        <div className="flex flex-col gap-space-md p-space-lg">
          <div className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
            <Icon name="restaurant" className="text-[22px] text-primary" />
            <div className="min-w-0">
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {MEAL_LABEL[slot.mealType]} · {DAY_LABEL[slot.dayOfWeek]}
              </p>
              <p className="truncate font-label-lg text-label-lg text-on-surface">{slot.recipe.title}</p>
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

          <p className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
            <Icon name="info" className="mt-0.5 text-[16px]" />
            Món mới cùng trường phái, không chứa chất gây dị ứng của bạn và chênh không quá 15% calo. Còn {remaining}/
            {limit} lần đổi.
          </p>

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
