import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { watchVideoTranscript } from '@/features/videos/hooks/useTranscriptWatchStore';
import { recipeKeys } from '@/features/recipes/hooks/recipeKeys';
import { createPost, deletePost, updatePost, uploadPostMedia } from '../api/community.api';
import { getAttachmentKind } from '../types/community.schemas';
import type { CreatePostBody, PostListItem, UpdatePostBody } from '../types/community.types';
import { addRecentCreatedItem, removeRecentCreatedItem, updateRecentCreatedItem } from '../lib/recentFeedStore';
import { communityKeys } from './communityKeys';

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePostBody) => createPost(body),
    onSuccess: (res, body) => {
      const user = useAuthStore.getState().user;
      const status = res.data.moderationStatus;

      // Chỉ hiển thị ngay trên bảng tin công khai khi bài viết đã được duyệt hợp lệ (APPROVED_ACTIVE)
      if (status === 'APPROVED_ACTIVE') {
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
          moderationStatus: status,
        });
      } else {
        // Nếu bài viết bị tạm ẩn/khóa do vi phạm (QUARANTINED_HIDDEN) hoặc chờ duyệt/nháp, đảm bảo không có trong feed
        removeRecentCreatedItem((item) => item.kind === 'POST' && item.id === res.data.postId);
      }

      queryClient.invalidateQueries({ queryKey: communityKeys.postLists() });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

export function useUpdatePost(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePostBody) => updatePost(postId, body),
    onSuccess: (res) => {
      if (res.data?.moderationStatus && res.data.moderationStatus !== 'APPROVED_ACTIVE') {
        removeRecentCreatedItem((item) => item.kind === 'POST' && item.id === postId);
      }
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
      removeRecentCreatedItem((item) => item.kind === 'POST' && item.id === postId);
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
      const isQuarantined = Boolean(res.data.moderationStatus && res.data.moderationStatus !== 'APPROVED_ACTIVE');

      // 1. Đồng bộ thumbnail vào bài viết nếu cần
      if (res.data.imageUrl && !isQuarantined) {
        try {
          await updatePost(postId, { imageUrl: res.data.imageUrl } as unknown as UpdatePostBody);
        } catch {
          // Bỏ qua nếu có lỗi
        }
      }

      // 2. Cập nhật lạc quan (optimistic) dữ liệu video vào danh sách đang hiển thị
      const derivedVideoUrl =
        res.data.imageUrl?.includes('/video/upload/')
          ? res.data.imageUrl.replace(/\.jpg$/i, '.mp4')
          : undefined;

      if (isQuarantined) {
        // Loại bỏ bài viết bị tạm ẩn khỏi danh sách bài viết hiển thị trên feed
        queryClient.setQueriesData<{ pages: Array<{ items: PostListItem[] }> }>(
          { queryKey: communityKeys.postLists() },
          (oldData) => {
            if (!oldData || !oldData.pages) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                items: page.items.filter((item) => item.postId !== postId),
              })),
            };
          }
        );
        removeRecentCreatedItem((item) => item.kind === 'POST' && item.id === postId);
      } else {
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

        // 3. Cập nhật vào recentFeedStore để bài viết hợp lệ hiện ngay lập tức ở vị trí số 1
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
      }

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
