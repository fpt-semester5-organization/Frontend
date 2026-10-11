import { useMutation, useQueryClient } from '@tanstack/react-query';
import { togglePostVote } from '../api/community.api';
import type { PostDetail } from '../types/community.types';
import { communityKeys } from './communityKeys';

/** Thả tim / bỏ tim (FN-COMM-04): cập nhật voteCount của bài theo kết quả server trả về. */
export function useVotePost(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => togglePostVote(postId),
    onSuccess: ({ data }) => {
      queryClient.setQueryData<PostDetail>(communityKeys.post(postId), (post) =>
        post ? { ...post, voteCount: data.voteCount } : post
      );
      queryClient.invalidateQueries({ queryKey: communityKeys.postLists() });
    },
  });
}
