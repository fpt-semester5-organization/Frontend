import http from '@/api/http';
import type { ApiEnvelope, Paged } from '@/api/types';
import type {
  CreateRecipeBody,
  DeleteRecipeMode,
  DeleteRecipeResult,
  DietarySchool,
  Food,
  FoodCategory,
  Ingredient,
  IngredientListParams,
  RecipeDetail,
  RecipeListItem,
  RecipeListParams,
  RecipeSaveResult,
  RecipeUpdateResult,
  RelatedRecipe,
  UpdateRecipeBody,
  UploadMediaResult,
} from '../types/recipe.types';

const toPaged = <T>(envelope: ApiEnvelope<T[]>, fallback: { page?: number; size?: number }): Paged<T> => {
  const items = Array.isArray(envelope.data) ? envelope.data : [];
  return { items, meta: envelope.meta ?? { page: fallback.page ?? 1, size: fallback.size ?? 10, total: items.length } };
};

/** GET /recipes — FN-POST-01 Tìm kiếm & lọc công thức, video công khai. Khách có thêm meta.signUpPromptAtItem. */
export async function listRecipes(params: RecipeListParams): Promise<Paged<RecipeListItem>> {
  const res = await http.get<ApiEnvelope<RecipeListItem[]>>('/recipes', { params });
  return toPaged(res.data, params);
}

export function normalizeInstructions(raw: unknown): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const steps: string[] = [];

  for (const item of list) {
    if (!item) continue;
    const str = String(item)
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    const lines = str.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/(?=Bước\s+\d+[:.])/i);
      for (const p of parts) {
        const clean = p.trim();
        if (clean) steps.push(clean);
      }
    }
  }
  return steps;
}

/** GET /recipes/{id} — FN-POST-02 Xem chi tiết công thức (đầy đủ cho cả Khách). */
export async function getRecipe(id: number): Promise<RecipeDetail> {
  const res = await http.get<ApiEnvelope<RecipeDetail>>(`/recipes/${id}`);
  const data = res.data.data;
  return {
    ...data,
    imageUrl: data.imageUrl || null,
    description: data.description || null,
    servings: data.servings ?? null,
    prepTimeMinutes: data.prepTimeMinutes ?? null,
    instructions: normalizeInstructions(data.instructions),
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    memberActions: data.memberActions ?? { canVote: false, canComment: false, canReport: false },
  };
}

/** GET /recipes/{id}/related — FN-POST-11 Gợi ý công thức tương đồng. */
export async function listRelatedRecipes(id: number, limit = 6): Promise<RelatedRecipe[]> {
  const res = await http.get<ApiEnvelope<{ recipes?: RelatedRecipe[] }>>(`/recipes/${id}/related`, { params: { limit } });
  return Array.isArray(res.data.data?.recipes) ? res.data.data.recipes : [];
}

/**
 * GET /foods/search?q= — gợi ý món ăn cho ô chọn món khi soạn công thức và bộ lọc kho công thức.
 * Backend tìm theo tên chứa từ khóa, tối đa 10 món; từ khóa rỗng trả 10 món đầu theo bảng chữ cái.
 */
export async function searchFoods(keyword: string): Promise<Food[]> {
  const res = await http.get<ApiEnvelope<Food[]>>('/foods/search', { params: { q: keyword } });
  return Array.isArray(res.data.data) ? res.data.data : [];
}

/** GET /foods — Danh sách món ăn khái niệm (Foods) có phân trang và tìm kiếm (FN-POST-01). */
export async function listFoods(params?: { q?: string; page?: number; size?: number }): Promise<Paged<Food>> {
  const res = await http.get<ApiEnvelope<Food[]>>('/foods', { params });
  return toPaged(res.data, params ?? {});
}

/** GET /foods/{id} — tên món để hiện trên bộ lọc khi mở link `?food=`. */
export async function getFood(id: number): Promise<Food> {
  const res = await http.get<ApiEnvelope<Food>>(`/foods/${id}`);
  return res.data.data;
}

/** GET /dietary-schools — FN-PROF-08 danh mục 07 trường phái. */
export async function listDietarySchools(): Promise<DietarySchool[]> {
  const res = await http.get<ApiEnvelope<DietarySchool[]>>('/dietary-schools');
  return Array.isArray(res.data.data) ? res.data.data : [];
}

/** GET /categories — FN-PROF-08 danh mục món. */
export async function listCategories(): Promise<FoodCategory[]> {
  const res = await http.get<ApiEnvelope<FoodCategory[]>>('/categories');
  return Array.isArray(res.data.data) ? res.data.data : [];
}

/** GET /ingredients — FN-PROF-08 tra cứu nguyên liệu theo tên. */
export async function listIngredients(params: IngredientListParams): Promise<Paged<Ingredient>> {
  const res = await http.get<ApiEnvelope<Ingredient[]>>('/ingredients', { params });
  return toPaged(res.data, params);
}

/** POST /recipes — FN-POST-03 (submit = false: lưu nháp; true: gửi AI kiểm duyệt). */
export async function createRecipe(body: CreateRecipeBody) {
  const res = await http.post<ApiEnvelope<RecipeSaveResult>>('/recipes', body);
  return res.data;
}

/** PUT /recipes/{id} — FN-POST-04 (sửa nháp đã lưu trong phiên soạn, hoặc gửi duyệt bản nháp). */
export async function updateRecipe(id: number, body: UpdateRecipeBody) {
  const res = await http.put<ApiEnvelope<RecipeUpdateResult>>(`/recipes/${id}`, body);
  return res.data;
}

/** POST /videos — FN-POST-08 tải ảnh/video lên Cloudinary và gắn vào công thức (cần recipeId nên tải sau khi lưu). */
export async function uploadRecipeMedia(input: { file: File; recipeId: number }) {
  const form = new FormData();
  form.append('file', input.file);
  form.append('recipeId', String(input.recipeId));
  const res = await http.post<ApiEnvelope<UploadMediaResult>>('/videos', form, { timeout: 120000 });
  return res.data;
}

/** DELETE /recipes/{id}?mode= — FN-POST-04: archive = gỡ khỏi trang cá nhân; all = xóa mềm với tất cả. */
export async function deleteRecipe(id: number, mode: DeleteRecipeMode) {
  const res = await http.delete<ApiEnvelope<DeleteRecipeResult>>(`/recipes/${id}`, { params: { mode } });
  return res.data;
}
