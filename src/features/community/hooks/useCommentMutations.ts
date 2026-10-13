import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPostComment, deleteComment, updateComment } from '../api/community.api';
import type { CreateCommentBody } from '../types/community.types';
import { communityKeys } from './communityKeys';

/** Sau mỗi thay đổi: tải lại cây bình luận và commentCount của bài. */
function useInvalidateComments(postId: number) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: communityKeys.comments(postId) });
    queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) });
  };
}

export function useCreateComment(postId: number) {
  const invalidate = useInvalidateComments(postId);
  return useMutation({
    mutationFn: (body: CreateCommentBody) => createPostComment(postId, body),
    onSuccess: invalidate,
  });
}

export function useUpdateComment(postId: number) {
  const invalidate = useInvalidateComments(postId);
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      updateComment(commentId, { content }),
    onSuccess: invalidate,
  });
}

export function useDeleteComment(postId: number) {
  const invalidate = useInvalidateComments(postId);
  return useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: invalidate,
  });
}
