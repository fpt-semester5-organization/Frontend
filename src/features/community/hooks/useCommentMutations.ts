import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import { createComment, deleteComment, updateComment, type Paged } from '../api/community.api';
import type { ContentRef, CreateCommentBody, PostComment } from '../types/community.types';
import { useAuthStore } from '@/stores/auth.store';
import { communityKeys } from './communityKeys';

/** Chi tiết bài viết/công thức: chỉ cần commentCount để cập nhật ngay số bình luận. */
type CommentCounted = { commentCount: number };

/** Sau mỗi thay đổi: tải lại cây bình luận và commentCount của nội dung để đồng bộ với server. */
function useInvalidateComments(target: ContentRef) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: communityKeys.comments(target) });
    queryClient.invalidateQueries({ queryKey: communityKeys.content(target) });
  };
}

/** Đệ quy chèn phản hồi mới vào cây bình luận. */
function insertReplyNode(list: PostComment[], parentCommentId: number, newComment: PostComment): PostComment[] {
  return list.map((item) => {
    if (item.commentId === parentCommentId) {
      return {
        ...item,
        replies: [...(item.replies ?? []), newComment],
      };
    }
    if (item.replies && item.replies.length > 0) {
      return {
        ...item,
        replies: insertReplyNode(item.replies, parentCommentId, newComment),
      };
    }
    return item;
  });
}

/** Đệ quy cập nhật nội dung bình luận trong cây. */
function updateCommentContent(list: PostComment[], commentId: number, content: string): PostComment[] {
  return list.map((item) => {
    if (item.commentId === commentId) {
      return { ...item, content };
    }
    if (item.replies && item.replies.length > 0) {
      return {
        ...item,
        replies: updateCommentContent(item.replies, commentId, content),
      };
    }
    return item;
  });
}

/** Đệ quy xóa bình luận khỏi cây. */
function removeCommentNode(list: PostComment[], commentId: number): PostComment[] {
  return list
    .filter((item) => item.commentId !== commentId)
    .map((item) => {
      if (item.replies && item.replies.length > 0) {
        return {
          ...item,
          replies: removeCommentNode(item.replies, commentId),
        };
      }
      return item;
    });
}

/** Đệ quy thay thế temporary ID bằng real comment từ server. */
function replaceCommentNode(list: PostComment[], targetId: number, realComment: PostComment): PostComment[] {
  return list.map((item) => {
    if (item.commentId === targetId) {
      return {
        ...realComment,
        replies: realComment.replies ?? item.replies ?? [],
      };
    }
    if (item.replies && item.replies.length > 0) {
      return {
        ...item,
        replies: replaceCommentNode(item.replies, targetId, realComment),
      };
    }
    return item;
  });
}

/**
 * Gửi bình luận với cập nhật tức thì (Optimistic Update) giúp bình luận hiện ngay sau khi gửi (0ms).
 */
