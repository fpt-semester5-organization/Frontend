import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { communityKeys } from '@/features/community/hooks/communityKeys';
import { addRecentCreatedItem, updateRecentCreatedItem } from '@/features/community/lib/recentFeedStore';
import { getAttachmentKind } from '@/features/community/types/community.schemas';
import { createRecipe, deleteRecipe, updateRecipe, uploadRecipeMedia } from '../api/recipes.api';
import type { CreateRecipeBody, DeleteRecipeMode, UpdateRecipeBody } from '../types/recipe.types';
import { recipeKeys } from './recipeKeys';

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRecipeBody) => createRecipe(body),
    onSuccess: (res, body) => {
      const user = useAuthStore.getState().user;
      addRecentCreatedItem({
        key: `RECIPE-${res.data.recipeId}`,
        kind: 'RECIPE',
        id: res.data.recipeId,
        title: body.title,
        authorName: user?.fullName ?? 'Bếp Chay VeggieLife',
        authorAvatarUrl: user?.avatarUrl ?? '/logo.png',
        createdAt: new Date().toISOString(),
        voteCount: 0,
        cookTimeMinutes: body.cookTimeMinutes,
        dietarySchool: body.dietarySchoolId ? String(body.dietarySchoolId) : null,
        isVerified: false,
        type: 'RECIPE',
        hasVideo: false,
      });

      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: communityKeys.postLists() });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, body }: { recipeId: number; body: UpdateRecipeBody }) => updateRecipe(recipeId, body),
    onSuccess: (_res, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: communityKeys.postLists() });
    },
  });
}

export function useUploadRecipeMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadRecipeMedia,
    onSuccess: async (res, { file, recipeId }) => {
      if (res.data.imageUrl) {
        try {
          await updateRecipe(recipeId, { imageUrl: res.data.imageUrl });
        } catch {
          // Bỏ qua nếu có lỗi
        }
      }

      const isVideo = getAttachmentKind(file) === 'video';
      const derivedVideoUrl =
        res.data.imageUrl?.includes('/video/upload/')
          ? res.data.imageUrl.replace(/\.jpg$/i, '.mp4')
          : undefined;

      updateRecentCreatedItem(
        (item) => item.kind === 'RECIPE' && item.id === recipeId,
        (item) => ({
          ...item,
          hasVideo: isVideo,
          type: isVideo ? 'VIDEO' : item.type,
          videoId: res.data.videoId,
          videoUrl: derivedVideoUrl,
          imageUrl: res.data.imageUrl ?? item.imageUrl,
        })
      );

      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: communityKeys.postLists() });
    },
  });
}

/** Gỡ khỏi trang cá nhân (archive) hoặc xóa mềm với tất cả (all) — FN-POST-04. */
export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, mode }: { recipeId: number; mode: DeleteRecipeMode }) => deleteRecipe(recipeId, mode),
    onSuccess: (_res, { recipeId }) => {
      queryClient.removeQueries({ queryKey: recipeKeys.detail(recipeId) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}
