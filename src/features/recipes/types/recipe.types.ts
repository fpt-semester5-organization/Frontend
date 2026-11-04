import type { ApiOperations, DeepRequired, Schemas } from '@/api/types';

// Mọi type lấy từ src/api/generated (sinh từ docs/08. OpenAPI); chỉ bổ sung chỗ OpenAPI bỏ trống.

/**
 * Món ăn (Foods, Backend #86 ngày 30/10/2026): khái niệm chung như "Bún bò Huế chay", một món có nhiều công thức.
 * Công thức (Recipes) là cách nấu cụ thể, có tên riêng (`title`) và trỏ về món qua `foodId`.
 * OpenAPI (docs/08) chưa có các trường này; lấy theo Backend develop d937976.
 */
export interface Food {
  foodId: number;
  foodName: string;
  categoryId: number;
  imageUrl?: string | null;
  recipeCount?: number;
  categoryName?: string | null;
}

/** Trường món ăn trong công thức; công thức tạo trước khi có bảng Foods thì không có (null). */
export interface RecipeFoodFields {
  foodId?: number | null;
  foodName?: string | null;
  foodImageUrl?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
}

/** Một mục của GET /recipes (FN-POST-01): công thức hoặc video công khai. */
export type RecipeListItem = DeepRequired<Schemas['ListRecipesResponse']['data'][number]> & RecipeFoodFields;
/** `foodId`: lọc công thức của một món (Backend có, OpenAPI chưa có). */
export type RecipeListParams = NonNullable<ApiOperations['listRecipes']['parameters']['query']> & { foodId?: number };
export type RecipeContentType = NonNullable<RecipeListParams['contentType']>;
export type RecipeSort = NonNullable<RecipeListParams['sort']>;

/**
 * UNSPECIFIED: OpenAPI để `type` là string tự do. Theo FN-POST-01 (contentType) chỉ có RECIPE hoặc VIDEO.
 * Mục VIDEO cũng chỉ có recipeId (không có videoId/postId) nên thẻ dẫn tới trang chi tiết công thức.
 */
export type RecipeItemType = 'RECIPE' | 'VIDEO';

type RecipeDetailRaw = DeepRequired<Schemas['GetRecipeResponse']['data']>;

/**
 * UNSPECIFIED (giả định 17/10/2026, chờ Leader chốt): GET /recipes/{id} trả cả bản chưa duyệt cho chính tác giả
 * và có thêm các trường dưới đây để trang sửa điền sẵn form và nhận ra tác giả. Công thức công khai có thể không có.
 */
export interface RecipeOwnerFields {
  authorId?: number;
  status?: RecipeStatus;
  categoryId?: number;
  dietarySchoolId?: number;
  difficultyLevel?: DifficultyLevel | null;
  videoUrl?: string | null;
  videos?: Array<{
    videoId: number;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
    durationSeconds: number;
    status: string;
  }>;
}

/** GET /recipes/{id} (FN-POST-02). Các trường không bắt buộc của công thức có thể rỗng. */
export type RecipeDetail = Omit<RecipeDetailRaw, 'imageUrl' | 'description' | 'servings' | 'prepTimeMinutes' | 'ingredients'> &
  RecipeOwnerFields &
  RecipeFoodFields & {
    imageUrl: string | null;
    description: string | null;
    servings: number | null;
    prepTimeMinutes: number | null;
    /** isOptional: UNSPECIFIED, cùng giả định ở trên. */
    ingredients: (RecipeDetailRaw['ingredients'][number] & { isOptional?: boolean })[];
  };
export type RecipeIngredientLine = RecipeDetail['ingredients'][number];

/** Trạng thái tác giả thấy được trên công thức của mình (mọi trạng thái trừ DELETED). */
export type MyRecipeStatus = Exclude<RecipeStatus, 'DELETED'>;

/** DELETE /recipes/{id}?mode= (FN-POST-04): archive = gỡ khỏi trang cá nhân; all = xóa mềm với tất cả. */
export type DeleteRecipeMode = ApiOperations['deleteRecipe']['parameters']['query']['mode'];
export type DeleteRecipeResult = DeepRequired<Schemas['DeleteRecipeResponse']['data']>;

/**
 * GET /recipes/{id}/related (FN-POST-11).
 * UNSPECIFIED: posts[] và videos[] chưa có schema phần tử nên trang chi tiết chỉ dùng recipes[].
 */
export type RelatedRecipe = DeepRequired<Schemas['ListRelatedRecipesResponse']['data']>['recipes'][number];

/** Danh mục dùng chung (FN-PROF-08). */
export type DietarySchool = DeepRequired<Schemas['ListDietarySchoolsResponse']['data'][number]>;
export type FoodCategory = DeepRequired<Schemas['ListCategoriesResponse']['data'][number]>;
export type Ingredient = DeepRequired<Schemas['ListIngredientsResponse']['data'][number]>;
export type FoodGroup = Ingredient['foodGroup'];
export type IngredientListParams = NonNullable<ApiOperations['listIngredients']['parameters']['query']>;

/** Một nguyên liệu gửi lên POST/PUT /recipes. `isOptional` có trong docs/11 nhưng OpenAPI chưa khai báo. */
export interface RecipeIngredientInput {
  ingredientId: number;
  quantity: number;
  unit: string;
  isOptional?: boolean;
}

/**
 * POST /recipes (FN-POST-03). Món ăn gửi `foodId` (chọn món có sẵn) hoặc `foodName` (món mới: Backend tự tạo,
 * trùng tên không phân biệt hoa thường thì dùng món đã có).
 */
export type CreateRecipeBody = Omit<Schemas['CreateRecipeRequest'], 'ingredients'> & {
  ingredients: RecipeIngredientInput[];
  foodId?: number;
  foodName?: string;
};

/**
 * PUT /recipes/{id} (FN-POST-04).
 * UNSPECIFIED: OpenAPI ghi `ingredients` là string[] còn docs/11 là {ingredientId, quantity, unit, isOptional?};
 * đang theo docs/11 và chờ Leader xác nhận.
 */
export type UpdateRecipeBody = Partial<CreateRecipeBody>;

export type DifficultyLevel = NonNullable<CreateRecipeBody['difficultyLevel']>;
export type RecipeSaveResult = DeepRequired<Schemas['CreateRecipeResponse']['data']> & RecipeFoodFields;
export type RecipeUpdateResult = DeepRequired<Schemas['UpdateRecipeResponse']['data']>;

/** Recipes.Status theo vòng đời BR-ADM-CNT-001. */
export type RecipeStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED_ACTIVE'
  | 'REJECTED'
  | 'QUARANTINED_HIDDEN'
  | 'ARCHIVED'
  | 'DELETED';

/** POST /videos (FN-POST-08): ảnh/video gắn vào công thức. */
export type UploadMediaResult = DeepRequired<Schemas['CreateVideoResponse']['data']> & {
  imageUrl?: string;
  videoUrl?: string;
  moderationStatus?: string;
};
