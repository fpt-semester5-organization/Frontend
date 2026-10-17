import type { RecipeContentType, RecipeSort } from '@/features/recipes/types/recipe.types';

// Kiểu dữ liệu công thức (GET /recipes, GET /dietary-schools) dùng chung ở features/recipes/types.

/** Bộ lọc của trang chủ, đọc/ghi qua query string. */
export interface HomeFilters {
  keyword: string;
  dietarySchoolId: number | null;
  /** Bộ lọc nhanh "Dưới 20 phút" (maxCookTime = 20). */
  quick: boolean;
  contentType: RecipeContentType;
  sort: RecipeSort;
}
