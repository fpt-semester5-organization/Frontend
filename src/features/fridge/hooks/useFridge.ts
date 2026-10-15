import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { mergeGuestQuota } from '@/lib/guestQuota';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth.store';
import {
  createDetection,
  createFridgeItem,
  deleteFridgeItem,
  listFridgeItems,
  listRecipeSuggestions,
  searchIngredients,
  updateFridgeItem,
} from '../api/fridge.api';
import type { AddItemForm, EditItemForm } from '../schemas/fridge.schema';
import type { Freshness } from '../types/fridge.types';

export const fridgeKeys = {
  all: ['fridge'] as const,
  items: (freshness?: Freshness) => ['fridge', 'items', freshness ?? 'ALL'] as const,
  suggestions: (min: number, limit: number) => ['fridge', 'suggestions', min, limit] as const,
  ingredients: (kw: string) => ['fridge', 'ingredients', kw] as const,
};

/**
 * Danh sách nguyên liệu trong tủ lạnh ảo (FN-VIS-02).
 * Chỉ gọi khi người dùng đã đăng nhập (Thành viên/VIP).
 */
export function useFridgeItems(freshness?: Freshness) {
  const authed = useAuthStore(selectIsAuthenticated);
  return useQuery({
    queryKey: fridgeKeys.items(freshness),
    queryFn: () => listFridgeItems(freshness),
    enabled: authed,
  });
}

/**
 * Gợi ý món từ nguyên liệu tủ lạnh (FN-VIS-03).
 * Chỉ gọi khi tủ lạnh có nguyên liệu để tránh lỗi 409 ERR_FRIDGE_EMPTY.
 */
export function useRecipeSuggestions(hasItems: boolean, minSimilarity = 0.7, limit = 10) {
  const authed = useAuthStore(selectIsAuthenticated);
  return useQuery({
    queryKey: fridgeKeys.suggestions(minSimilarity, limit),
    queryFn: () => listRecipeSuggestions(minSimilarity, limit),
    enabled: authed && hasItems,
    retry: false,
  });
}

/**
 * Mutation nhận diện nguyên liệu qua ảnh tủ lạnh (FN-VIS-01).
 * Tự động cập nhật quota và làm mới danh sách nguyên liệu khi thành công.
 */
export function useFridgeDetection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDetection,
    retry: false,
    onSuccess: (res) => {
      const isAuth = selectIsAuthenticated(useAuthStore.getState());
      if (res.quota) {
        mergeGuestQuota({ ai: res.quota }, !isAuth);
      }
      if (res.saved) {
        void qc.invalidateQueries({ queryKey: fridgeKeys.all });
      }
    },
  });
}

/** Thêm nguyên liệu thủ công */
export function useAddFridgeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: AddItemForm) => createFridgeItem(form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}

/** Cập nhật nguyên liệu (độ tươi, tên tùy chỉnh) */
export function useUpdateFridgeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; form: EditItemForm }) => updateFridgeItem(v.id, v.form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}

/** Xóa nguyên liệu khỏi tủ */
export function useDeleteFridgeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFridgeItem(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}

/** Debounce giá trị input cho search */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Tìm kiếm nguyên liệu theo từ khóa */
export function useIngredientSearch(keyword: string, enabled: boolean) {
  const kw = useDebounced(keyword.trim(), 300);
  return useQuery({
    queryKey: fridgeKeys.ingredients(kw),
    queryFn: () => searchIngredients(kw),
    enabled: enabled && kw.length >= 1,
    staleTime: 60_000,
  });
}
