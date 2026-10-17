import { recipeKeys } from '@/features/recipes/hooks/recipeKeys';
import type { ContentRef, PostListParams } from '../types/community.types';

export const communityKeys = {
  all: ['community'] as const,
  postLists: () => [...communityKeys.all, 'posts'] as const,
  postList: (params: PostListParams) => [...communityKeys.postLists(), params] as const,
  post: (postId: number) => [...communityKeys.all, 'post', postId] as const,
  comments: (target: ContentRef) => [...communityKeys.all, 'comments', target.resource, target.id] as const,
  /** Query chi tiết của nội dung (có voteCount, commentCount): bài viết hoặc công thức. */
  content: (target: ContentRef) =>
    target.resource === 'posts' ? communityKeys.post(target.id) : recipeKeys.detail(target.id),
  /** Các danh sách có hiển thị nội dung này (số tim, bài bị ẩn sau báo cáo). */
  contentLists: (target: ContentRef) =>
    target.resource === 'posts' ? communityKeys.postLists() : recipeKeys.lists(),
};
