import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/ui.store';
import * as api from '../api/catalog.api';
import { adminKeys } from '../lib/keys';
import type {
  AllergenCreateBody,
  CategoryCreateBody,
  CategoryUpdateBody,
  DietarySchoolUpdateBody,
  ENumberCreateBody,
  ENumberQuery,
  ENumberUpdateBody,
  IngredientCreateBody,
  IngredientQuery,
  RecipeQuery,
} from '../types/admin.types';

const done = (m: string, fallback: string) => toast.success(m || fallback);
/** Cache danh mục dùng chung của các màn khác (['catalog', …], ['venues','categories']) cũng phải làm mới sau khi Admin sửa dữ liệu nền. */
const sharedStale = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: ['catalog'] });
  void qc.invalidateQueries({ queryKey: ['venues', 'categories'] });
};
const auditStale = (qc: ReturnType<typeof useQueryClient>) => {
  sharedStale(qc);
  return qc.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
};

/* ---- Danh mục món ---- */
export const useCategories = () => useQuery({ queryKey: adminKeys.categories, queryFn: api.listCategories });

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CategoryCreateBody) => api.createCategory(b),
    onSuccess: (r) => {
      done(r.message, 'Đã tạo danh mục.');
      void qc.invalidateQueries({ queryKey: adminKeys.categories });
      void auditStale(qc);
    },
  });
}
export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; body: CategoryUpdateBody }) => api.updateCategory(v.id, v.body),
    onSuccess: (r) => {
      done(r.message, 'Đã cập nhật danh mục.');
      void qc.invalidateQueries({ queryKey: adminKeys.categories });
      void auditStale(qc);
    },
  });
}
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; targetCategoryId?: number }) => api.deleteCategory(v.id, v.targetCategoryId),
    onSuccess: (r) => {
      done(r.message, 'Đã xóa danh mục.');
      void qc.invalidateQueries({ queryKey: adminKeys.categories });
      void auditStale(qc);
    },
  });
}

/* ---- Xác minh công thức ---- */
export const useRecipesForVerification = (q: RecipeQuery) =>
  useQuery({ queryKey: adminKeys.recipes(q), queryFn: () => api.listRecipesForVerification(q), placeholderData: keepPreviousData });

export function useVerifyRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; note?: string }) => api.verifyRecipe(v.id, v.note),
    onSuccess: (r) => {
      done(r.message, 'Đã cấp huy hiệu.');
      void qc.invalidateQueries({ queryKey: adminKeys.recipesAll });
      void auditStale(qc);
    },
  });
}
export function useUnverifyRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.unverifyRecipe(id),
    onSuccess: (r) => {
      done(r.message, 'Đã gỡ huy hiệu.');
      void qc.invalidateQueries({ queryKey: adminKeys.recipesAll });
      void auditStale(qc);
    },
  });
}

/* ---- Trường phái chay ---- */
export const useDietarySchools = () => useQuery({ queryKey: adminKeys.dietarySchools, queryFn: api.listDietarySchools });
export function useUpdateDietarySchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; body: DietarySchoolUpdateBody }) => api.updateDietarySchool(v.id, v.body),
    onSuccess: (r) => {
      done(r.message, 'Đã cập nhật trường phái.');
      void qc.invalidateQueries({ queryKey: adminKeys.dietarySchools });
      void auditStale(qc);
    },
  });
}

/* ---- E-number ---- */
export const useENumbers = (q: ENumberQuery) =>
  useQuery({ queryKey: adminKeys.eNumbers(q), queryFn: () => api.listENumbers(q), placeholderData: keepPreviousData });
export function useCreateENumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: ENumberCreateBody) => api.createENumber(b),
    onSuccess: (r) => {
      done(r.message, 'Đã thêm E-number.');
      void qc.invalidateQueries({ queryKey: adminKeys.eNumbersAll });
      void auditStale(qc);
    },
  });
}
export function useUpdateENumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { code: string; body: ENumberUpdateBody }) => api.updateENumber(v.code, v.body),
    onSuccess: (r) => {
      done(r.message, 'Đã cập nhật E-number.');
      void qc.invalidateQueries({ queryKey: adminKeys.eNumbersAll });
      void auditStale(qc);
    },
  });
}

/* ---- Nguyên liệu & dị ứng ---- */
export const useAdminIngredients = (q: IngredientQuery) =>
  useQuery({ queryKey: adminKeys.ingredients(q), queryFn: () => api.listIngredients(q), placeholderData: keepPreviousData });
export const useAllergens = () => useQuery({ queryKey: adminKeys.allergens, queryFn: api.listAllergens });

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: IngredientCreateBody) => api.createIngredient(b),
    onSuccess: (r) => {
      done(r.message, 'Đã thêm nguyên liệu.');
      void qc.invalidateQueries({ queryKey: adminKeys.ingredientsAll });
      void auditStale(qc);
    },
  });
}
export function useReplaceIngredientAllergens() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; allergenIds: number[] }) => api.replaceIngredientAllergens(v.id, v.allergenIds),
    onSuccess: (r) => {
      done(r.message, 'Đã cập nhật nhóm dị ứng.');
      void qc.invalidateQueries({ queryKey: adminKeys.ingredientsAll });
      void auditStale(qc);
    },
  });
}
export function useCreateAllergen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: AllergenCreateBody) => api.createAllergen(b),
    onSuccess: (r) => {
      done(r.message, 'Đã thêm nhóm dị ứng.');
      void qc.invalidateQueries({ queryKey: adminKeys.allergens });
      void auditStale(qc);
    },
  });
}
