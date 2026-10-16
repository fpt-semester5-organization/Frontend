import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleVote } from '../api/community.api';
import type { ContentRef } from '../types/community.types';
import { communityKeys } from './communityKeys';

/** Thả tim / bỏ tim (FN-COMM-04): cập nhật voteCount của bài viết/công thức theo kết quả server trả về. */
export function useVote(target: ContentRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => toggleVote(target),
    onSuccess: ({ data }) => {
      queryClient.setQueryData<{ voteCount: number }>(communityKeys.content(target), (content) =>
        content ? { ...content, voteCount: data.voteCount } : content
      );
      queryClient.invalidateQueries({ queryKey: communityKeys.contentLists(target) });
    },
  });
}
