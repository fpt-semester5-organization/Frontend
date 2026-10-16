import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { INPUT_CLASS } from '@/components/ui/forms';
import { cn } from '@/lib/cn';
import {
  COOK_TIME_OPTIONS,
  INGREDIENT_MAX,
  KEYWORD_MAX,
  hasActiveRecipeFilters,
  type RecipeFilters,
} from '../lib/recipeFilters';
import type { DietarySchool, FoodCategory, RecipeContentType, RecipeSort } from '../types/recipe.types';

interface RecipeFilterPanelProps {
  filters: RecipeFilters;
  schools: DietarySchool[] | undefined;
  categories: FoodCategory[] | undefined;
  onChange: (patch: Partial<RecipeFilters>) => void;
  onReset: () => void;
}

const CONTENT_OPTIONS: { value: RecipeContentType; label: string }[] = [
  { value: 'ALL', label: 'Công thức & video' },
  { value: 'RECIPE', label: 'Chỉ công thức' },
  { value: 'VIDEO', label: 'Chỉ video' },
];

const SORT_OPTIONS: { value: RecipeSort; label: string }[] = [
  { value: 'POPULAR', label: 'Phổ biến nhất' },
  { value: 'NEWEST', label: 'Mới nhất' },
];

const LABEL = 'font-label-sm text-label-sm text-on-surface-variant';
const SELECT = cn(INPUT_CLASS, 'h-11 cursor-pointer py-0 pr-8');

