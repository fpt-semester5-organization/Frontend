import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useCategories, useDietarySchools } from '@/features/recipes/hooks/useRecipes';
import { cn } from '@/lib/cn';
import type { PostSort } from '../types/community.types';

const COOK_TIMES = [15, 30, 60, 120] as const;

const CONTENT_TYPES = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'POST', label: 'Bài viết (Blog)' },
  { value: 'RECIPE', label: 'Công thức' },
] as const;

interface FeedFiltersProps {
  className?: string;
  onFilterChange?: () => void;
}

export const FeedFilters: React.FC<FeedFiltersProps> = ({ className, onFilterChange }) => {
  const [params, setSearchParams] = useSearchParams();
  const categories = useCategories();
  const schools = useDietarySchools();

  const type = params.get('type') ?? 'ALL';
  const sort: PostSort = params.get('sort') === 'POPULAR' ? 'POPULAR' : 'NEWEST';
  const selectedCategory = params.get('categoryId');
  const selectedSchool = params.get('dietarySchoolId');
  const selectedCookTime = params.get('maxCookTime');
  const selectedIngredient = params.get('ingredient') ?? '';

  const isPostOnly = type === 'POST';

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page'); // Reset về trang 1 khi lọc
    setSearchParams(next);
    onFilterChange?.();
  };

  const activeCount = [
    type !== 'ALL' ? type : null,
    selectedCategory,
    selectedSchool,
    selectedCookTime,
    selectedIngredient,
  ].filter(Boolean).length;

  const resetFilters = () => {
    const next = new URLSearchParams(params);
    ['type', 'categoryId', 'dietarySchoolId', 'maxCookTime', 'ingredient', 'page'].forEach((k) =>
      next.delete(k)
    );
    setSearchParams(next);
    onFilterChange?.();
  };

  const chipClass = (active: boolean, disabled?: boolean) =>
    cn(
      'rounded-full px-3 py-1 font-label-sm text-label-sm transition-colors cursor-pointer select-none',
      active
        ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
      disabled && 'opacity-40 pointer-events-none cursor-not-allowed'
    );

  return (
    <div
      className={cn(
        'flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-md shadow-card border border-surface-container/60',
        className
      )}
    >
      <div className="flex items-center justify-between pb-2 border-b border-surface-container">
        <div className="flex items-center gap-2">
          <Icon name="tune" className="text-[20px] text-primary" />
          <h3 className="font-label-md text-label-md font-bold text-on-surface">Bộ lọc cộng đồng</h3>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="font-label-sm text-label-sm text-secondary hover:underline cursor-pointer"
          >
            Đặt lại ({activeCount})
          </button>
        )}
      </div>

      {/* 1. Lọc theo Loại bài đăng (Blog / Công thức) */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="font-label-sm text-label-sm font-semibold text-on-surface-variant mb-1">
          Loại nội dung
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {CONTENT_TYPES.map((t) => {
            const isSelected = type === t.value || (t.value === 'ALL' && !params.get('type'));
            return (
              <button
                key={t.value}
                type="button"
                className={chipClass(isSelected)}
                onClick={() => setParam('type', t.value === 'ALL' ? null : t.value)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* 2. Sắp xếp */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="font-label-sm text-label-sm font-semibold text-on-surface-variant mb-1">
          Sắp xếp theo
        </legend>
        <div className="flex gap-2">
          <button
            type="button"
            className={chipClass(sort === 'NEWEST')}
            onClick={() => setParam('sort', null)}
          >
            Mới nhất
          </button>
          <button
            type="button"
            className={chipClass(sort === 'POPULAR')}
            onClick={() => setParam('sort', 'POPULAR')}
          >
            Phổ biến
          </button>
        </div>
      </fieldset>

      {/* 3. Trường phái ăn chay */}
      <fieldset className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between mb-1">
          <legend className="font-label-sm text-label-sm font-semibold text-on-surface-variant">
            Trường phái ăn chay
          </legend>
          {selectedSchool && (
            <button
              type="button"
              onClick={() => setParam('dietarySchoolId', null)}
              className="font-label-sm text-label-sm text-outline hover:text-primary cursor-pointer"
            >
              Bỏ chọn
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-body-sm font-body-sm transition-colors',
              !selectedSchool
                ? 'bg-surface-container-high text-on-surface font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container'
            )}
          >
            <input
              type="radio"
              name="school"
              checked={!selectedSchool}
              onChange={() => setParam('dietarySchoolId', null)}
              className="accent-primary-container"
            />
            <span>Tất cả trường phái</span>
          </label>
          {(schools.data ?? []).map((s) => {
            const isSelected = selectedSchool === String(s.dietarySchoolId);
            return (
              <label
                key={s.dietarySchoolId}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-body-sm font-body-sm transition-colors',
                  isSelected
                    ? 'bg-surface-container-high text-on-surface font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container'
                )}
              >
                <input
                  type="radio"
                  name="school"
                  checked={isSelected}
                  onChange={() => setParam('dietarySchoolId', String(s.dietarySchoolId))}
                  className="accent-primary-container"
                />
                <span className="truncate">{s.schoolName}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* 4. Danh mục món ăn (Bỏ hoàn toàn thanh cuộn, hiển thị phẳng) */}
      {categories.data && categories.data.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-label-sm text-label-sm font-semibold text-on-surface-variant mb-1">
            Danh mục món ăn {isPostOnly && <span className="font-normal text-outline text-[11px]">(Công thức)</span>}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={isPostOnly}
              className={chipClass(!selectedCategory, isPostOnly)}
              onClick={() => setParam('categoryId', null)}
            >
              Tất cả
            </button>
            {categories.data.map((c) => (
              <button
                key={c.categoryId}
                type="button"
                disabled={isPostOnly}
                className={chipClass(selectedCategory === String(c.categoryId), isPostOnly)}
                onClick={() =>
                  setParam(
                    'categoryId',
                    selectedCategory === String(c.categoryId) ? null : String(c.categoryId)
                  )
                }
              >
                {c.categoryName}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* 5. Thời gian nấu tối đa */}
      <fieldset className={cn('flex flex-col gap-1.5', isPostOnly && 'opacity-50')}>
        <legend className="font-label-sm text-label-sm font-semibold text-on-surface-variant mb-1">
          Thời gian nấu {isPostOnly && <span className="font-normal text-outline text-[11px]">(Công thức)</span>}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={isPostOnly}
            className={chipClass(!selectedCookTime, isPostOnly)}
            onClick={() => setParam('maxCookTime', null)}
          >
            Bất kỳ
          </button>
          {COOK_TIMES.map((t) => (
            <button
              key={t}
              type="button"
              disabled={isPostOnly}
              className={chipClass(selectedCookTime === String(t), isPostOnly)}
              onClick={() =>
                setParam('maxCookTime', selectedCookTime === String(t) ? null : String(t))
              }
            >
              ≤ {t} phút
            </button>
          ))}
        </div>
      </fieldset>

      {/* 6. Lọc theo nguyên liệu */}
      <fieldset className={cn('flex flex-col gap-1.5', isPostOnly && 'opacity-50')}>
        <legend className="font-label-sm text-label-sm font-semibold text-on-surface-variant mb-1">
          Nguyên liệu chính {isPostOnly && <span className="font-normal text-outline text-[11px]">(Công thức)</span>}
        </legend>
        <div className="relative">
          <input
            defaultValue={selectedIngredient}
            disabled={isPostOnly}
            placeholder={isPostOnly ? 'Chỉ áp dụng cho công thức' : 'Ví dụ: nấm đùi gà, đậu hũ...'}
            maxLength={50}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setParam('ingredient', (e.target as HTMLInputElement).value.trim() || null);
              }
            }}
            onBlur={(e) => setParam('ingredient', e.target.value.trim() || null)}
            className="w-full rounded-xl bg-surface-container-low px-3 py-2 text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container disabled:bg-surface-container disabled:text-outline"
          />
        </div>
      </fieldset>
    </div>
  );
};
