import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { FieldError, INPUT_CLASS, INPUT_ERROR_CLASS } from '@/components/ui/forms';
import { cn } from '@/lib/cn';
import { RECIPE_STEPS_MIN, type RecipeFormValues } from '../types/recipe.schemas';

const STEP_BUTTON =
  'flex rounded-lg p-1.5 text-outline hover:bg-surface-container hover:text-on-surface disabled:opacity-40 disabled:hover:bg-transparent';

/** Các bước thực hiện (instructions[]), tối thiểu 02 bước (BR-USR-05); đổi thứ tự được. */
export const RecipeStepFields: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<RecipeFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'instructions' });
  const rootError = errors.instructions?.root?.message ?? errors.instructions?.message;

  return (
    <div className="flex flex-col gap-space-sm">
      <ol className="flex flex-col gap-space-sm">
        {fields.map((field, index) => {
          const error = errors.instructions?.[index]?.text?.message;
          return (
            <li key={field.id} className="flex gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
              <span
                aria-hidden="true"
                className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-container font-label-md text-label-md text-on-primary"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label htmlFor={`step-${field.id}`} className="sr-only">
                  Bước {index + 1}
                </label>
                <textarea
                  id={`step-${field.id}`}
                  rows={3}
                  placeholder={index === 0 ? 'Ví dụ: Ngâm nấm hương 15 phút cho mềm, rửa sạch, cắt đôi.' : `Mô tả bước ${index + 1}…`}
                  aria-invalid={!!error || undefined}
                  disabled={disabled}
                  {...register(`instructions.${index}.text`)}
                  className={cn(INPUT_CLASS, 'resize-y bg-surface-container-lowest', error && INPUT_ERROR_CLASS)}
                />
                <FieldError>{error}</FieldError>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={disabled || index === 0}
                  aria-label={`Đưa bước ${index + 1} lên trên`}
                  className={STEP_BUTTON}
                >
                  <Icon name="arrow_upward" className="text-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={disabled || index === fields.length - 1}
                  aria-label={`Đưa bước ${index + 1} xuống dưới`}
                  className={STEP_BUTTON}
                >
                  <Icon name="arrow_downward" className="text-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={disabled || fields.length <= RECIPE_STEPS_MIN}
                  aria-label={`Xóa bước ${index + 1}`}
                  className={cn(STEP_BUTTON, 'hover:text-error')}
                >
                  <Icon name="delete" className="text-[18px]" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <FieldError>{rootError}</FieldError>
      <Button variant="secondary" onClick={() => append({ text: '' })} disabled={disabled} className="w-fit">
        <Icon name="add" className="text-[18px]" />
        Thêm bước
      </Button>
    </div>
  );
};
