import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RECIPE_FILTERS,
  RECIPE_LIST_PAGE_SIZE,
  hasActiveRecipeFilters,
  parseRecipeFilters,
  serializeRecipeFilters,
  toListParams,
} from './recipeFilters';

describe('parseRecipeFilters', () => {
  it('URL trống cho bộ lọc mặc định', () => {
    expect(parseRecipeFilters(new URLSearchParams())).toEqual(DEFAULT_RECIPE_FILTERS);
  });

  it('đọc đủ các tham số hợp lệ', () => {
    const f = parseRecipeFilters(
      new URLSearchParams('q= canh &ingredient=nấm&school=1&category=2&time=30&type=VIDEO&sort=NEWEST&page=3')
    );
    expect(f).toEqual({
      keyword: 'canh',
      ingredient: 'nấm',
      dietarySchoolId: 1,
      categoryId: 2,
      maxCookTime: 30,
      contentType: 'VIDEO',
      sort: 'NEWEST',
      page: 3,
    });
  });

  it('bỏ qua giá trị sai thay vì gửi 400 lên server', () => {
    const f = parseRecipeFilters(new URLSearchParams('school=-1&category=abc&time=601&type=PODCAST&sort=RANDOM&page=0'));
    expect(f).toEqual(DEFAULT_RECIPE_FILTERS);
  });

  it('cắt keyword còn 100 ký tự và nguyên liệu còn 50 ký tự (FN-POST-01)', () => {
    const f = parseRecipeFilters(new URLSearchParams(`q=${'a'.repeat(150)}&ingredient=${'b'.repeat(80)}`));
    expect(f.keyword).toHaveLength(100);
    expect(f.ingredient).toHaveLength(50);
  });
});

describe('serializeRecipeFilters', () => {
  it('chỉ ghi giá trị khác mặc định', () => {
    expect(serializeRecipeFilters(DEFAULT_RECIPE_FILTERS).toString()).toBe('');
    expect(serializeRecipeFilters({ ...DEFAULT_RECIPE_FILTERS, maxCookTime: 30, page: 2 }).toString()).toBe('time=30&page=2');
  });

  it('đọc lại được đúng bộ lọc đã ghi', () => {
    const f = { ...DEFAULT_RECIPE_FILTERS, keyword: 'đậu hũ', categoryId: 4, contentType: 'RECIPE' as const, page: 5 };
    expect(parseRecipeFilters(serializeRecipeFilters(f))).toEqual(f);
  });
});

describe('toListParams', () => {
  it('bỏ trường rỗng, luôn có sort, contentType, page, size', () => {
    expect(toListParams({ ...DEFAULT_RECIPE_FILTERS, ingredient: 'nấm', page: 2 })).toEqual({
      ingredient: 'nấm',
      contentType: 'ALL',
      sort: 'POPULAR',
      page: 2,
      size: RECIPE_LIST_PAGE_SIZE,
    });
  });
});

describe('hasActiveRecipeFilters', () => {
  it('sắp xếp và số trang không tính là đang lọc', () => {
    expect(hasActiveRecipeFilters({ ...DEFAULT_RECIPE_FILTERS, sort: 'NEWEST', page: 4 })).toBe(false);
    expect(hasActiveRecipeFilters({ ...DEFAULT_RECIPE_FILTERS, categoryId: 1 })).toBe(true);
  });
});
