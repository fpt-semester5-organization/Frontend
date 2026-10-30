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

function parseItemNameAndQuantity(fullName: string) {
  const match = fullName.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    const rawName = match[1].trim();
    const rawQtyFull = match[2].trim();
    const qtyParts = rawQtyFull.match(/^([\d/.,]+)\s*(.*)$/);
    if (qtyParts) {
      return {
        name: rawName,
        quantity: qtyParts[1],
        unit: qtyParts[2],
      };
    }
    return {
      name: rawName,
      quantity: rawQtyFull,
      unit: '',
    };
  }
  return {
    name: fullName,
    quantity: '',
    unit: '',
  };
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
      quantity: '',
      unit: '',
      freshnessStatus: 'FRESH',
    },
  });

  useEffect(() => {
    if (item) {
      const parsed = parseItemNameAndQuantity(item.name);
      reset({
        customItemName: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
        freshnessStatus: item.freshnessStatus,
      });
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, reset]);

  const freshness = watch('freshnessStatus');
  const watchedCustomName = watch('customItemName');
  const watchedQuantity = watch('quantity');
  const watchedUnit = watch('unit');

  const onSubmit = (values: EditItemForm) => {
    if (!item) return;

    // Ghép số lượng & đơn vị vào tên
    const baseName = values.customItemName?.trim() || item.name;
    const qty = values.quantity?.trim();
    const unit = values.unit?.trim();
    const fullQty = qty ? (unit ? `${qty} ${unit}` : qty) : (unit ? `1 ${unit}` : '');
    const finalName = fullQty ? `${baseName} (${fullQty})` : baseName;

    updateMutation.mutate(
      {
        id: item.inventoryId,
        form: {
          customItemName: finalName,
          freshnessStatus: values.freshnessStatus,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Đã cập nhật “${finalName}”`);
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

  const previewBase = watchedCustomName?.trim() || item?.name || '';
  const previewQty = watchedQuantity?.trim();
  const previewUnit = watchedUnit?.trim();
  const previewFullQty = previewQty ? (previewUnit ? `${previewQty} ${previewUnit}` : previewQty) : (previewUnit ? `1 ${previewUnit}` : '');
  const previewFullName = previewFullQty ? `${previewBase} (${previewFullQty})` : previewBase;

  return (
    <Modal show={!!item} onHide={onHide} title="Chỉnh sửa nguyên liệu" className="max-w-[460px]">
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

        {/* Số lượng và đơn vị tính */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fridge-edit-quantity" className="font-label-md text-label-md text-on-surface">
              Số lượng
            </label>
            <input
              id="fridge-edit-quantity"
              {...register('quantity')}
              maxLength={30}
              placeholder="Ví dụ: 3, 500, 1.5, 1/2..."
              className={INPUT_CLASS}
            />
            {errors.quantity && (
              <p role="alert" className="font-label-sm text-label-sm text-red-600">
                {errors.quantity.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fridge-edit-unit" className="font-label-md text-label-md text-on-surface">
              Đơn vị tính
            </label>
            <div className="relative">
              <input
                id="fridge-edit-unit"
                {...register('unit')}
                maxLength={30}
                placeholder="Ví dụ: quả, kg, g, bó..."
                list="fridge-edit-common-units"
                className={INPUT_CLASS}
              />
              <datalist id="fridge-edit-common-units">
                <option value="quả" />
                <option value="trái" />
                <option value="củ" />
                <option value="bắp" />
                <option value="g (gam)" />
                <option value="kg" />
                <option value="bó" />
                <option value="túi" />
                <option value="hộp" />
                <option value="miếng" />
                <option value="cây" />
                <option value="tép" />
                <option value="lon" />
                <option value="ml" />
                <option value="lít" />
              </datalist>
            </div>
            {errors.unit && (
              <p role="alert" className="font-label-sm text-label-sm text-red-600">
                {errors.unit.message}
              </p>
            )}
          </div>
        </div>

        {/* Xem trước tên */}
        {previewFullName && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-on-surface flex items-center justify-between">
            <span className="text-on-surface-variant">Tên hiển thị:</span>
            <strong className="text-primary font-semibold text-sm">{previewFullName}</strong>
          </div>
        )}

        {/* Trạng thái độ tươi */}
        <fieldset className="flex flex-col gap-2">
          <legend className="font-label-md text-label-md text-on-surface">Độ tươi (Freshness)</legend>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue('freshnessStatus', 'FRESH')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                freshness === 'FRESH'
                  ? 'border-emerald-500 bg-[#eaf3ec] text-[#2d5a38] shadow-xs ring-1 ring-emerald-500'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <Icon name="eco" className="text-[18px] text-emerald-600 shrink-0" />
              <div className="flex flex-col items-start leading-tight text-left">
                <span className="font-bold text-xs sm:text-sm">Còn tươi</span>
                <span className="text-[10px] font-semibold uppercase opacity-75">FRESH</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setValue('freshnessStatus', 'NON-FRESH')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                freshness === 'NON-FRESH'
                  ? 'border-amber-500 bg-[#fef6ea] text-[#935216] shadow-xs ring-1 ring-amber-500'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <Icon name="hourglass_bottom" className="text-[18px] text-amber-600 shrink-0" />
              <div className="flex flex-col items-start leading-tight text-left">
                <span className="font-bold text-xs sm:text-sm">Sắp hỏng</span>
                <span className="text-[10px] font-semibold uppercase opacity-75">NON-FRESH</span>
              </div>
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
