import type { DeepRequired, Schemas } from '@/api/types';

// Mọi type lấy từ src/api/generated (sinh từ docs/08. OpenAPI); chỉ bổ sung chỗ OpenAPI bỏ trống.

type TranscriptData = DeepRequired<Schemas['GetVideoTranscriptResponse']['data']>;

/** Công thức AI trích từ lời thoại (Extracted_Recipe_JSON): tên món, nguyên liệu, các bước. */
export type ExtractedRecipe = TranscriptData['extractedRecipe'];
export type ExtractedIngredient = ExtractedRecipe['ingredients'][number];

/** Hạn mức AI dùng thử của Khách (03 lượt/phiên, BR-GUEST-02); Thành viên không có. */
export type AiQuota = TranscriptData['quota'];

/** VideoTranscripts.Status. */
export type TranscriptStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

/**
 * GET /videos/{id}/transcript (FN-POST-09) như server trả.
 * UNSPECIFIED: transcriptStatus nằm trong "Dữ liệu hiển thị" của SCR-21 nhưng OpenAPI chưa có;
 * ngày 13/10/2026 đã thống nhất FE hiển thị trạng thái transcript (BE bổ sung field). Thiếu field thì 200 nghĩa là COMPLETED.
 * extractedRecipe = null khi người xem khác chưa được thấy công thức: chỉ hiện sau khi tác giả xác nhận và được duyệt
 * (Leader chốt câu 6, 13/10/2026).
 */
export type VideoTranscriptResponse = Omit<TranscriptData, 'rawTranscript' | 'extractedRecipe' | 'quota'> & {
  rawTranscript: string | null;
  extractedRecipe: ExtractedRecipe | null;
  quota?: AiQuota | null;
  transcriptStatus?: TranscriptStatus;
};

/** Kết quả đã chuẩn hóa cho giao diện: 404 ERR_TRANSCRIPT_NOT_READY cũng là "đang xử lý" (UC-13, 1.0.E1). */
export type TranscriptResult =
  | { status: 'COMPLETED'; transcript: VideoTranscriptResponse }
  | { status: 'PENDING' | 'FAILED'; transcript: null };

/** POST /videos/{id}/extract-recipe (FN-POST-10): 202 { videoId, transcriptStatus: PENDING }. */
export type ExtractVideoResult = DeepRequired<Schemas['ExtractVideoRecipeResponse']['data']>;
