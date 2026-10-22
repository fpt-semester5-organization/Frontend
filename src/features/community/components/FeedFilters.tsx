import React, { useState, type ReactNode } from 'react';
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

type SectionKey = 'type' | 'sort' | 'school' | 'category' | 'cookTime' | 'ingredient';

interface FilterSectionProps {
  id: SectionKey;
  title: ReactNode;
  open: boolean;
  /** Nhóm đang có điều kiện lọc: hiện chấm báo khi nhóm thu gọn để người dùng biết đang lọc. */
  active?: boolean;
  onToggle: (id: SectionKey) => void;
  children: ReactNode;
}

/** Một nhóm lọc dạng thu gọn/mở rộng (tiêu đề + mũi tên), phân cách bằng đường kẻ. */
const FilterSection: React.FC<FilterSectionProps> = ({ id, title, open, active, onToggle, children }) => (
  <div className="border-b border-surface-container last:border-b-0">
    <button
      type="button"
      aria-expanded={open}
      aria-controls={`feed-filter-${id}`}
      onClick={() => onToggle(id)}
      className="flex w-full items-center justify-between gap-2 border-0 bg-transparent px-0 py-3 text-left font-label-md text-label-md font-semibold text-on-surface transition-colors hover:text-primary"
    >
      <span className="flex min-w-0 items-center gap-2">
        {title}
        {active && !open && (
          <>
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="sr-only">(đang lọc)</span>
          </>
        )}
      </span>
      <Icon name={open ? 'expand_less' : 'expand_more'} className="text-[20px] text-on-surface-variant" />
    </button>
    {open && (
      <div id={`feed-filter-${id}`} className="pb-3">
        {children}
      </div>
    )}
  </div>
);

interface FeedFiltersProps {
  className?: string;
  onFilterChange?: () => void;
}

/**
 * Bộ lọc bảng tin cộng đồng: tiêu đề cố định, phần thân có thanh cuộn riêng và các nhóm thu gọn được.
 * Trên màn rộng, cột trái của PostFeed giới hạn chiều cao theo khung nhìn nên khung này tự co lại và cuộn bên trong,
 * không phải chờ cuộn hết bảng tin mới xem được phần dưới.
 */
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

  // Mở sẵn 2 nhóm hay dùng và mọi nhóm đang có điều kiện lọc (ví dụ khi mở trang từ URL đã lọc).
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(() => ({
    type: true,
    sort: true,
    school: !!selectedSchool,
    category: !!selectedCategory,
    cookTime: !!selectedCookTime,
    ingredient: !!selectedIngredient,
  }));
  const toggle = (key: SectionKey) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

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

  const recipeOnlyNote = isPostOnly && <span className="font-normal text-outline text-[11px]">(Công thức)</span>;

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl bg-surface-container-lowest shadow-card border border-surface-container/60 lg:min-h-0',
        className
      )}
    >
      {/* Tiêu đề cố định, không cuộn theo danh sách nhóm lọc */}
      <div className="flex shrink-0 items-center justify-between border-b border-surface-container px-space-md py-3">
        <div className="flex items-center gap-2">
          <Icon name="tune" className="text-[20px] text-primary" />
          <h3 className="m-0 font-label-md text-label-md font-bold text-on-surface">Bộ lọc cộng đồng</h3>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="border-0 bg-transparent p-0 font-label-sm text-label-sm text-secondary hover:underline cursor-pointer"
          >
            Đặt lại ({activeCount})
          </button>
        )}
      </div>

      {/* Phần thân cuộn riêng (thanh cuộn mảnh); cuộn tới cuối không kéo theo cả trang */}
      <div className="min-h-0 overflow-y-auto overscroll-contain px-space-md [scrollbar-color:var(--color-outline-variant)_transparent] [scrollbar-width:thin]">
        {/* 1. Lọc theo Loại bài đăng (Blog / Công thức) */}
        <FilterSection id="type" title="Loại nội dung" open={openSections.type} active={type !== 'ALL'} onToggle={toggle}>
          <div className="flex flex-wrap gap-1.5">
            {CONTENT_TYPES.map((t) => {
              const isSelected = type === t.value || (t.value === 'ALL' && !params.get('type'));
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={isSelected}
                  className={chipClass(isSelected)}
                  onClick={() => setParam('type', t.value === 'ALL' ? null : t.value)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* 2. Sắp xếp */}
        <FilterSection id="sort" title="Sắp xếp theo" open={openSections.sort} onToggle={toggle}>
          <div className="flex gap-2">
            <button type="button" aria-pressed={sort === 'NEWEST'} className={chipClass(sort === 'NEWEST')} onClick={() => setParam('sort', null)}>
              Mới nhất
            </button>
            <button
              type="button"
              aria-pressed={sort === 'POPULAR'}
              className={chipClass(sort === 'POPULAR')}
              onClick={() => setParam('sort', 'POPULAR')}
            >
              Phổ biến
            </button>
          </div>
        </FilterSection>

        {/* 3. Trường phái ăn chay */}
        <FilterSection id="school" title="Trường phái ăn chay" open={openSections.school} active={!!selectedSchool} onToggle={toggle}>
          <div role="radiogroup" aria-label="Trường phái ăn chay" className="flex flex-col gap-1">
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
                  title={s.schoolName}
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
        </FilterSection>

        {/* 4. Danh mục món ăn */}
        {categories.data && categories.data.length > 0 && (
          <FilterSection
            id="category"
            title={<span>Danh mục món ăn {recipeOnlyNote}</span>}
            open={openSections.category}
            active={!!selectedCategory}
            onToggle={toggle}
          >
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={isPostOnly}
                aria-pressed={!selectedCategory}
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
                  aria-pressed={selectedCategory === String(c.categoryId)}
                  className={chipClass(selectedCategory === String(c.categoryId), isPostOnly)}
                  onClick={() =>
                    setParam('categoryId', selectedCategory === String(c.categoryId) ? null : String(c.categoryId))
                  }
                >
                  {c.categoryName}
                </button>
              ))}
            </div>
          </FilterSection>
        )}

        {/* 5. Thời gian nấu tối đa */}
        <FilterSection
          id="cookTime"
          title={<span>Thời gian nấu {recipeOnlyNote}</span>}
          open={openSections.cookTime}
          active={!!selectedCookTime}
          onToggle={toggle}
        >
          <div className={cn('flex flex-wrap gap-1.5', isPostOnly && 'opacity-50')}>
            <button
              type="button"
              disabled={isPostOnly}
              aria-pressed={!selectedCookTime}
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
                aria-pressed={selectedCookTime === String(t)}
                className={chipClass(selectedCookTime === String(t), isPostOnly)}
                onClick={() => setParam('maxCookTime', selectedCookTime === String(t) ? null : String(t))}
              >
                ≤ {t} phút
              </button>
            ))}
          </div>
        </FilterSection>

        {/* 6. Lọc theo nguyên liệu */}
        <FilterSection
          id="ingredient"
          title={<span>Nguyên liệu chính {recipeOnlyNote}</span>}
          open={openSections.ingredient}
          active={!!selectedIngredient}
          onToggle={toggle}
        >
          <input
            defaultValue={selectedIngredient}
            disabled={isPostOnly}
            aria-label="Nguyên liệu chính"
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
        </FilterSection>
      </div>
    </div>
  );
};
