import type { RecipeListParams } from '../types/recipe.types';

export const recipeKeys = {
  all: ['recipes'] as const,
  /** Mọi danh sách công thức (kể cả bảng tin trang chủ): làm mới sau khi đăng, thả tim, báo cáo. */
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (params: RecipeListParams) => [...recipeKeys.lists(), params] as const,
  detail: (id: number) => [...recipeKeys.all, 'detail', id] as const,
  related: (id: number) => [...recipeKeys.all, 'related', id] as const,
};

/** Danh mục dùng chung (FN-PROF-08), ít thay đổi. */
export const masterKeys = {
  dietarySchools: () => ['master', 'dietary-schools'] as const,
  categories: () => ['master', 'categories'] as const,
  ingredients: (keyword: string) => ['master', 'ingredients', keyword] as const,
};
