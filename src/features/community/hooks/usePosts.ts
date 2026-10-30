import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { toApiError } from '@/lib/apiError';
import { getPost, listPosts, type Paged } from '../api/community.api';
import type { PostListItem, PostListParams } from '../types/community.types';
import { communityKeys } from './communityKeys';

/** Không thử lại lỗi 4xx (404 bài không tồn tại, 400 tham số sai...). */
const retryServerErrorsOnce = (failureCount: number, error: unknown) =>
  failureCount < 1 && toApiError(error).status >= 500;

export function usePostList(params: PostListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: communityKeys.postList(params),
    queryFn: () => listPosts(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    retry: retryServerErrorsOnce,
    enabled: options?.enabled ?? true,
  });
}

/** Cuộn vô hạn bài viết (SCR-25): nạp thêm trang mới khi người dùng cuộn đến cuối feed. */
export function useInfinitePosts(params: Omit<PostListParams, 'page'>, options?: { enabled?: boolean; refetchOnMount?: boolean | 'always' }) {
  return useInfiniteQuery<Paged<PostListItem>>({
    queryKey: [...communityKeys.postLists(), 'infinite', params],
    queryFn: ({ pageParam = 1 }) => listPosts({ ...params, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (last: Paged<PostListItem>) =>
      last.meta.page * last.meta.size < last.meta.total ? last.meta.page + 1 : undefined,
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    refetchOnMount: options?.refetchOnMount ?? 'always',
    retry: retryServerErrorsOnce,
  });
}

export function usePost(postId: number) {
  return useQuery({
    queryKey: communityKeys.post(postId),
    queryFn: () => getPost(postId),
    enabled: Number.isInteger(postId) && postId > 0,
    staleTime: 30 * 1000,
    retry: retryServerErrorsOnce,
  });
}
