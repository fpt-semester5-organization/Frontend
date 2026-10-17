import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecipe, deleteRecipe, updateRecipe, uploadRecipeMedia } from '../api/recipes.api';
import type { CreateRecipeBody, DeleteRecipeMode, UpdateRecipeBody } from '../types/recipe.types';
import { recipeKeys } from './recipeKeys';

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRecipeBody) => createRecipe(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recipeKeys.lists() }),
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, body }: { recipeId: number; body: UpdateRecipeBody }) => updateRecipe(recipeId, body),
    onSuccess: (_res, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

export function useUploadRecipeMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadRecipeMedia,
    onSuccess: (_res, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
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
