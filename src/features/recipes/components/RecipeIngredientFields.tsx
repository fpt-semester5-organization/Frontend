import React, { useId } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { FieldError, INPUT_CLASS, INPUT_ERROR_CLASS } from '@/components/ui/forms';
import { cn } from '@/lib/cn';
import { UNIT_MAX, UNIT_SUGGESTIONS, emptyIngredientRow, schoolConflict, type RecipeFormValues } from '../types/recipe.schemas';
import type { DietarySchool } from '../types/recipe.types';
import { IngredientPicker } from './IngredientPicker';

interface RecipeIngredientFieldsProps {
  /** Trường phái đang chọn: cảnh báo sớm nguyên liệu bị cấm (Red Alert, D109). */
  school: DietarySchool | undefined;
  disabled: boolean;
}

/** Danh sách nguyên liệu kèm định lượng và đơn vị (BR-USR-05): chọn từ danh mục GET /ingredients. */
export const RecipeIngredientFields: React.FC<RecipeIngredientFieldsProps> = ({ school, disabled }) => {
  const unitListId = useId();
  const {
    control,
    register,
    setValue,
    formState: { errors, isSubmitted },
  } = useFormContext<RecipeFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'ingredients' });
  const rows = useWatch({ control, name: 'ingredients' });
  const rootError = errors.ingredients?.root?.message ?? errors.ingredients?.message;
  const setOptions = { shouldDirty: true, shouldValidate: isSubmitted };

  return (
    <div className="flex flex-col gap-space-sm">
      <ul className="flex flex-col gap-space-sm">
        {fields.map((field, index) => {
          const row = rows?.[index];
          const rowErrors = errors.ingredients?.[index];
          const conflict = schoolConflict(row?.info ?? null, school);
          const errorId = `ingredient-${field.id}-error`;
          const messages = [rowErrors?.ingredientId?.message, rowErrors?.quantity?.message, rowErrors?.unit?.message].filter(Boolean);

          return (
            <li key={field.id} className="rounded-xl bg-surface-container-low p-space-sm">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_8rem_auto] sm:items-center">
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor={`ingredient-${field.id}`} className="sr-only">
                    Nguyên liệu {index + 1}
                  </label>
                  <IngredientPicker
                    id={`ingredient-${field.id}`}
                    name={row?.name ?? ''}
                    ingredientId={row?.ingredientId ?? null}
                    invalid={!!rowErrors?.ingredientId}
                    describedBy={messages.length ? errorId : undefined}
                    disabled={disabled}
                    onSelect={(ingredient) => {
                      setValue(`ingredients.${index}.name`, ingredient.name);
                      setValue(`ingredients.${index}.info`, ingredient);
                      setValue(`ingredients.${index}.ingredientId`, ingredient.ingredientId, setOptions);
                      if (!row?.unit.trim()) setValue(`ingredients.${index}.unit`, ingredient.standardUnit, setOptions);
                    }}
                    onClear={() => {
                      setValue(`ingredients.${index}.info`, null);
                      setValue(`ingredients.${index}.ingredientId`, null, setOptions);
                    }}
                  />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Lượng"
                  aria-label={`Định lượng nguyên liệu ${index + 1}`}
                  aria-invalid={!!rowErrors?.quantity || undefined}
                  disabled={disabled}
                  {...register(`ingredients.${index}.quantity`)}
                  className={cn(INPUT_CLASS, 'h-11 bg-surface-container-lowest tabular-nums', rowErrors?.quantity && INPUT_ERROR_CLASS)}
                />
                <input
                  type="text"
                  list={unitListId}
                  autoComplete="off"
                  maxLength={UNIT_MAX}
                  placeholder="Đơn vị"
                  aria-label={`Đơn vị nguyên liệu ${index + 1}`}
                  aria-invalid={!!rowErrors?.unit || undefined}
                  disabled={disabled}
                  {...register(`ingredients.${index}.unit`)}
                  className={cn(INPUT_CLASS, 'h-11 bg-surface-container-lowest', rowErrors?.unit && INPUT_ERROR_CLASS)}
                />
                <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
                  <label className="flex cursor-pointer items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                    <input type="checkbox" disabled={disabled} {...register(`ingredients.${index}.isOptional`)} className="accent-primary" />
                    Tùy chọn
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={disabled || fields.length <= 1}
                    aria-label={`Xóa nguyên liệu ${index + 1}`}
                    title="Xóa nguyên liệu"
                    className="flex rounded-lg p-1.5 text-outline hover:bg-surface-container hover:text-error disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <Icon name="delete" className="text-[20px]" />
                  </button>
                </div>
              </div>
              {messages.length > 0 && (
                <p id={errorId} role="alert" className="mt-1 font-label-sm text-label-sm text-error">
                  {messages.join(' ')}
                </p>
              )}
              {conflict && (
                <p className="mt-1 flex items-start gap-1 font-label-sm text-label-sm text-warning">
                  <Icon name="warning" className="text-[16px]" />
                  {conflict} Công thức sẽ bị gỡ và chờ quản trị viên xem xét (Red Alert).
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <datalist id={unitListId}>
        {UNIT_SUGGESTIONS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      <FieldError>{rootError}</FieldError>
      <Button variant="secondary" onClick={() => append(emptyIngredientRow())} disabled={disabled} className="w-fit">
        <Icon name="add" className="text-[18px]" />
        Thêm nguyên liệu
      </Button>
    </div>
  );
};
