import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { INPUT_CLASS } from '@/components/ui/forms';
import { apiErrorMessage } from '@/api/http';
import { toApiError } from '@/lib/apiError';
import { toast } from '@/stores/ui.store';
import { useAddFridgeItem, useIngredientSearch } from '../hooks/useFridge';
import { addItemSchema, type AddItemForm } from '../schemas/fridge.schema';
import type { IngredientOption } from '../types/fridge.types';

interface AddItemModalProps {
  show: boolean;
  onHide: () => void;
  onExists?: (message: string) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ show, onHide, onExists }) => {
  const [keyword, setKeyword] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientOption | null>(null);

  const search = useIngredientSearch(keyword, show);
  const addMutation = useAddFridgeItem();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<AddItemForm>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      customItemName: '',
      quantity: '',
      unit: '',
      freshnessStatus: 'FRESH',
    },
  });

  const freshness = watch('freshnessStatus');
  const watchedCustomName = watch('customItemName');
  const watchedQuantity = watch('quantity');
  const watchedUnit = watch('unit');

  const handleClose = () => {
    setKeyword('');
    setSelectedIngredient(null);
    reset({ customItemName: '', quantity: '', unit: '', freshnessStatus: 'FRESH' });
    addMutation.reset();
    onHide();
  };

  const onSubmit = (values: AddItemForm) => {
    // Ghép số lượng và đơn vị vào tên nguyên liệu
    const baseName = values.customItemName?.trim() || selectedIngredient?.name || keyword.trim();
    if (!baseName) {
      toast.warning('Vui lòng chọn hoặc nhập tên nguyên liệu.');
      return;
    }
    const qty = values.quantity?.trim();
    const unit = values.unit?.trim();
    const fullQty = qty ? (unit ? `${qty} ${unit}` : qty) : (unit ? `1 ${unit}` : '');
    const finalCustomName = fullQty ? `${baseName} (${fullQty})` : baseName;

    const payload: AddItemForm = {
      ...values,
      ingredientId: selectedIngredient?.ingredientId && selectedIngredient.ingredientId > 0 ? selectedIngredient.ingredientId : undefined,
      customItemName: finalCustomName,
    };

    addMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(`Đã thêm “${finalCustomName}” vào tủ lạnh thông minh`);
        handleClose();
      },
      onError: (err) => {
        const apiErr = toApiError(err);
        if (apiErr.errorCode === 'ERR_FRIDGE_ITEM_EXISTS') {
          handleClose();
          const msg = apiErr.message || 'Nguyên liệu này đã có trong tủ lạnh thông minh.';
          if (onExists) onExists(msg);
          else toast.warning(msg);
          return;
        }
        if (apiErr.errorCode === 'ERR_VALIDATION' && apiErr.details) {
          apiErr.details.forEach((d) => {
            setError(d.field as keyof AddItemForm, { message: d.message });
          });
          return;
        }
        toast.error(apiErrorMessage(err, 'Không thể thêm nguyên liệu vào tủ lạnh'));
      },
    });
  };

  // Preview tên hiển thị
  const previewBase = watchedCustomName?.trim() || selectedIngredient?.name || keyword.trim();
  const previewQty = watchedQuantity?.trim();
  const previewUnit = watchedUnit?.trim();
  const previewFullQty = previewQty ? (previewUnit ? `${previewQty} ${previewUnit}` : previewQty) : (previewUnit ? `1 ${previewUnit}` : '');
  const previewFullName = previewFullQty ? `${previewBase} (${previewFullQty})` : previewBase;

  const canSubmit = Boolean(selectedIngredient || keyword.trim() || watchedCustomName?.trim());

  return (
    <Modal show={show} onHide={handleClose} title="Thêm nguyên liệu vào tủ" className="max-w-[460px]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5" noValidate>
        {/* Tìm kiếm nguyên liệu */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fridge-ing-search" className="font-label-md text-label-md text-on-surface">
            Chọn nguyên liệu hệ thống <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="fridge-ing-search"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                if (selectedIngredient && e.target.value !== selectedIngredient.name) {
                  setSelectedIngredient(null);
                }
              }}
              placeholder="Nhập tên: cà rốt, cải thảo, nấm rơm..."
              autoComplete="off"
              className={INPUT_CLASS}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => {
                  setKeyword('');
                  setSelectedIngredient(null);
                }}
                className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
                aria-label="Xóa từ khóa"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            )}
          </div>

          {/* Danh sách kết quả tìm kiếm */}
          <div
            className="max-h-40 overflow-y-auto rounded-lg border border-outline-variant/60 bg-surface-container-low"
            role="listbox"
            aria-label="Kết quả tìm kiếm nguyên liệu"
          >
            {search.isPending ? (
              <div className="p-3 text-center font-body-sm text-body-sm text-on-surface-variant">
                Đang tìm nguyên liệu...
              </div>
            ) : search.isError ? (
              <div className="p-3 font-body-sm text-body-sm text-red-600">
                {apiErrorMessage(search.error, 'Lỗi tìm kiếm')}
              </div>
            ) : keyword && (search.data ?? []).length === 0 ? (
              <div className="p-3 font-body-sm text-body-sm text-on-surface-variant flex flex-col gap-1.5">
                <span>Chưa có trong danh mục mẫu. Bạn có thể thêm trực tiếp:</span>
                <button
                  type="button"
                  onClick={() => {
                    const opt = { ingredientId: 0, name: keyword.trim() };
                    setSelectedIngredient(opt);
                    setValue('ingredientId', undefined);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors w-fit"
                >
                  <Icon name="add" className="text-[16px]" />
                  <span>Dùng tên: “{keyword.trim()}”</span>
                </button>
              </div>
            ) : !keyword && !selectedIngredient ? (
              <div className="p-3 text-center font-body-sm text-body-sm text-on-surface-variant">
                Nhập từ khóa để tìm nguyên liệu chuẩn
              </div>
            ) : (
              (search.data ?? []).map((opt) => (
                <button
                  key={opt.ingredientId}
                  type="button"
                  role="option"
                  aria-selected={selectedIngredient?.ingredientId === opt.ingredientId}
                  onClick={() => {
                    setSelectedIngredient(opt);
                    setValue('ingredientId', opt.ingredientId, { shouldValidate: true });
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left font-body-sm text-body-sm transition-colors hover:bg-surface-container ${
                    selectedIngredient?.ingredientId === opt.ingredientId
                      ? 'bg-primary-fixed/40 font-semibold text-primary'
                      : 'text-on-surface'
                  }`}
                >
                  <span>{opt.name}</span>
                  {selectedIngredient?.ingredientId === opt.ingredientId && (
                    <Icon name="check" className="text-[18px] text-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          {selectedIngredient && (
            <p className="font-label-sm text-label-sm text-primary">
              ✓ Đã chọn: <strong>{selectedIngredient.name}</strong>
            </p>
          )}

          {errors.ingredientId && (
            <p role="alert" className="font-label-sm text-label-sm text-red-600">
              {errors.ingredientId.message}
            </p>
          )}
        </div>

        {/* Tên tùy chỉnh */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fridge-custom-name" className="font-label-md text-label-md text-on-surface">
            Tên hiển thị tùy chỉnh (tùy chọn)
          </label>
          <input
            id="fridge-custom-name"
            {...register('customItemName')}
            placeholder={selectedIngredient?.name || keyword || 'Mặc định lấy tên nguyên liệu'}
            maxLength={100}
            className={INPUT_CLASS}
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
            <label htmlFor="fridge-item-quantity" className="font-label-md text-label-md text-on-surface">
              Số lượng
            </label>
            <input
              id="fridge-item-quantity"
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
            <label htmlFor="fridge-item-unit" className="font-label-md text-label-md text-on-surface">
              Đơn vị tính
            </label>
            <div className="relative">
              <input
                id="fridge-item-unit"
                {...register('unit')}
                maxLength={30}
                placeholder="Ví dụ: quả, kg, g, bó..."
                list="fridge-common-units"
                className={INPUT_CLASS}
              />
              <datalist id="fridge-common-units">
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

        {/* Xem trước tên hiển thị khi có số lượng */}
        {previewFullName && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-on-surface flex items-center justify-between">
            <span className="text-on-surface-variant">Tên sẽ lưu vào kho tủ lạnh:</span>
            <strong className="text-primary font-semibold text-sm">{previewFullName}</strong>
          </div>
        )}

        {/* Chọn độ tươi */}
        <fieldset className="flex flex-col gap-2">
          <legend className="font-label-md text-label-md text-on-surface">Độ tươi ban đầu</legend>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setValue('freshnessStatus', 'FRESH')}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2.5 text-xs sm:text-sm font-semibold transition-all min-w-0 ${
                freshness === 'FRESH'
                  ? 'border-emerald-500 bg-[#eaf3ec] text-[#2d5a38] shadow-xs'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <Icon name="eco" className="text-[17px] text-emerald-600 shrink-0" />
              <span className="truncate">FRESH · Còn tươi</span>
            </button>
            <button
              type="button"
              onClick={() => setValue('freshnessStatus', 'NON-FRESH')}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2.5 text-xs sm:text-sm font-semibold transition-all min-w-0 ${
                freshness === 'NON-FRESH'
                  ? 'border-amber-500 bg-[#fef6ea] text-[#935216] shadow-xs'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <Icon name="hourglass_bottom" className="text-[17px] text-amber-600 shrink-0" />
              <span className="truncate">NON-FRESH · Sắp hỏng</span>
            </button>
          </div>
        </fieldset>

        {/* Nút hành động */}
        <div className="mt-2 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={handleClose} type="button">
            Hủy
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={addMutation.isPending}
            disabled={!canSubmit}
          >
            Thêm vào tủ
          </Button>
        </div>
      </form>
    </Modal>
  );
};
