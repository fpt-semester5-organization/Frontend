import { useInfiniteQuery } from '@tanstack/react-query';
import { listRecipes } from '@/features/recipes/api/recipes.api';
import { recipeKeys } from '@/features/recipes/hooks/recipeKeys';
import { retryServerErrorsOnce } from '@/features/recipes/hooks/useRecipes';
import type { RecipeListParams } from '@/features/recipes/types/recipe.types';

export const homeKeys = {
  /** Nằm dưới recipeKeys.lists() để thả tim, đăng công thức cũng làm mới bảng tin. */
  recipeFeed: (params: Omit<RecipeListParams, 'page'>) => [...recipeKeys.lists(), 'home-feed', params] as const,
};

/** Bảng tin công thức & video, tải thêm theo trang (FN-POST-01). */
export function useRecipeFeed(params: Omit<RecipeListParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: homeKeys.recipeFeed(params),
    queryFn: ({ pageParam }) => listRecipes({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { page, size, total } = last.meta;
      return page * size < total ? page + 1 : undefined;
    },
    staleTime: 60 * 1000,
    retry: retryServerErrorsOnce,
  });
}
