import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FieldError, FormAlert, INPUT_CLASS, INPUT_ERROR_CLASS, LABEL_CLASS } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { todayInVietnam } from '@/features/meal-plans/lib/dates';
import { shoppingListSchema, type ShoppingListValues } from '@/features/meal-plans/types/mealPlan.schemas';
import { toApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useCreateShoppingList } from '../hooks/useShoppingList';

/** Tạo danh sách đi chợ từ thực đơn ACTIVE (FN-MEAL-05), rồi chuyển sang SCR-24. */
export const CreateShoppingListDialog: React.FC<{ planId: number; show: boolean; onHide: () => void }> = ({
  planId,
  show,
  onHide,
}) => {
  const navigate = useNavigate();
  const createList = useCreateShoppingList(planId);
  const [conflict, setConflict] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ShoppingListValues>({
    resolver: zodResolver(shoppingListSchema),
    defaultValues: { servingsMultiplier: 1, targetShoppingDate: '' },
  });

  const submit = (values: ShoppingListValues) => {
    setConflict(null);
    createList.mutate(
      {
        servingsMultiplier: values.servingsMultiplier,
        ...(values.targetShoppingDate ? { targetShoppingDate: values.targetShoppingDate } : {}),
      },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || 'Đã tạo danh sách đi chợ.');
          onHide();
          navigate(PATHS.SHOPPING_LISTS.DETAIL(res.data.listId));
        },
        onError: (error) => {
          const apiError = toApiError(error);
          if (applyServerFieldErrors(apiError, setError, ['servingsMultiplier', 'targetShoppingDate'])) return;
          if (apiError.errorCode === 'ERR_SHOPPING_LIST_EXISTS') {
            // API không trả mã danh sách đã có, nên chỉ mở lại được trên trình duyệt đã tạo nó.
            setConflict(
              `${getErrorMessage(apiError)} Danh sách đó được tạo trên trình duyệt hoặc thiết bị khác nên chưa mở được ở đây.`
            );
          } else if (apiError.errorCode === 'ERR_MEAL_PLAN_NOT_ACTIVE') {
            setConflict(getErrorMessage(apiError));
          } else {
            notifyApiError(apiError);
          }
        },
      }
    );
  };

  return (
    <Modal show={show} onHide={onHide} title="Tạo danh sách đi chợ" locked={createList.isPending}>
      <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-space-md p-space-lg">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Hệ thống cộng dồn nguyên liệu của cả 21 bữa và chia theo quầy hàng để bạn đi chợ một lần.
        </p>

        <div className="flex flex-col gap-space-xs">
          <label htmlFor="servings-multiplier" className={LABEL_CLASS}>
            Hệ số khẩu phần
          </label>
          <input
            id="servings-multiplier"
            type="number"
            inputMode="decimal"
            min={1}
            max={10}
            step={0.5}
            aria-invalid={errors.servingsMultiplier ? true : undefined}
            {...register('servingsMultiplier', { valueAsNumber: true })}
            className={cn(INPUT_CLASS, errors.servingsMultiplier && INPUT_ERROR_CLASS)}
          />
          <p className="font-body-sm text-body-sm text-outline">Ví dụ: nấu cho 2 người thì nhập 2. Từ 1 đến 10.</p>
          <FieldError>{errors.servingsMultiplier?.message}</FieldError>
        </div>

        <div className="flex flex-col gap-space-xs">
          <label htmlFor="shopping-date" className={LABEL_CLASS}>
            Ngày đi chợ <span className="font-body-sm text-body-sm text-outline">(không bắt buộc)</span>
          </label>
          <input
            id="shopping-date"
            type="date"
            min={todayInVietnam()}
            {...register('targetShoppingDate')}
            className={cn(INPUT_CLASS, errors.targetShoppingDate && INPUT_ERROR_CLASS)}
          />
          <FieldError>{errors.targetShoppingDate?.message}</FieldError>
        </div>

        {conflict && <FormAlert tone="warning">{conflict}</FormAlert>}

        <div className="flex justify-end gap-space-sm">
          <Button variant="ghost" onClick={onHide} disabled={createList.isPending}>
            Hủy
          </Button>
          <Button type="submit" loading={createList.isPending}>
            <Icon name="shopping_cart" className="text-[18px]" />
            Tạo danh sách
          </Button>
        </div>
      </form>
    </Modal>
  );
};
