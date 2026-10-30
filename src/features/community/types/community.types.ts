import type { ApiOperations, DeepRequired, Schemas } from '@/api/types';

// Mọi type lấy từ src/api/generated (sinh từ docs/08. OpenAPI); chỉ bổ sung chỗ OpenAPI bỏ trống.

/**
 * Nội dung nhận bình luận, thả tim, báo cáo (FN-COMM-01..05): bài viết (/posts/{id}/…) hoặc công thức (/recipes/{id}/…).
 * Hai nhóm endpoint có cùng cấu trúc request/response.
 */
export interface ContentRef {
  resource: 'posts' | 'recipes';
  id: number;
}

/** GET /posts (FN-POST-05). */
export type PostListItem = DeepRequired<Schemas['ListPostsResponse']['data'][number]> & {
  authorAvatarUrl?: string | null;
  moderationStatus?: string | null;
  visibility?: 'PUBLIC' | 'PRIVATE' | null;
};
export type PostListParams = NonNullable<ApiOperations['listPosts']['parameters']['query']>;
export type PostSort = NonNullable<PostListParams['sort']>;

/** Videos.Status: PROCESSING (đang mã hóa), READY, FAILED, BANNED. */
export type VideoStatus = 'PROCESSING' | 'READY' | 'FAILED' | 'BANNED';

/**
 * UNSPECIFIED: OpenAPI chưa mô tả phần tử của videos[] và recipes[] trong GET /posts/{id}.
 * videos[]: Leader đã đồng ý ngày 13/10/2026 dùng các field dưới đây (theo bảng Videos), chờ BE cập nhật OpenAPI.
 * recipes[]: tạm đọc theo bảng Recipes, chưa chốt.
 */
export interface PostVideoAttachment {
  videoId?: number;
  title?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  status?: VideoStatus;
}
export interface PostRecipeAttachment {
  recipeId?: number;
  title?: string;
  imageUrl?: string;
}

type PostDetailRaw = DeepRequired<Schemas['GetPostResponse']['data']>;

/** GET /posts/{id} (FN-POST-06). */
export type PostDetail = Omit<PostDetailRaw, 'imageUrl' | 'videos' | 'recipes' | 'author'> & {
  imageUrl: string | null;
  author: {
    userId: number;
    fullName: string;
    avatarUrl?: string | null;
  };
  videos: PostVideoAttachment[];
  recipes: PostRecipeAttachment[];
  createdAt?: string;
};

type PostCommentRaw = DeepRequired<Schemas['ListPostCommentsResponse']['data'][number]>;

/** Bình luận dạng cây (FN-COMM-01). replies[] chưa có schema phần tử; theo mô tả là bình luận con cùng cấu trúc. */
export type PostComment = Omit<PostCommentRaw, 'parentCommentId' | 'replies' | 'author'> & {
  author: {
    userId: number;
    fullName: string;
    avatarUrl?: string | null;
  };
  parentCommentId: number | null;
  replies: PostComment[];
};

export type CreatePostBody = Schemas['CreatePostRequest'];
export type UpdatePostBody = Schemas['UpdatePostRequest'];
export type PostVisibility = NonNullable<CreatePostBody['visibility']>;
export type PostMutationResult = DeepRequired<Schemas['CreatePostResponse']['data']>;
export type ModerationStatus = PostMutationResult['moderationStatus'];

export type CreateCommentBody = Schemas['CreatePostCommentRequest'];
export type UpdateCommentBody = Schemas['UpdateCommentRequest'];
export type DeleteCommentResult = DeepRequired<Schemas['DeleteCommentResponse']['data']>;

/** POST /posts/{id}/votes (FN-COMM-04). */
export type VoteResult = DeepRequired<Schemas['CreatePostVoteResponse']['data']>;

/** POST /reports (FN-COMM-05). */
export type CreateReportBody = Schemas['CreateReportRequest'];
export type ReportTargetType = CreateReportBody['targetType'];
export type ViolationType = CreateReportBody['violationType'];
export type CreateReportResult = DeepRequired<Schemas['CreateReportResponse']['data']>;

/** POST /videos (FN-POST-08): tải ảnh/video lên Cloudinary và gắn vào bài viết. */
export type UploadMediaResult = DeepRequired<Schemas['CreateVideoResponse']['data']>;

export type FeedItemKind = 'POST' | 'RECIPE';

/** Mục trong feed cộng đồng: hợp nhất bài viết (Blog) và công thức món chay (Recipe). */
export interface CommunityFeedItem {
  key: string;
  kind: FeedItemKind;
  id: number;
  title: string;
  imageUrl?: string | null;
  authorName?: string;
  authorAvatarUrl?: string | null;
  createdAt?: string;
  voteCount: number;
  commentCount?: number;
  cookTimeMinutes?: number | null;
  caloriesKcal?: number | null;
  dietarySchool?: string | null;
  isVerified?: boolean;
  type?: string;
  hasVideo?: boolean;
  videoId?: number;
  videoUrl?: string;
}

export const fromPost = (p: PostListItem): CommunityFeedItem => ({
  key: `POST-${p.postId}`,
  kind: 'POST',
  id: p.postId,
  title: p.title,
  imageUrl: p.imageUrl,
  authorName: p.authorName,
  authorAvatarUrl: p.authorAvatarUrl,
  createdAt: p.createdAt,
  voteCount: p.voteCount,
  commentCount: p.commentCount,
  type: (p as { type?: string }).type,
  hasVideo: Boolean(
    (p as { hasVideo?: boolean }).hasVideo ||
    (p as { type?: string }).type === 'VIDEO' ||
    (p as { videoUrl?: string }).videoUrl
  ),
  videoId: (p as { videoId?: number }).videoId,
  videoUrl: (p as { videoUrl?: string }).videoUrl,
});

export const fromRecipe = (r: import('@/features/recipes/types/recipe.types').RecipeListItem): CommunityFeedItem => ({
  key: `RECIPE-${r.recipeId}`,
  kind: 'RECIPE',
  id: r.recipeId,
  title: r.title,
  imageUrl: r.imageUrl,
  authorName: 'Bếp Chay VeggieLife',
  authorAvatarUrl: '/logo.png',
  voteCount: r.voteCount,
  cookTimeMinutes: r.cookTimeMinutes,
  caloriesKcal: r.caloriesKcal,
  dietarySchool: r.dietarySchool,
  isVerified: r.isVerified,
  type: r.type,
  hasVideo: Boolean(r.type === 'VIDEO'),
});

/** Trộn xen kẽ hai mảng (bài viết, công thức) để feed Tất cả luôn đa dạng nội dung. */
export function interleaveItems<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}
