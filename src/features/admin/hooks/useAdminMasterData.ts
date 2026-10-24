import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminAllergen,
  createAdminENumber,
  createAdminIngredient,
  listAdminDietarySchools,
  listAdminENumbers,
  listAdminIngredients,
  listAllergens,
  replaceAdminIngredientAllergens,
  updateAdminDietarySchool,
  updateAdminENumber,
  updateAdminIngredient,
} from '../api/admin.api';
import { masterKeys } from '@/features/recipes/hooks/recipeKeys';
import { retryServerErrorsOnce } from '../lib/endpoint';
import type {
  CreateAllergenBody,
  CreateENumberBody,
  CreateIngredientBody,
  ENumberFilters,
  IngredientFilters,
  UpdateDietarySchoolBody,
  UpdateENumberBody,
  UpdateIngredientBody,
} from '../types/admin.types';

export const masterDataKeys = {
  schools: ['admin', 'dietary-schools'] as const,
  eNumbers: ['admin', 'e-numbers'] as const,
  eNumberList: (filters: ENumberFilters) => [...masterDataKeys.eNumbers, filters] as const,
  ingredients: ['admin', 'ingredients'] as const,
  ingredientList: (filters: IngredientFilters) => [...masterDataKeys.ingredients, filters] as const,
  allergens: ['allergens'] as const,
};

// ---------- Trường phái (FN-ADM-10) ----------

export function useAdminDietarySchools() {
  return useQuery({ queryKey: masterDataKeys.schools, queryFn: listAdminDietarySchools, retry: retryServerErrorsOnce });
}

export function useUpdateDietarySchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateDietarySchoolBody }) => updateAdminDietarySchool(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: masterDataKeys.schools });
      // Danh mục công khai GET /dietary-schools (hồ sơ, bộ lọc) dùng tên mới.
      void qc.invalidateQueries({ queryKey: masterKeys.dietarySchools() });
    },
  });
}

// ---------- E-number (FN-ADM-11) ----------

export function useAdminENumbers(filters: ENumberFilters) {
  return useQuery({
    queryKey: masterDataKeys.eNumberList(filters),
    queryFn: () => listAdminENumbers(filters),
    placeholderData: keepPreviousData,
    retry: retryServerErrorsOnce,
  });
}

export function useCreateENumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateENumberBody) => createAdminENumber(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterDataKeys.eNumbers }),
  });
}

export function useUpdateENumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: UpdateENumberBody }) => updateAdminENumber(code, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterDataKeys.eNumbers }),
  });
}

// ---------- Nguyên liệu & dị ứng (FN-ADM-12) ----------

export function useAdminIngredients(filters: IngredientFilters) {
  return useQuery({
    queryKey: masterDataKeys.ingredientList(filters),
    queryFn: () => listAdminIngredients(filters),
    placeholderData: keepPreviousData,
    retry: retryServerErrorsOnce,
  });
}

/** Danh mục nhóm dị ứng (GET /allergens). */
export function useAllergens() {
  return useQuery({ queryKey: masterDataKeys.allergens, queryFn: listAllergens, staleTime: 5 * 60 * 1000, retry: retryServerErrorsOnce });
}

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateIngredientBody) => createAdminIngredient(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterDataKeys.ingredients }),
  });
}

export function useUpdateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateIngredientBody }) => updateAdminIngredient(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterDataKeys.ingredients }),
  });
}

export function useReplaceIngredientAllergens() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, allergenIds }: { id: number; allergenIds: number[] }) => replaceAdminIngredientAllergens(id, allergenIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterDataKeys.ingredients }),
  });
}

export function useCreateAllergen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAllergenBody) => createAdminAllergen(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterDataKeys.allergens }),
  });
}
