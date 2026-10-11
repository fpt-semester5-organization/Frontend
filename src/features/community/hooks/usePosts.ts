import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toApiError } from '@/lib/apiError';
import { getPost, listPosts } from '../api/community.api';
import type { PostListParams } from '../types/community.types';
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

export function usePost(postId: number) {
  return useQuery({
    queryKey: communityKeys.post(postId),
    queryFn: () => getPost(postId),
    enabled: Number.isInteger(postId) && postId > 0,
    staleTime: 30 * 1000,
    retry: retryServerErrorsOnce,
  });
}
