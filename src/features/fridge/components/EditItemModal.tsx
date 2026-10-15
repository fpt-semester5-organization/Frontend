import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { INPUT_CLASS } from '@/components/ui/forms';
import { apiErrorMessage } from '@/api/http';
import { toApiError } from '@/lib/apiError';
import { toast } from '@/stores/ui.store';
import { useUpdateFridgeItem } from '../hooks/useFridge';
import { editItemSchema, type EditItemForm } from '../schemas/fridge.schema';
import type { FridgeItem } from '../types/fridge.types';

interface EditItemModalProps {
  item: FridgeItem | null;
  onHide: () => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({ item, onHide }) => {
  const updateMutation = useUpdateFridgeItem();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<EditItemForm>({
    resolver: zodResolver(editItemSchema),
    defaultValues: {
      customItemName: '',
      freshnessStatus: 'FRESH',
    },
  });

  useEffect(() => {
    if (item) {
      reset({
        customItemName: item.name,
        freshnessStatus: item.freshnessStatus,
      });
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, reset]);

  const freshness = watch('freshnessStatus');

  const onSubmit = (values: EditItemForm) => {
    if (!item) return;

    updateMutation.mutate(
      { id: item.inventoryId, form: values },
      {
        onSuccess: () => {
          toast.success(`Đã cập nhật “${values.customItemName || item.name}”`);
          onHide();
        },
        onError: (err) => {
          const apiErr = toApiError(err);
          if (apiErr.errorCode === 'ERR_VALIDATION' && apiErr.details) {
            apiErr.details.forEach((d) => {
              setError(d.field as keyof EditItemForm, { message: d.message });
            });
            return;
          }
          toast.error(apiErrorMessage(err, 'Không thể cập nhật nguyên liệu'));
        },
      },
    );
  };

  return (
    <Modal show={!!item} onHide={onHide} title="Chỉnh sửa nguyên liệu" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5" noValidate>
        {/* Tên hiển thị */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fridge-edit-name" className="font-label-md text-label-md text-on-surface">
            Tên nguyên liệu hiển thị
          </label>
          <input
            id="fridge-edit-name"
            {...register('customItemName')}
            maxLength={100}
            className={INPUT_CLASS}
            placeholder="Ví dụ: Cà chua bi, nấm rơm tươi..."
          />
          {errors.customItemName && (
            <p role="alert" className="font-label-sm text-label-sm text-red-600">
              {errors.customItemName.message}
            </p>
          )}
        </div>

        {/* Trạng thái độ tươi */}
        <fieldset className="flex flex-col gap-2">
          <legend className="font-label-md text-label-md text-on-surface">Độ tươi (Freshness)</legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setValue('freshnessStatus', 'FRESH')}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-label-md text-label-md transition-all ${
                freshness === 'FRESH'
                  ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-sm'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <Icon name="eco" className="text-[20px] text-emerald-600" />
              <span>FRESH · Còn tươi</span>
            </button>
            <button
              type="button"
              onClick={() => setValue('freshnessStatus', 'NON-FRESH')}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-label-md text-label-md transition-all ${
                freshness === 'NON-FRESH'
                  ? 'border-amber-500 bg-amber-50 font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 shadow-sm'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <Icon name="hourglass_bottom" className="text-[20px] text-amber-600" />
              <span>NON-FRESH · Dùng sớm</span>
            </button>
          </div>
          <p className="font-body-sm text-xs text-on-surface-variant">
            {freshness === 'NON-FRESH'
              ? '⚡ Hệ thống sẽ ưu tiên các món giải cứu nguyên liệu này trước khi bị hỏng.'
              : '🌱 Nguyên liệu được bảo quản tốt, sẵn sàng cho các công thức chay ngon.'}
          </p>
        </fieldset>

        {/* Nút hành động */}
        <div className="mt-2 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onHide} type="button">
            Hủy
          </Button>
          <Button variant="primary" type="submit" loading={updateMutation.isPending}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </Modal>
  );
};
