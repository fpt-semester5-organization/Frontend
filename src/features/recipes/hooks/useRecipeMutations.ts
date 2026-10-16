import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecipe, updateRecipe, uploadRecipeMedia } from '../api/recipes.api';
import type { CreateRecipeBody, UpdateRecipeBody } from '../types/recipe.types';
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
