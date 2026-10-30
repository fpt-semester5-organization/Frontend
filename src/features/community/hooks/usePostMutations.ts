import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { watchVideoTranscript } from '@/features/videos/hooks/useTranscriptWatchStore';
import { recipeKeys } from '@/features/recipes/hooks/recipeKeys';
import { createPost, deletePost, updatePost, uploadPostMedia } from '../api/community.api';
import { getAttachmentKind } from '../types/community.schemas';
import type { CreatePostBody, UpdatePostBody } from '../types/community.types';
import { addRecentCreatedItem, updateRecentCreatedItem } from '../lib/recentFeedStore';
import { communityKeys } from './communityKeys';

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePostBody) => createPost(body),
    onSuccess: (res, body) => {
      const user = useAuthStore.getState().user;
      addRecentCreatedItem({
        key: `POST-${res.data.postId}`,
        kind: 'POST',
        id: res.data.postId,
        title: body.title,
        authorName: user?.fullName ?? 'Thành viên',
        authorAvatarUrl: user?.avatarUrl ?? null,
        createdAt: new Date().toISOString(),
        voteCount: 0,
        commentCount: 0,
        type: 'POST',
        hasVideo: false,
      });

      queryClient.invalidateQueries({ queryKey: communityKeys.postLists() });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

export function useUpdatePost(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePostBody) => updatePost(postId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.postLists() });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => deletePost(postId),
    onSuccess: (_data, postId) => {
      queryClient.removeQueries({ queryKey: communityKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.postLists() });
    },
  });
}

export function useUploadPostMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadPostMedia,
    onSuccess: async (res, { file, postId }) => {
      // 1. Đồng bộ thumbnail vào bài viết và kích hoạt Backend xóa cache Redis post_list:*
      if (res.data.imageUrl) {
        try {
          await updatePost(postId, { imageUrl: res.data.imageUrl });
        } catch {
          // Bỏ qua nếu có lỗi
        }
      }

      // 2. Cập nhật lạc quan (optimistic) dữ liệu video vào danh sách đang hiển thị để thấy ngay lập tức
      const derivedVideoUrl =
        res.data.imageUrl?.includes('/video/upload/')
          ? res.data.imageUrl.replace(/\.jpg$/i, '.mp4')
          : undefined;

      queryClient.setQueriesData<{ pages: Array<{ items: PostListItem[] }> }>(
        { queryKey: communityKeys.postLists() },
        (oldData) => {
          if (!oldData || !oldData.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.postId === postId
                  ? {
                      ...item,
                      hasVideo: true,
                      type: 'VIDEO',
                      videoId: res.data.videoId,
                      videoUrl: derivedVideoUrl,
                      imageUrl: res.data.imageUrl ?? item.imageUrl,
                    }
                  : item
              ),
            })),
          };
        }
      );

      // 3. Cập nhật vào recentFeedStore để bài viết hiện ngay lập tức ở vị trí số 1 trên Community
      const isVideo = getAttachmentKind(file) === 'video';
      updateRecentCreatedItem(
        (item) => item.kind === 'POST' && item.id === postId,
        (item) => ({
          ...item,
          hasVideo: isVideo,
          type: isVideo ? 'VIDEO' : item.type,
          videoId: res.data.videoId,
          videoUrl: derivedVideoUrl,
          imageUrl: res.data.imageUrl ?? item.imageUrl,
        })
      );

      // 4. Làm mới cache
      queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.postLists() });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });

      // Video mới được bóc tách công thức ngầm (FN-POST-10): theo dõi để báo tác giả khi có kết quả.
      if (getAttachmentKind(file) === 'video') {
        watchVideoTranscript({ videoId: res.data.videoId, postId, title: file.name });
      }
    },
  });
}
