import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { INPUT_CLASS, INPUT_ERROR_CLASS } from '@/components/ui/forms';
import { cn } from '@/lib/cn';
import { useFoodSearch } from '../hooks/useRecipes';
import { FOOD_NAME_MAX } from '../types/recipe.schemas';
import type { Food } from '../types/recipe.types';

export interface FoodValue {
  foodId: number | null;
  foodName: string;
}

interface FoodComboboxProps {
  id: string;
  value: FoodValue;
  /** `food` có khi chọn một món có sẵn trong danh sách. */
  onChange: (value: FoodValue, food?: Food) => void;
  /** Cho thêm món mới (soạn công thức). Bộ lọc kho công thức chỉ chọn món có sẵn. */
  allowCreate?: boolean;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  /** Ref của ô nhập (react-hook-form focus vào ô khi có lỗi). */
  inputRef?: React.Ref<HTMLInputElement>;
  onBlur?: () => void;
}

const DEBOUNCE_MS = 300;
const same = (a: string, b: string) => a.trim().toLocaleLowerCase('vi') === b.trim().toLocaleLowerCase('vi');

/**
 * Ô chọn món ăn (Foods) dạng combobox: gõ để tìm qua GET /foods/search, chọn món có sẵn hoặc thêm món mới
 * ("Combobox with Create" của Backend #86). Bàn phím: ↑/↓ chọn, Enter xác nhận, Esc đóng (WAI-ARIA combobox).
 */
export const FoodCombobox: React.FC<FoodComboboxProps> = ({
  id,
  value,
  onChange,
  allowCreate = false,
  placeholder,
  disabled,
  invalid,
  describedBy,
  className,
  inputRef,
  onBlur,
}) => {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [term, setTerm] = useState(value.foodName);
  const blurTimer = useRef<number>();

  // Gõ xong 300 ms mới tìm, tránh gọi API theo từng phím.
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(value.foodName), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value.foodName]);
  useEffect(() => () => window.clearTimeout(blurTimer.current), []);

  const search = useFoodSearch(term, open);
  const foods = search.data ?? [];
  const typed = value.foodName.trim();
  const canCreate = allowCreate && typed.length > 0 && !foods.some((food) => same(food.foodName, typed));
  const options: ({ kind: 'food'; food: Food } | { kind: 'create' })[] = [
    ...foods.map((food) => ({ kind: 'food' as const, food })),
    ...(canCreate ? [{ kind: 'create' as const }] : []),
  ];

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (option.kind === 'food') onChange({ foodId: option.food.foodId, foodName: option.food.foodName }, option.food);
    else onChange({ foodId: null, foodName: typed });
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (options.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + options.length) % options.length);
    } else if (event.key === 'Enter') {
      if (open && active >= 0) {
        event.preventDefault();
        choose(active);
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Icon name="restaurant_menu" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-outline" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={value.foodName}
          maxLength={FOOD_NAME_MAX}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => {
            onChange({ foodId: null, foodName: event.target.value });
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          // Chờ một nhịp để cú bấm vào lựa chọn kịp chạy trước khi danh sách đóng.
          onBlur={() => {
            onBlur?.();
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
          className={cn(INPUT_CLASS, 'h-11 pr-10 pl-10', invalid && INPUT_ERROR_CLASS)}
        />
        {value.foodId !== null && (
          <Icon
            name="check_circle"
            filled
            label="Đã chọn món có sẵn"
            className="absolute top-1/2 right-3 -translate-y-1/2 text-[20px] text-primary"
          />
        )}
      </div>

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Món ăn gợi ý"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-surface-container bg-surface-container-lowest p-1 shadow-xl"
        >
          {search.isPending && (
            <li role="presentation" className="px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
              Đang tìm món…
            </li>
          )}
          {search.isError && (
            <li role="presentation" className="flex items-center gap-2 px-3 py-2 font-body-sm text-body-sm text-error">
              Không tải được danh sách món.
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => void search.refetch()} className="text-primary hover:underline">
                Thử lại
              </button>
            </li>
          )}
          {!search.isPending && !search.isError && options.length === 0 && (
            <li role="presentation" className="px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
              {typed ? 'Không có món nào khớp.' : 'Chưa có món nào.'}
            </li>
          )}
          {options.map((option, index) => (
            <li
              key={option.kind === 'food' ? option.food.foodId : 'create'}
              id={optionId(index)}
              role="option"
              aria-selected={option.kind === 'food' ? option.food.foodId === value.foodId : false}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface',
                index === active && 'bg-surface-container'
              )}
            >
              {option.kind === 'food' ? (
                <>
                  <span className="min-w-0 flex-1 truncate">{option.food.foodName}</span>
                  {option.food.foodId === value.foodId && <Icon name="check" className="text-[18px] text-primary" />}
                </>
              ) : (
                <>
                  <Icon name="add_circle" className="text-[18px] text-primary" />
                  <span className="min-w-0 flex-1 truncate">
                    Thêm món mới “<strong className="font-semibold">{typed}</strong>”
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
