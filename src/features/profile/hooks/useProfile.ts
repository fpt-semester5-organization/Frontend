import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retryServerErrorsOnce } from '@/features/recipes/hooks/useRecipes';
import { useAuthStore } from '@/stores/auth.store';
import {
  createWeightEntry,
  deleteAccount,
  getCurrentUser,
  listAllergens,
  listWeightHistory,
  replaceAllergies,
  updateHealthProfile,
  updateProfile,
  uploadAvatar,
} from '../api/profile.api';
import type { CurrentUser, WeightHistoryParams } from '../types/profile.types';

export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  weightHistories: () => [...profileKeys.all, 'weight-history'] as const,
  weightHistory: (params: WeightHistoryParams) => [...profileKeys.weightHistories(), params] as const,
  allergens: () => ['master', 'allergens'] as const,
};

/** Hồ sơ của người đang đăng nhập (GET /users/me); Khách không gọi (server trả 403 ERR_GUEST_PERSONALIZATION_RESTRICTED). */
export function useCurrentUser() {
  const isMember = useAuthStore((state) => state.isAuthenticated);
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: getCurrentUser,
    enabled: isMember,
    staleTime: 30 * 1000,
    retry: retryServerErrorsOnce,
  });
}

export function useWeightHistory(params: WeightHistoryParams, enabled: boolean) {
  return useQuery({
    queryKey: profileKeys.weightHistory(params),
    queryFn: () => listWeightHistory(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    retry: retryServerErrorsOnce,
  });
}

/** Danh mục dị ứng ít đổi nên giữ lâu (FN-PROF-08). */
export function useAllergens() {
  return useQuery({
    queryKey: profileKeys.allergens(),
    queryFn: listAllergens,
    staleTime: 60 * 60 * 1000,
    retry: retryServerErrorsOnce,
  });
}

/** Ghi đè một phần hồ sơ trong cache sau khi lưu thành công. */
function usePatchMe() {
  const queryClient = useQueryClient();
  return (patch: (me: CurrentUser) => Partial<CurrentUser>) =>
    queryClient.setQueryData<CurrentUser>(profileKeys.me(), (me) => (me ? { ...me, ...patch(me) } : me));
}

export function useUpdateProfile() {
  const patchMe = usePatchMe();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: ({ data }) => {
      patchMe(() => ({ fullName: data.fullName, phoneNumber: data.phoneNumber || null }));
      // Header và menu tài khoản đọc tên từ auth store.
      useAuthStore.getState().updateUser({ fullName: data.fullName, phoneNumber: data.phoneNumber || null });
    },
  });
}

export function useUploadAvatar() {
  const patchMe = usePatchMe();
  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: ({ data }) => {
      patchMe(() => ({ avatarUrl: data.avatarUrl }));
      useAuthStore.getState().updateUser({ avatarUrl: data.avatarUrl });
    },
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: deleteAccount });
}

export function useUpdateHealthProfile() {
  const queryClient = useQueryClient();
  const patchMe = usePatchMe();
  return useMutation({
    mutationFn: updateHealthProfile,
    onSuccess: ({ data }) => {
      patchMe(() => ({ health: data }));
      // Mỗi lần lưu hồ sơ server ghi thêm một mốc cân nặng (FN-PROF-04).
      queryClient.invalidateQueries({ queryKey: profileKeys.weightHistories() });
    },
  });
}

export function useCreateWeightEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWeightEntry,
    onSuccess: () => {
      // Cân nặng hiện tại, BMI, calo mục tiêu đổi theo mốc mới.
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      queryClient.invalidateQueries({ queryKey: profileKeys.weightHistories() });
    },
  });
}

export function useReplaceAllergies() {
  const patchMe = usePatchMe();
  return useMutation({
    mutationFn: replaceAllergies,
    onSuccess: ({ data }) => patchMe(() => ({ allergens: Array.isArray(data.allergens) ? data.allergens : [] })),
  });
}
