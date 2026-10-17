import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { INPUT_CLASS, INPUT_ERROR_CLASS } from '@/components/ui/forms';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { useIngredientSearch } from '../hooks/useRecipes';
import type { Ingredient } from '../types/recipe.types';

const SEARCH_DELAY_MS = 300;

const FOOD_GROUP_TAG: Partial<Record<Ingredient['foodGroup'], string>> = {
  EGG: 'Trứng',
  DAIRY: 'Sữa',
  POULTRY: 'Thịt trắng',
  SEAFOOD: 'Hải sản',
};

interface IngredientPickerProps {
  id: string;
  /** Tên đang hiển thị (đã chọn) và mã nguyên liệu; null khi chưa chọn từ danh sách. */
  name: string;
  ingredientId: number | null;
  onSelect: (ingredient: Ingredient) => void;
  /** Người dùng sửa chữ sau khi đã chọn: bỏ liên kết với nguyên liệu cũ. */
  onClear: () => void;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}

/**
 * Ô chọn nguyên liệu (combobox): gõ tên → GET /ingredients?keyword= (FN-PROF-08) → chọn một mục.
 * Chỉ nhận nguyên liệu có trong danh mục vì POST /recipes cần ingredientId.
 */
export const IngredientPicker: React.FC<IngredientPickerProps> = ({
  id,
  name,
  ingredientId,
  onSelect,
  onClear,
  invalid,
  describedBy,
  disabled,
}) => {
  const listId = useId();
  const [text, setText] = useState(name);
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number>();
  const search = useIngredientSearch(term);
  const options = search.data?.items ?? [];

  // Form đặt lại giá trị (xóa dòng, nạp lại) thì ô nhập theo form.
  useEffect(() => setText(name), [name]);

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(text.trim()), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => setActive(0), [term]);
  useEffect(() => () => window.clearTimeout(blurTimer.current), []);

  const choose = (ingredient: Ingredient) => {
    onSelect(ingredient);
    setText(ingredient.name);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && options[active]) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && term.length > 0 && text.trim().length > 0;
  const activeId = showList && options[active] ? `${listId}-${options[active].ingredientId}` : undefined;

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={text}
        disabled={disabled}
        maxLength={100}
        placeholder="Gõ tên nguyên liệu…"
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          if (ingredientId !== null) onClear();
        }}
        onFocus={() => text.trim() && setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        className={cn(INPUT_CLASS, 'h-11 pr-9', invalid && INPUT_ERROR_CLASS)}
      />
      {ingredientId !== null && (
        <Icon
          name="check_circle"
          filled
          label="Đã chọn từ danh mục"
          className="absolute top-1/2 right-3 -translate-y-1/2 text-[18px] text-primary"
        />
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Gợi ý nguyên liệu"
          className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-xl bg-surface-container-lowest py-1 shadow-card-hover ring-1 ring-outline-variant/40"
        >
          {search.isPending || (search.isFetching && options.length === 0) ? (
            <li role="presentation" className="px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
              Đang tìm…
            </li>
          ) : search.isError ? (
            <li role="presentation" className="flex items-center justify-between gap-2 px-3 py-2 font-body-sm text-body-sm text-error">
              Không tải được gợi ý.
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => search.refetch()}
                className="font-label-sm text-label-sm text-primary hover:underline"
              >
                Thử lại
              </button>
            </li>
          ) : options.length === 0 ? (
            <li role="presentation" className="px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
              Không có “{term}” trong danh mục nguyên liệu. Thử tên gọi khác.
            </li>
          ) : (
            options.map((option, index) => {
              const tag = FOOD_GROUP_TAG[option.foodGroup];
              return (
                <li
                  key={option.ingredientId}
                  id={`${listId}-${option.ingredientId}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 px-3 py-2',
                    index === active ? 'bg-surface-container' : 'hover:bg-surface-container-low'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-body-md text-body-md text-on-surface">{option.name}</span>
                    <span className="block font-label-sm text-label-sm text-on-surface-variant">
                      {formatNumber(option.caloriesPer100g)} kcal/100g · đơn vị {option.standardUnit}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {tag && (
                      <span className="rounded-full bg-secondary-fixed px-2 py-0.5 font-label-sm text-label-sm text-on-secondary-fixed">
                        {tag}
                      </span>
                    )}
                    {option.isAllium && (
                      <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 font-label-sm text-label-sm text-on-tertiary-fixed">
                        Ngũ vị tân
                      </span>
                    )}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
