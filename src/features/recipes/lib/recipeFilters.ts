import type { RecipeContentType, RecipeListParams, RecipeSort } from '../types/recipe.types';

/** Giới hạn của FN-POST-01: keyword ≤ 100 ký tự, ingredient 1–50 ký tự, maxCookTime 1–600 phút, size 1–20. */
export const KEYWORD_MAX = 100;
export const INGREDIENT_MAX = 50;
export const COOK_TIME_MAX = 600;
export const RECIPE_LIST_PAGE_SIZE = 12;
/** Mốc thời gian nấu cho ô chọn "Thời gian nấu". */
export const COOK_TIME_OPTIONS = [15, 30, 60, 120] as const;

const CONTENT_TYPES: RecipeContentType[] = ['ALL', 'RECIPE', 'VIDEO'];
const SORTS: RecipeSort[] = ['POPULAR', 'NEWEST'];

/** Bộ lọc kho công thức (SCR-11), đọc/ghi qua query string để chia sẻ được đường dẫn. */
export interface RecipeFilters {
  keyword: string;
  ingredient: string;
  dietarySchoolId: number | null;
  categoryId: number | null;
  maxCookTime: number | null;
  contentType: RecipeContentType;
  sort: RecipeSort;
  page: number;
}

export const DEFAULT_RECIPE_FILTERS: RecipeFilters = {
  keyword: '',
  ingredient: '',
  dietarySchoolId: null,
  categoryId: null,
  maxCookTime: null,
  contentType: 'ALL',
  sort: 'POPULAR',
  page: 1,
};

const positiveInt = (value: string | null, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(value);
  return value !== null && Number.isInteger(n) && n > 0 && n <= max ? n : null;
};

/** Đọc bộ lọc từ query string; giá trị sai bị bỏ qua (về mặc định) thay vì gửi 400 lên server. */
export function parseRecipeFilters(search: URLSearchParams): RecipeFilters {
  const type = search.get('type') as RecipeContentType | null;
  const sort = search.get('sort') as RecipeSort | null;
  return {
    keyword: (search.get('q') ?? '').trim().slice(0, KEYWORD_MAX),
    ingredient: (search.get('ingredient') ?? '').trim().slice(0, INGREDIENT_MAX),
    dietarySchoolId: positiveInt(search.get('school')),
    categoryId: positiveInt(search.get('category')),
    maxCookTime: positiveInt(search.get('time'), COOK_TIME_MAX),
    contentType: type && CONTENT_TYPES.includes(type) ? type : DEFAULT_RECIPE_FILTERS.contentType,
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_RECIPE_FILTERS.sort,
    page: positiveInt(search.get('page')) ?? 1,
  };
}

/** Ghi bộ lọc ra query string, chỉ giữ giá trị khác mặc định cho URL gọn. */
export function serializeRecipeFilters(filters: RecipeFilters): URLSearchParams {
  const out = new URLSearchParams();
  if (filters.keyword) out.set('q', filters.keyword);
  if (filters.ingredient) out.set('ingredient', filters.ingredient);
  if (filters.dietarySchoolId) out.set('school', String(filters.dietarySchoolId));
  if (filters.categoryId) out.set('category', String(filters.categoryId));
  if (filters.maxCookTime) out.set('time', String(filters.maxCookTime));
  if (filters.contentType !== DEFAULT_RECIPE_FILTERS.contentType) out.set('type', filters.contentType);
  if (filters.sort !== DEFAULT_RECIPE_FILTERS.sort) out.set('sort', filters.sort);
  if (filters.page > 1) out.set('page', String(filters.page));
  return out;
}

/** Tham số GET /recipes: bỏ trường rỗng để khớp cache Redis recipe_search:{hash} phía server. */
export function toListParams(filters: RecipeFilters): RecipeListParams {
  return {
    ...(filters.keyword ? { keyword: filters.keyword } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.dietarySchoolId ? { dietarySchoolId: filters.dietarySchoolId } : {}),
    ...(filters.ingredient ? { ingredient: filters.ingredient } : {}),
    ...(filters.maxCookTime ? { maxCookTime: filters.maxCookTime } : {}),
    contentType: filters.contentType,
    sort: filters.sort,
    page: filters.page,
    size: RECIPE_LIST_PAGE_SIZE,
  };
}

/** Đang lọc (không tính sắp xếp và số trang). */
export const hasActiveRecipeFilters = (filters: RecipeFilters) =>
  Boolean(
    filters.keyword ||
      filters.ingredient ||
      filters.dietarySchoolId ||
      filters.categoryId ||
      filters.maxCookTime ||
      filters.contentType !== 'ALL'
  );
