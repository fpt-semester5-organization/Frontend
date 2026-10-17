import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { toApiError } from '@/lib/apiError';
import {
  getRecipe,
  listCategories,
  listDietarySchools,
  listIngredients,
  listMyRecipes,
  listRecipes,
  listRelatedRecipes,
} from '../api/recipes.api';
import type { Ingredient, MyRecipeListParams, RecipeIngredientLine, RecipeListParams } from '../types/recipe.types';
import { masterKeys, recipeKeys } from './recipeKeys';

/** Không thử lại lỗi 4xx; 5xx thử lại 1 lần. */
export const retryServerErrorsOnce = (failureCount: number, error: unknown) =>
  failureCount < 1 && toApiError(error).status >= 500;

/** Danh sách công thức có phân trang (FN-POST-01); giữ trang cũ trên màn hình trong lúc tải trang mới. */
export function useRecipeList(params: RecipeListParams) {
  return useQuery({
    queryKey: recipeKeys.list(params),
    queryFn: () => listRecipes(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    retry: retryServerErrorsOnce,
  });
}

/** Công thức của tôi (SCR-14): chỉ gọi khi đã đăng nhập. */
export function useMyRecipes(params: MyRecipeListParams, enabled: boolean) {
  return useQuery({
    queryKey: recipeKeys.mine(params),
    queryFn: () => listMyRecipes(params),
    enabled: enabled && params.authorId > 0,
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
    retry: retryServerErrorsOnce,
  });
}

export function useRecipe(id: number) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => getRecipe(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 30 * 1000,
    retry: retryServerErrorsOnce,
  });
}

export function useRelatedRecipes(id: number, enabled = true) {
  return useQuery({
    queryKey: recipeKeys.related(id),
    queryFn: () => listRelatedRecipes(id),
    enabled: enabled && id > 0,
    staleTime: 5 * 60 * 1000,
    retry: retryServerErrorsOnce,
  });
}

/** 07 trường phái; danh mục ít đổi nên giữ lâu (server cache 1 giờ). */
export function useDietarySchools() {
  return useQuery({
    queryKey: masterKeys.dietarySchools(),
    queryFn: listDietarySchools,
    staleTime: 60 * 60 * 1000,
    retry: retryServerErrorsOnce,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: masterKeys.categories(),
    queryFn: listCategories,
    staleTime: 60 * 60 * 1000,
    retry: retryServerErrorsOnce,
  });
}

/** Gợi ý nguyên liệu theo tên (≤ 100 ký tự); chỉ gọi khi đã gõ ít nhất 1 ký tự. */
export function useIngredientSearch(keyword: string) {
  const term = keyword.trim().slice(0, 100);
  return useQuery({
    queryKey: masterKeys.ingredients(term),
    queryFn: () => listIngredients({ keyword: term, page: 1, size: 8 }),
    enabled: term.length > 0,
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: retryServerErrorsOnce,
  });
}

/**
 * Bản ghi danh mục của các nguyên liệu trong công thức đang sửa (nhóm thực phẩm, ngũ vị tân, calo/100g),
 * tra bằng GET /ingredients?keyword=<tên> vì GET /recipes/{id} chỉ trả mã, tên, lượng, đơn vị.
 * Lỗi tra cứu không chặn trang sửa: dòng đó chỉ thiếu cảnh báo trường phái và ước tính calo.
 */
export function useIngredientInfos(lines: RecipeIngredientLine[] | undefined) {
  const names = [...new Set((lines ?? []).map((line) => line.name.trim()).filter(Boolean))];
  return useQueries({
    queries: names.map((name) => ({
      queryKey: masterKeys.ingredients(name.slice(0, 100)),
      queryFn: () => listIngredients({ keyword: name.slice(0, 100), page: 1, size: 8 }),
      staleTime: 10 * 60 * 1000,
      retry: false,
    })),
    combine: (results) => {
      const infos = new Map<number, Ingredient>();
      for (const result of results) for (const item of result.data?.items ?? []) infos.set(item.ingredientId, item);
      return { infos, ready: results.every((result) => !result.isPending) };
    },
  });
}
