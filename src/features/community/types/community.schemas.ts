import { z } from 'zod';
import type { ViolationType } from './community.types';

// Luật validate lấy đúng cột "Validate" của SCR-26, SCR-27 (UI Screen Specification) và BR liên quan.

export const POST_TITLE_MIN = 10;
export const POST_TITLE_MAX = 150;
export const COMMENT_MIN = 2;
export const COMMENT_MAX = 500;
export const REPORT_EVIDENCE_MIN = 10;
export const REPORT_EVIDENCE_MAX = 500;
export const KEYWORD_MAX = 100;
/** Giãn cách tối thiểu giữa 2 bình luận (BR-USR-04). */
export const COMMENT_COOLDOWN_SECONDS = 15;

/** visibility = KEEP chỉ dùng khi sửa bài: GET /posts/{id} không trả visibility nên không gửi field này. */
export const postFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(POST_TITLE_MIN, `Tiêu đề cần ít nhất ${POST_TITLE_MIN} ký tự.`)
    .max(POST_TITLE_MAX, `Tiêu đề tối đa ${POST_TITLE_MAX} ký tự.`),
  content: z.string().trim().min(1, 'Vui lòng nhập nội dung bài viết.'),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'KEEP']),
});
export type PostFormValues = z.infer<typeof postFormSchema>;

export const commentFormSchema = z.object({
  content: z
    .string()
    .trim()
    .min(COMMENT_MIN, `Bình luận cần ít nhất ${COMMENT_MIN} ký tự.`)
    .max(COMMENT_MAX, `Bình luận tối đa ${COMMENT_MAX} ký tự.`),
});
export type CommentFormValues = z.infer<typeof commentFormSchema>;

export const VIOLATION_TYPE_OPTIONS: { value: ViolationType; label: string; hint: string }[] = [
  { value: 'VIO_MEAT', label: 'Có nguyên liệu động vật', hint: 'Thịt, cá, gia cầm, gelatin, mỡ động vật...' },
  { value: 'VIO_LABEL', label: 'Gắn sai nhãn trường phái', hint: 'Nhãn trường phái không khớp nguyên liệu.' },
  { value: 'VIO_HATE', label: 'Ngôn từ xúc phạm, thù địch', hint: 'Quấy rối, xúc phạm thành viên khác.' },
  { value: 'VIO_SPAM', label: 'Spam hoặc quảng cáo', hint: 'Quảng cáo trái phép, nội dung lặp lại.' },
];

export const reportFormSchema = z.object({
  violationType: z.enum(['VIO_MEAT', 'VIO_LABEL', 'VIO_HATE', 'VIO_SPAM'], {
    errorMap: () => ({ message: 'Vui lòng chọn loại vi phạm.' }),
  }),
  evidenceSummary: z
    .string()
    .trim()
    .min(REPORT_EVIDENCE_MIN, `Mô tả cần ít nhất ${REPORT_EVIDENCE_MIN} ký tự.`)
    .max(REPORT_EVIDENCE_MAX, `Mô tả tối đa ${REPORT_EVIDENCE_MAX} ký tự.`),
});
export type ReportFormValues = z.infer<typeof reportFormSchema>;

// Tệp đính kèm bài viết (FN-POST-08): ảnh JPEG/PNG/WEBP ≤ 5 MB (BR-USR-MEDIA-01)
// hoặc video MP4/MOV ≤ 100 MB, 10 giây–5 phút (BR-AI-STT-01, BR-AI-STT-03).
const MB = 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
export const IMAGE_MAX_BYTES = 5 * MB;
export const VIDEO_MAX_BYTES = 100 * MB;
export const VIDEO_MIN_SECONDS = 10;
export const VIDEO_MAX_SECONDS = 5 * 60;
export const ATTACHMENT_ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES, '.mov'].join(',');

export type AttachmentKind = 'image' | 'video';

export function getAttachmentKind(file: File): AttachmentKind | null {
  if (IMAGE_TYPES.includes(file.type)) return 'image';
  if (VIDEO_TYPES.includes(file.type) || /\.(mp4|mov)$/i.test(file.name)) return 'video';
  return null;
}

/** Kiểm tra định dạng, dung lượng và (với video) thời lượng; trả về câu lỗi hoặc null. */
export async function validateAttachment(file: File): Promise<string | null> {
  const kind = getAttachmentKind(file);
  if (!kind) return 'Chỉ nhận ảnh JPG, PNG, WEBP hoặc video MP4, MOV.';
  if (kind === 'image' && file.size > IMAGE_MAX_BYTES) return 'Ảnh tối đa 5 MB.';
  if (kind === 'video') {
    if (file.size > VIDEO_MAX_BYTES) return 'Video tối đa 100 MB.';
    const seconds = await readVideoDuration(file);
    if (seconds !== null && (seconds < VIDEO_MIN_SECONDS || seconds > VIDEO_MAX_SECONDS)) {
      return 'Video phải dài từ 10 giây đến 5 phút.';
    }
  }
  return null;
}

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null);
    // Trình duyệt không đọc được metadata (ví dụ MOV trên Chrome): để server kiểm tra.
    video.onerror = () => done(null);
    video.src = url;
  });
}
