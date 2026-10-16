import type { ApiOperations, DeepRequired, Schemas } from '@/api/types';

// Mọi type lấy từ src/api/generated (sinh từ docs/08. OpenAPI); chỉ bổ sung chỗ OpenAPI bỏ trống.

/** Một mục của GET /recipes (FN-POST-01): công thức hoặc video công khai. */
export type RecipeFeedItem = DeepRequired<Schemas['ListRecipesResponse']['data'][number]>;
export type RecipeListParams = NonNullable<ApiOperations['listRecipes']['parameters']['query']>;
export type RecipeContentType = NonNullable<RecipeListParams['contentType']>;
export type RecipeSort = NonNullable<RecipeListParams['sort']>;

/**
 * UNSPECIFIED: OpenAPI để `type` là string tự do. Theo FN-POST-01 (contentType) chỉ có RECIPE hoặc VIDEO.
 * Mục VIDEO cũng chỉ có recipeId (không có videoId/postId) nên thẻ dẫn tới trang chi tiết công thức.
 */
export type RecipeFeedType = 'RECIPE' | 'VIDEO';

/** GET /dietary-schools (FN-PROF-08): 07 trường phái cho bộ lọc nhanh. */
export type DietarySchool = DeepRequired<Schemas['ListDietarySchoolsResponse']['data'][number]>;

/** Bộ lọc của trang chủ, đọc/ghi qua query string. */
export interface HomeFilters {
  keyword: string;
  dietarySchoolId: number | null;
  /** Bộ lọc nhanh "Dưới 20 phút" (maxCookTime = 20). */
  quick: boolean;
  contentType: RecipeContentType;
  sort: RecipeSort;
}
