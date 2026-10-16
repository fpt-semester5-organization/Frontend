import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { toApiError } from '@/lib/apiError';
import { listDietarySchools, listRecipes } from '../api/home.api';
import type { RecipeListParams } from '../types/home.types';

export const homeKeys = {
  all: ['home'] as const,
  recipeFeed: (params: Omit<RecipeListParams, 'page'>) => [...homeKeys.all, 'recipes', params] as const,
  dietarySchools: () => ['master', 'dietary-schools'] as const,
};

/** Không thử lại lỗi 4xx; 5xx thử lại 1 lần. */
const retryServerErrorsOnce = (failureCount: number, error: unknown) =>
  failureCount < 1 && toApiError(error).status >= 500;

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

/** 07 trường phái cho chip lọc; danh mục ít đổi nên giữ lâu (server cache 1 giờ). */
export function useDietarySchools() {
  return useQuery({
    queryKey: homeKeys.dietarySchools(),
    queryFn: listDietarySchools,
    staleTime: 60 * 60 * 1000,
    retry: retryServerErrorsOnce,
  });
}
