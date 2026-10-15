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
      freshnessStatus: 'FRESH',
    },
  });

  const freshness = watch('freshnessStatus');

  const handleClose = () => {
    setKeyword('');
    setSelectedIngredient(null);
    reset({ customItemName: '', freshnessStatus: 'FRESH' });
    addMutation.reset();
    onHide();
  };

  const onSubmit = (values: AddItemForm) => {
    addMutation.mutate(values, {
      onSuccess: () => {
        toast.success(`Đã thêm “${values.customItemName || selectedIngredient?.name}” vào tủ lạnh ảo`);
        handleClose();
      },
      onError: (err) => {
        const apiErr = toApiError(err);
        if (apiErr.errorCode === 'ERR_FRIDGE_ITEM_EXISTS') {
          handleClose();
          const msg = apiErr.message || 'Nguyên liệu này đã có trong tủ lạnh ảo.';
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

  return (
    <Modal show={show} onHide={handleClose} title="Thêm nguyên liệu vào tủ" size="sm">
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
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập tên: cà rốt, cải thảo, nấm rơm..."
              autoComplete="off"
              className={INPUT_CLASS}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
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
              <div className="p-3 font-body-sm text-body-sm text-on-surface-variant">
                Không tìm thấy nguyên liệu phù hợp.
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
            placeholder={selectedIngredient?.name ?? 'Mặc định lấy tên nguyên liệu'}
            maxLength={100}
            className={INPUT_CLASS}
          />
          {errors.customItemName && (
            <p role="alert" className="font-label-sm text-label-sm text-red-600">
              {errors.customItemName.message}
            </p>
          )}
        </div>

        {/* Chọn độ tươi */}
        <fieldset className="flex flex-col gap-2">
          <legend className="font-label-md text-label-md text-on-surface">Độ tươi ban đầu</legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setValue('freshnessStatus', 'FRESH')}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 font-label-md text-label-md transition-all ${
                freshness === 'FRESH'
                  ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <Icon name="eco" className="text-[18px] text-emerald-600" />
              <span>FRESH · Còn tươi</span>
            </button>
            <button
              type="button"
              onClick={() => setValue('freshnessStatus', 'NON-FRESH')}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 font-label-md text-label-md transition-all ${
                freshness === 'NON-FRESH'
                  ? 'border-amber-500 bg-amber-50 font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <Icon name="hourglass_bottom" className="text-[18px] text-amber-600" />
              <span>NON-FRESH · Sắp hỏng</span>
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
            disabled={!selectedIngredient}
          >
            Thêm vào tủ
          </Button>
        </div>
      </form>
    </Modal>
  );
};
