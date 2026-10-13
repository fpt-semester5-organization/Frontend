import type { PostListParams } from '../types/community.types';

export const communityKeys = {
  all: ['community'] as const,
  postLists: () => [...communityKeys.all, 'posts'] as const,
  postList: (params: PostListParams) => [...communityKeys.postLists(), params] as const,
  post: (postId: number) => [...communityKeys.all, 'post', postId] as const,
  comments: (postId: number) => [...communityKeys.all, 'comments', postId] as const,
};
