import { useMutation, useQueryClient } from '@tanstack/react-query';
import { watchVideoTranscript } from '@/features/videos/hooks/useTranscriptWatchStore';
import { createPost, deletePost, updatePost, uploadPostMedia } from '../api/community.api';
import { getAttachmentKind } from '../types/community.schemas';
import type { CreatePostBody, UpdatePostBody } from '../types/community.types';
import { communityKeys } from './communityKeys';

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePostBody) => createPost(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityKeys.postLists() }),
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
    onSuccess: (res, { file, postId }) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.postLists() });
      // Video mới được bóc tách công thức ngầm (FN-POST-10): theo dõi để báo tác giả khi có kết quả.
      if (getAttachmentKind(file) === 'video') {
        watchVideoTranscript({ videoId: res.data.videoId, postId, title: file.name });
      }
    },
  });
}