export function useCreateComment(target: ContentRef) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateComments(target);

  return useMutation({
    mutationFn: (body: CreateCommentBody) => createComment(target, body),

    onMutate: async (body) => {
      // 1. Dừng các truy vấn đang chạy để tránh đè dữ liệu
      await queryClient.cancelQueries({ queryKey: communityKeys.comments(target) });
      await queryClient.cancelQueries({ queryKey: communityKeys.content(target) });

      // 2. Lưu trạng thái trước đó để khôi phục nếu thất bại
      const previousComments = queryClient.getQueryData<InfiniteData<Paged<PostComment>>>(communityKeys.comments(target));
      const previousPost = queryClient.getQueryData<CommentCounted>(communityKeys.content(target));

      const currentUser = useAuthStore.getState().user;
      const tempId = -Date.now();

      const optimisticComment: PostComment = {
        commentId: tempId,
        author: {
          userId: currentUser?.userId ?? 0,
          fullName: currentUser?.fullName ?? 'Tôi',
        },
        content: body.content,
        parentCommentId: body.parentCommentId ?? null,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        replies: [],
      };

      // 3. Cập nhật ngay vào cache bình luận
      queryClient.setQueryData<InfiniteData<Paged<PostComment>>>(
        communityKeys.comments(target),
        (old) => {
          if (!old || old.pages.length === 0) {
            return {
              pages: [
                {
                  items: [optimisticComment],
                  meta: { page: 1, size: 20, total: 1 },
                },
              ],
              pageParams: [1],
            };
          }

          if (body.parentCommentId == null) {
            // Bình luận gốc: thêm vào trang cuối cùng
            const lastIdx = old.pages.length - 1;
            const updatedPages = old.pages.map((page, idx) => {
              if (idx === lastIdx) {
                return {
                  ...page,
                  items: [...page.items, optimisticComment],
                  meta: { ...page.meta, total: page.meta.total + 1 },
                };
              }
              return {
                ...page,
                meta: { ...page.meta, total: page.meta.total + 1 },
              };
            });
            return { ...old, pages: updatedPages };
          } else {
            // Phản hồi: chèn vào đúng nút cha
            const updatedPages = old.pages.map((page) => ({
              ...page,
              items: insertReplyNode(page.items, body.parentCommentId!, optimisticComment),
            }));
            return { ...old, pages: updatedPages };
          }
        }
      );

      // 4. Tăng ngay commentCount của bài viết/công thức
      queryClient.setQueryData<CommentCounted>(
        communityKeys.content(target),
        (old) => (old ? { ...old, commentCount: old.commentCount + 1 } : old)
      );

      return { previousComments, previousPost, tempId };
    },

    onError: (_error, _variables, context) => {
      // Khôi phục cache nếu có lỗi
      if (context?.previousComments) {
        queryClient.setQueryData(communityKeys.comments(target), context.previousComments);
      }
      if (context?.previousPost) {
        queryClient.setQueryData(communityKeys.content(target), context.previousPost);
      }
    },

    onSuccess: (res, _variables, context) => {
      const realComment = res.data;
      if (realComment && context?.tempId) {
        if (realComment.status === 'ACTIVE') {
          // Thay thế tempId bằng real ID từ server
          queryClient.setQueryData<InfiniteData<Paged<PostComment>>>(
            communityKeys.comments(target),
            (old) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: replaceCommentNode(page.items, context.tempId, realComment),
                })),
              };
            }
          );
        } else {
          // Bị AI gắn cờ kiểm duyệt: gỡ bỏ khỏi giao diện người dùng
          queryClient.setQueryData<InfiniteData<Paged<PostComment>>>(
            communityKeys.comments(target),
            (old) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: removeCommentNode(page.items, context.tempId),
                })),
              };
            }
          );
        }
      }
      invalidate();
    },
  });
}

export function useUpdateComment(target: ContentRef) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateComments(target);

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      updateComment(commentId, { content }),

    onMutate: async ({ commentId, content }) => {
      await queryClient.cancelQueries({ queryKey: communityKeys.comments(target) });
      const previousComments = queryClient.getQueryData<InfiniteData<Paged<PostComment>>>(communityKeys.comments(target));

      queryClient.setQueryData<InfiniteData<Paged<PostComment>>>(
        communityKeys.comments(target),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: updateCommentContent(page.items, commentId, content),
            })),
          };
        }
      );

      return { previousComments };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(communityKeys.comments(target), context.previousComments);
      }
    },

    onSuccess: invalidate,
  });
}

export function useDeleteComment(target: ContentRef) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateComments(target);

  return useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),

    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: communityKeys.comments(target) });
      await queryClient.cancelQueries({ queryKey: communityKeys.content(target) });

      const previousComments = queryClient.getQueryData<InfiniteData<Paged<PostComment>>>(communityKeys.comments(target));
      const previousPost = queryClient.getQueryData<CommentCounted>(communityKeys.content(target));

      queryClient.setQueryData<InfiniteData<Paged<PostComment>>>(
        communityKeys.comments(target),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: removeCommentNode(page.items, commentId),
              meta: { ...page.meta, total: Math.max(0, page.meta.total - 1) },
            })),
          };
        }
      );

      queryClient.setQueryData<CommentCounted>(
        communityKeys.content(target),
        (old) => (old ? { ...old, commentCount: Math.max(0, old.commentCount - 1) } : old)
      );

      return { previousComments, previousPost };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(communityKeys.comments(target), context.previousComments);
      }
      if (context?.previousPost) {
        queryClient.setQueryData(communityKeys.content(target), context.previousPost);
      }
    },

    onSuccess: invalidate,
  });
}

