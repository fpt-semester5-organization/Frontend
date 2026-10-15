import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { INPUT_CLASS } from '@/components/ui/forms';
import {
  editDetectedItemSchema,
  type EditDetectedItemForm,
} from '../schemas/fridge.schema';
import type { DetectedItem } from '../types/fridge.types';

interface EditDetectedItemModalProps {
  item: DetectedItem | null;
  index: number | null;
  onHide: () => void;
  onSave: (index: number, updated: DetectedItem) => void;
}

export const EditDetectedItemModal: React.FC<EditDetectedItemModalProps> = ({
  item,
  index,
  onHide,
  onSave,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditDetectedItemForm>({
    resolver: zodResolver(editDetectedItemSchema),
    defaultValues: {
      name: '',
      freshnessStatus: 'FRESH',
    },
  });

  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        freshnessStatus: item.freshnessStatus,
      });
    }
  }, [item, reset]);

  const freshness = watch('freshnessStatus');

  const onSubmit = (values: EditDetectedItemForm) => {
    if (item === null || index === null) return;
    onSave(index, {
      ...item,
      name: values.name.trim(),
      freshnessStatus: values.freshnessStatus,
    });
    onHide();
  };

  return (
    <Modal show={!!item} onHide={onHide} title="Sửa tay nguyên liệu AI nhận diện" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="detected-item-name" className="font-label-md text-label-md text-on-surface">
            Tên nguyên liệu
          </label>
          <input
            id="detected-item-name"
            {...register('name')}
            maxLength={100}
            className={INPUT_CLASS}
            placeholder="Ví dụ: Cà rốt, nấm đông cô..."
          />
          {errors.name && (
            <p role="alert" className="font-label-sm text-label-sm text-red-600">
              {errors.name.message}
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-label-md text-label-md text-on-surface">Độ tươi</legend>
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
              <span>NON-FRESH · Dùng sớm</span>
            </button>
          </div>
        </fieldset>

        <div className="mt-2 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onHide} type="button">
            Hủy
          </Button>
          <Button variant="primary" type="submit">
            Cập nhật
          </Button>
        </div>
      </form>
    </Modal>
  );
};
