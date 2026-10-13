import { useInfiniteQuery } from '@tanstack/react-query';
import { listPostComments } from '../api/community.api';
import { communityKeys } from './communityKeys';

const COMMENT_PAGE_SIZE = 20;

/** Bình luận gốc phân trang 20/trang (FN-COMM-01); "Xem thêm" tải trang kế tiếp. */
export function usePostComments(postId: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: communityKeys.comments(postId),
    queryFn: ({ pageParam }) => listPostComments(postId, { page: pageParam, size: COMMENT_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, size, total } = lastPage.meta;
      return page * size < total ? page + 1 : undefined;
    },
    enabled: enabled && postId > 0,
    staleTime: 15 * 1000,
  });
}
