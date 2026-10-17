import type { RecipeContentType, RecipeListParams, RecipeSort } from '@/features/recipes/types/recipe.types';
import type { HomeFilters } from '../types/home.types';

/** Giới hạn của FN-POST-01: keyword 1–100 ký tự, maxCookTime 1–600 phút, size 1–20. */
export const KEYWORD_MAX = 100;
export const QUICK_COOK_MINUTES = 20;
export const RECIPE_PAGE_SIZE = 9;

const CONTENT_TYPES: RecipeContentType[] = ['ALL', 'RECIPE', 'VIDEO'];
const SORTS: RecipeSort[] = ['POPULAR', 'NEWEST'];

export const DEFAULT_FILTERS: HomeFilters = { keyword: '', dietarySchoolId: null, quick: false, contentType: 'ALL', sort: 'POPULAR' };

/** Đọc bộ lọc từ query string; giá trị sai bị bỏ qua (về mặc định) thay vì gửi 400 lên server. */
export function parseFilters(search: URLSearchParams): HomeFilters {
  const keyword = (search.get('q') ?? '').trim().slice(0, KEYWORD_MAX);
  const school = Number(search.get('school'));
  const type = search.get('type') as RecipeContentType | null;
  const sort = search.get('sort') as RecipeSort | null;
  return {
    keyword,
    dietarySchoolId: Number.isInteger(school) && school > 0 ? school : null,
    quick: search.get('quick') === '1',
    contentType: type && CONTENT_TYPES.includes(type) ? type : DEFAULT_FILTERS.contentType,
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
  };
}

/** Ghi bộ lọc ra query string, chỉ giữ giá trị khác mặc định cho URL gọn. */
export function serializeFilters(filters: HomeFilters): URLSearchParams {
  const out = new URLSearchParams();
  if (filters.keyword) out.set('q', filters.keyword);
  if (filters.dietarySchoolId) out.set('school', String(filters.dietarySchoolId));
  if (filters.quick) out.set('quick', '1');
  if (filters.contentType !== DEFAULT_FILTERS.contentType) out.set('type', filters.contentType);
  if (filters.sort !== DEFAULT_FILTERS.sort) out.set('sort', filters.sort);
  return out;
}

/** Tham số GET /recipes (chưa có page): bỏ trường rỗng để khớp cache Redis recipe_search:{hash} phía server. */
export function toRecipeParams(filters: HomeFilters): Omit<RecipeListParams, 'page'> {
  return {
    ...(filters.keyword ? { keyword: filters.keyword } : {}),
    ...(filters.dietarySchoolId ? { dietarySchoolId: filters.dietarySchoolId } : {}),
    ...(filters.quick ? { maxCookTime: QUICK_COOK_MINUTES } : {}),
    contentType: filters.contentType,
    sort: filters.sort,
    size: RECIPE_PAGE_SIZE,
  };
}

export const hasActiveFilters = (filters: HomeFilters) =>
  Boolean(filters.keyword || filters.dietarySchoolId || filters.quick || filters.contentType !== 'ALL');