/** Bảng lọc SCR-11: từ khóa, nguyên liệu, trường phái, danh mục, thời gian nấu, định dạng, sắp xếp (FN-POST-01). */
export const RecipeFilterPanel: React.FC<RecipeFilterPanelProps> = ({ filters, schools, categories, onChange, onReset }) => {
  const [keyword, setKeyword] = useState(filters.keyword);
  const [ingredient, setIngredient] = useState(filters.ingredient);

  // URL đổi (quay lại, xóa bộ lọc) thì ô nhập theo URL.
  useEffect(() => setKeyword(filters.keyword), [filters.keyword]);
  useEffect(() => setIngredient(filters.ingredient), [filters.ingredient]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onChange({ keyword: keyword.trim().slice(0, KEYWORD_MAX), ingredient: ingredient.trim().slice(0, INGREDIENT_MAX) });
  };

  const schoolName = schools?.find((s) => s.dietarySchoolId === filters.dietarySchoolId)?.schoolName;
  const categoryName = categories?.find((c) => c.categoryId === filters.categoryId)?.categoryName;
  const chips = [
    filters.keyword && { key: 'keyword', label: `“${filters.keyword}”`, clear: { keyword: '' } },
    filters.ingredient && { key: 'ingredient', label: `Có ${filters.ingredient}`, clear: { ingredient: '' } },
    filters.dietarySchoolId && { key: 'school', label: schoolName ?? 'Trường phái', clear: { dietarySchoolId: null } },
    filters.categoryId && { key: 'category', label: categoryName ?? 'Danh mục', clear: { categoryId: null } },
    filters.maxCookTime && { key: 'time', label: `Dưới ${filters.maxCookTime} phút`, clear: { maxCookTime: null } },
    filters.contentType !== 'ALL' && {
      key: 'type',
      label: filters.contentType === 'VIDEO' ? 'Chỉ video' : 'Chỉ công thức',
      clear: { contentType: 'ALL' as const },
    },
  ].filter(Boolean) as { key: string; label: string; clear: Partial<RecipeFilters> }[];

  return (
    <section aria-label="Bộ lọc công thức" className="rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:p-space-lg">
      <form role="search" onSubmit={submit} className="flex flex-col gap-space-sm md:flex-row">
        <div className="relative min-w-0 flex-[2]">
          <label htmlFor="recipe-keyword" className="sr-only">
            Tìm theo tên món
          </label>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-outline" />
          <input
            id="recipe-keyword"
            type="search"
            value={keyword}
            maxLength={KEYWORD_MAX}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm món chay (VD: canh nấm, đậu hũ kho)…"
            enterKeyHint="search"
            className={cn(INPUT_CLASS, 'h-11 pl-10')}
          />
        </div>
        <div className="relative min-w-0 flex-1">
          <label htmlFor="recipe-ingredient" className="sr-only">
            Có nguyên liệu
          </label>
          <Icon name="nutrition" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-outline" />
          <input
            id="recipe-ingredient"
            type="search"
            value={ingredient}
            maxLength={INGREDIENT_MAX}
            onChange={(event) => setIngredient(event.target.value)}
            placeholder="Có nguyên liệu…"
            enterKeyHint="search"
            className={cn(INPUT_CLASS, 'h-11 pl-10')}
          />
        </div>
        <Button type="submit" className="h-11 md:px-6">
          Tìm kiếm
        </Button>
      </form>

      <div className="mt-space-md grid grid-cols-2 gap-space-sm lg:grid-cols-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="recipe-school" className={LABEL}>
            Trường phái
          </label>
          <select
            id="recipe-school"
            value={filters.dietarySchoolId ?? ''}
            onChange={(event) => onChange({ dietarySchoolId: event.target.value ? Number(event.target.value) : null })}
            className={SELECT}
          >
            <option value="">Tất cả trường phái</option>
            {schools?.map((school) => (
              <option key={school.dietarySchoolId} value={school.dietarySchoolId}>
                {school.schoolName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="recipe-category" className={LABEL}>
            Danh mục món
          </label>
          <select
            id="recipe-category"
            value={filters.categoryId ?? ''}
            onChange={(event) => onChange({ categoryId: event.target.value ? Number(event.target.value) : null })}
            className={SELECT}
          >
            <option value="">Tất cả danh mục</option>
            {categories?.map((category) => (
              <option key={category.categoryId} value={category.categoryId}>
                {category.categoryName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="recipe-time" className={LABEL}>
            Thời gian nấu
          </label>
          <select
            id="recipe-time"
            value={filters.maxCookTime ?? ''}
            onChange={(event) => onChange({ maxCookTime: event.target.value ? Number(event.target.value) : null })}
            className={SELECT}
          >
            <option value="">Bất kỳ</option>
            {/* Giá trị lấy từ URL không nằm trong danh sách mốc vẫn hiện đúng. */}
            {filters.maxCookTime && !(COOK_TIME_OPTIONS as readonly number[]).includes(filters.maxCookTime) && (
              <option value={filters.maxCookTime}>Dưới {filters.maxCookTime} phút</option>
            )}
            {COOK_TIME_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                Dưới {minutes} phút
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="recipe-type" className={LABEL}>
            Định dạng
          </label>
          <select
            id="recipe-type"
            value={filters.contentType}
            onChange={(event) => onChange({ contentType: event.target.value as RecipeContentType })}
            className={SELECT}
          >
            {CONTENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex flex-col gap-1 lg:col-span-1">
          <label htmlFor="recipe-sort" className={LABEL}>
            Sắp xếp
          </label>
          <select
            id="recipe-sort"
            value={filters.sort}
            onChange={(event) => onChange({ sort: event.target.value as RecipeSort })}
            className={SELECT}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveRecipeFilters(filters) && (
        <div className="mt-space-md flex flex-wrap items-center gap-2">
          <span className={LABEL}>Đang lọc:</span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onChange(chip.clear)}
              aria-label={`Bỏ lọc ${chip.label}`}
              className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high"
            >
              {chip.label}
              <Icon name="close" className="text-[14px]" />
            </button>
          ))}
          <button type="button" onClick={onReset} className="font-label-sm text-label-sm text-secondary hover:underline">
            Xóa tất cả
          </button>
        </div>
      )}
    </section>
  );
};
