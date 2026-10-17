import { useInfiniteQuery } from '@tanstack/react-query';
import { listComments } from '../api/community.api';
import type { ContentRef } from '../types/community.types';
import { communityKeys } from './communityKeys';

const COMMENT_PAGE_SIZE = 20;

/** Bình luận gốc phân trang 20/trang (FN-COMM-01) của bài viết hoặc công thức; "Xem thêm" tải trang kế tiếp. */
export function useComments(target: ContentRef, enabled = true) {
  return useInfiniteQuery({
    queryKey: communityKeys.comments(target),
    queryFn: ({ pageParam }) => listComments(target, { page: pageParam, size: COMMENT_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, size, total } = lastPage.meta;
      return page * size < total ? page + 1 : undefined;
    },
    enabled: enabled && target.id > 0,
    staleTime: 15 * 1000,
  });
}
