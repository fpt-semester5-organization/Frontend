import { http } from '@/api/http';
import { apiCall, cleanParams, unwrapPaged } from '../lib/api';
import type {
  AdminIngredient,
  Allergen,
  AllergenCreateBody,
  Category,
  CategoryCreateBody,
  CategoryDeleteResult,
  CategoryUpdateBody,
  DietarySchool,
  DietarySchoolUpdateBody,
  ENumber,
  ENumberCreateBody,
  ENumberQuery,
  ENumberUpdateBody,
  IngredientCreateBody,
  IngredientQuery,
  RecipeQuery,
  RecipeSummary,
  VerifyResult,
} from '../types/admin.types';

/* FN-ADM-07/08 — spec không có GET /admin/categories: dùng GET /categories công khai (FN-PROF-08). */
export const listCategories = async () => (await apiCall<Category[]>(http.get('/categories'))).data ?? [];
export const createCategory = (body: CategoryCreateBody) => apiCall<{ categoryId: number; categoryName: string }>(http.post('/admin/categories', cleanParams(body)));
export const updateCategory = (id: number, body: CategoryUpdateBody) => apiCall<{ categoryId: number; isActive?: boolean }>(http.put(`/admin/categories/${id}`, body));
export const deleteCategory = (id: number, targetCategoryId?: number) =>
  apiCall<CategoryDeleteResult>(http.delete(`/admin/categories/${id}`, { params: cleanParams({ targetCategoryId }) }));

/* FN-ADM-09 — không có danh sách ứng viên riêng: dùng GET /recipes công khai (size ≤ 20, có isVerified). */
export const listRecipesForVerification = (q: RecipeQuery) =>
  unwrapPaged<RecipeSummary>(http.get('/recipes', { params: cleanParams({ ...q, contentType: 'RECIPE', sort: 'NEWEST' }) }));
export const verifyRecipe = (id: number, note?: string) => apiCall<VerifyResult>(http.post(`/admin/recipes/${id}/verify`, note ? { note } : {}));
export const unverifyRecipe = (id: number) => apiCall<VerifyResult>(http.delete(`/admin/recipes/${id}/verify`));

/* FN-ADM-10 */
export const listDietarySchools = async () => (await apiCall<DietarySchool[]>(http.get('/admin/dietary-schools'))).data ?? [];
export const updateDietarySchool = (id: number, body: DietarySchoolUpdateBody) => apiCall<{ dietarySchoolId: number }>(http.put(`/admin/dietary-schools/${id}`, body));

/* FN-ADM-11 */
export const listENumbers = (q: ENumberQuery) => unwrapPaged<ENumber>(http.get('/admin/e-numbers', { params: cleanParams(q) }));
export const createENumber = (body: ENumberCreateBody) => apiCall<{ code: string }>(http.post('/admin/e-numbers', cleanParams(body)));
export const updateENumber = (code: string, body: ENumberUpdateBody) => apiCall<{ code: string; veganStatus?: string }>(http.put(`/admin/e-numbers/${encodeURIComponent(code)}`, cleanParams(body)));

/* FN-ADM-12 */
export const listIngredients = (q: IngredientQuery) => unwrapPaged<AdminIngredient>(http.get('/admin/ingredients', { params: cleanParams(q) }));
export const createIngredient = (body: IngredientCreateBody) => apiCall<{ ingredientId: number }>(http.post('/admin/ingredients', cleanParams(body)));
export const replaceIngredientAllergens = (id: number, allergenIds: number[]) =>
  apiCall<{ ingredientId: number; allergenIds: number[] }>(http.put(`/admin/ingredients/${id}/allergens`, { allergenIds }));
export const createAllergen = (body: AllergenCreateBody) => apiCall<{ allergenId: number }>(http.post('/admin/allergens', cleanParams(body)));
/** Danh sách nhóm dị ứng dùng chung (FN-PROF-08). */
export const listAllergens = async () => (await apiCall<Allergen[]>(http.get('/allergens'))).data ?? [];
