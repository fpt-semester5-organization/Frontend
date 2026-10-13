import http from '@/api/http';
import type { ApiEnvelope, PageMeta } from '@/api/types';
import type {
  CreateCommentBody,
  CreatePostBody,
  CreateReportBody,
  CreateReportResult,
  DeleteCommentResult,
  PostComment,
  PostDetail,
  PostListItem,
  PostListParams,
  PostMutationResult,
  UpdateCommentBody,
  UpdatePostBody,
  UploadMediaResult,
  VoteResult,
} from '../types/community.types';

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}

const toPaged = <T>(envelope: ApiEnvelope<T[]>, fallbackSize: number): Paged<T> => ({
  items: envelope.data,
  meta: envelope.meta ?? { page: 1, size: fallbackSize, total: envelope.data.length },
});

/** GET /posts — FN-POST-05 Tìm kiếm & xem danh sách bài viết. */
export async function listPosts(params: PostListParams): Promise<Paged<PostListItem>> {
  const res = await http.get<ApiEnvelope<PostListItem[]>>('/posts', { params });
  return toPaged(res.data, params.size ?? 10);
}

/** GET /posts/{id} — FN-POST-06 Xem chi tiết bài viết. */
export async function getPost(id: number): Promise<PostDetail> {
  const res = await http.get<ApiEnvelope<PostDetail>>(`/posts/${id}`);
  return res.data.data;
}

/** POST /posts — FN-POST-07 Đăng bài (submit = false: lưu nháp). */
export async function createPost(body: CreatePostBody) {
  const res = await http.post<ApiEnvelope<PostMutationResult>>('/posts', body);
  return res.data;
}

/** PUT /posts/{id} — FN-POST-07 Sửa bài (chỉ gửi field đã đổi). */
export async function updatePost(id: number, body: UpdatePostBody) {
  const res = await http.put<ApiEnvelope<PostMutationResult>>(`/posts/${id}`, body);
  return res.data;
}

/** DELETE /posts/{id} — FN-POST-07 Xóa mềm bài viết. */
export async function deletePost(id: number) {
  const res = await http.delete<ApiEnvelope<null>>(`/posts/${id}`);
  return res.data;
}

/** POST /videos — FN-POST-08 Tải ảnh/video lên Cloudinary và gắn vào bài viết. */
export async function uploadPostMedia(input: { file: File; postId: number; title?: string }) {
  const form = new FormData();
  form.append('file', input.file);
  form.append('postId', String(input.postId));
  if (input.title) form.append('title', input.title);
  const res = await http.post<ApiEnvelope<UploadMediaResult>>('/videos', form, { timeout: 120000 });
  return res.data;
}

/** GET /posts/{id}/comments — FN-COMM-01 Bình luận dạng cây, phân trang theo bình luận gốc. */
export async function listPostComments(postId: number, params: { page: number; size: number }) {
  const res = await http.get<ApiEnvelope<PostComment[]>>(`/posts/${postId}/comments`, { params });
  return toPaged(res.data, params.size);
}

/** POST /posts/{id}/comments — FN-COMM-02 Bình luận / trả lời. */
export async function createPostComment(postId: number, body: CreateCommentBody) {
  const res = await http.post<ApiEnvelope<PostComment>>(`/posts/${postId}/comments`, body);
  return res.data;
}

/** PUT /comments/{id} — FN-COMM-03 Sửa bình luận của mình. */
export async function updateComment(commentId: number, body: UpdateCommentBody) {
  const res = await http.put<ApiEnvelope<PostComment>>(`/comments/${commentId}`, body);
  return res.data;
}

/** DELETE /comments/{id} — FN-COMM-03 Xóa mềm bình luận và toàn bộ phản hồi con. */
export async function deleteComment(commentId: number) {
  const res = await http.delete<ApiEnvelope<DeleteCommentResult>>(`/comments/${commentId}`);
  return res.data;
}

/** POST /posts/{id}/votes — FN-COMM-04 Thả tim / bỏ tim (gọi lần hai là bỏ tim). */
export async function togglePostVote(postId: number) {
  const res = await http.post<ApiEnvelope<VoteResult>>(`/posts/${postId}/votes`);
  return res.data;
}

/** POST /reports — FN-COMM-05 Báo cáo vi phạm; nội dung bị ẩn ngay chờ Admin. */
export async function createReport(body: CreateReportBody) {
  const res = await http.post<ApiEnvelope<CreateReportResult>>('/reports', body);
  return res.data;
}
