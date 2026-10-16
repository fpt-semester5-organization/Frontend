import http from '@/api/http';
import type { ApiEnvelope, Paged } from '@/api/types';
import type { DietarySchool, RecipeFeedItem, RecipeListParams } from '../types/home.types';

/** GET /recipes — FN-POST-01 Tìm kiếm & lọc công thức, video công khai. Khách có thêm meta.signUpPromptAtItem. */
export async function listRecipes(params: RecipeListParams): Promise<Paged<RecipeFeedItem>> {
  const res = await http.get<ApiEnvelope<RecipeFeedItem[]>>('/recipes', { params });
  const items = Array.isArray(res.data.data) ? res.data.data : [];
  return { items, meta: res.data.meta ?? { page: params.page ?? 1, size: params.size ?? 10, total: items.length } };
}

/** GET /dietary-schools — FN-PROF-08 danh mục 07 trường phái (dùng cho chip lọc). */
export async function listDietarySchools(): Promise<DietarySchool[]> {
  const res = await http.get<ApiEnvelope<DietarySchool[]>>('/dietary-schools');
  return Array.isArray(res.data.data) ? res.data.data : [];
}
