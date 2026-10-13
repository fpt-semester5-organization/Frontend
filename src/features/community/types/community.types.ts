import type { ApiOperations, DeepRequired, Schemas } from '@/api/types';

// Mọi type lấy từ src/api/generated (sinh từ docs/08. OpenAPI); chỉ bổ sung chỗ OpenAPI bỏ trống.

/** GET /posts (FN-POST-05). */
export type PostListItem = DeepRequired<Schemas['ListPostsResponse']['data'][number]>;
export type PostListParams = NonNullable<ApiOperations['listPosts']['parameters']['query']>;
export type PostSort = NonNullable<PostListParams['sort']>;

/**
 * UNSPECIFIED: OpenAPI chưa mô tả phần tử của videos[] và recipes[] trong GET /posts/{id}.
 * Tạm đọc các field dưới đây theo bảng Videos/Recipes (Data Dictionary); cần Leader bổ sung schema.
 */
export interface PostVideoAttachment {
  videoId?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  status?: string;
  title?: string;
}
export interface PostRecipeAttachment {
  recipeId?: number;
  title?: string;
  imageUrl?: string;
}

type PostDetailRaw = DeepRequired<Schemas['GetPostResponse']['data']>;

/** GET /posts/{id} (FN-POST-06). */
export type PostDetail = Omit<PostDetailRaw, 'imageUrl' | 'videos' | 'recipes'> & {
  imageUrl: string | null;
  videos: PostVideoAttachment[];
  recipes: PostRecipeAttachment[];
};

type PostCommentRaw = DeepRequired<Schemas['ListPostCommentsResponse']['data'][number]>;

/** Bình luận dạng cây (FN-COMM-01). replies[] chưa có schema phần tử; theo mô tả là bình luận con cùng cấu trúc. */
export type PostComment = Omit<PostCommentRaw, 'parentCommentId' | 'replies'> & {
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
