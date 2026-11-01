import http from '@/api/http';
import type { ApiEnvelope } from '@/api/types';
import { toApiError } from '@/lib/apiError';
import type { ExtractedRecipe, ExtractVideoResult, TranscriptResult, VideoTranscriptResponse } from '../types/video.types';

/**
 * GET /videos/{id}/transcript — FN-POST-09 Xem bản phiên âm & công thức của video.
 * Khách bị trừ 1 trong 03 lượt AI dùng thử (mở lại cùng video không bị trừ thêm, Leader câu 7);
 * 404 ERR_TRANSCRIPT_NOT_READY không trừ lượt và được coi là "đang xử lý".
 */
export async function getVideoTranscript(videoId: number): Promise<TranscriptResult> {
  try {
    const res = await http.get<ApiEnvelope<VideoTranscriptResponse>>(`/videos/${videoId}/transcript`);
    const transcript = res.data.data;
    const status = transcript.transcriptStatus ?? 'COMPLETED';
    return status === 'COMPLETED' ? { status, transcript } : { status, transcript: null };
  } catch (error) {
    if (toApiError(error).errorCode === 'ERR_TRANSCRIPT_NOT_READY') return { status: 'PENDING', transcript: null };
    throw error;
  }
}

/** POST /videos/{id}/extract-recipe — FN-POST-10: tác giả chạy lại bóc tách khi lần đầu thất bại (202). */
export async function extractVideoRecipe(videoId: number) {
  const res = await http.post<ApiEnvelope<ExtractVideoResult>>(`/videos/${videoId}/extract-recipe`);
  return res.data;
}

export interface DirectAiRecipe {
  title: string;
  servings?: number | null;
  cookTimeMinutes?: number | null;
  prepTimeMinutes?: number | null;
  ingredients: Array<{ name: string; quantity?: number | null; unit?: string | null }>;
  steps: string[];
  tips?: string[];
}

export interface DirectAiExtractResult {
  rawTranscript: string;
  durationSeconds: number;
  recipe?: DirectAiRecipe;
}

/**
 * Lưu kết quả bóc tách bản phiên âm và công thức từ video xuống CSDL Backend (FN-POST-09, FN-POST-10).
 * Giúp dữ liệu lưu vĩnh viễn, lần sau mở lên hiển thị ngay mà không cần gọi lại AI.
 */
export async function saveVideoTranscript(
  videoId: number,
  data: {
    rawTranscript: string;
    recipe?: ExtractedRecipe | null;
    segments?: Array<{ start: number; end: number; text: string }>;
    sttModelVersion?: string;
  }
) {
  const res = await http.post<ApiEnvelope<VideoTranscriptResponse>>(`/videos/${videoId}/transcript`, data);
  return res.data;
}

/**
 * Gọi AI STT Microservice qua proxy /ai-stt để bóc tách video bằng Faster-Whisper & Gemini.
 */
export async function extractVideoDirectlyWithAi(videoUrl: string): Promise<DirectAiExtractResult> {
  const res = await http.post<DirectAiExtractResult>('/ai-stt/stt/video-to-recipe', { videoUrl }, { timeout: 120000 });
  return res.data;
}

/**
 * Quy trình chuẩn: Gọi AI STT 1 lần duy nhất, sau đó LƯU NGAY XUỐNG CSDL BACKEND.
 * Khi lưu thành công, bất kỳ người dùng nào mở video sau này đều có sẵn công thức từ Backend.
 */
export async function extractAndSaveVideoRecipe(
  videoId: number,
  videoUrl: string
): Promise<{ rawTranscript: string; recipe?: ExtractedRecipe; durationSeconds?: number }> {
  const aiResult = await extractVideoDirectlyWithAi(videoUrl);
  if (videoId > 0 && aiResult.rawTranscript) {
    try {
      await saveVideoTranscript(videoId, {
        rawTranscript: aiResult.rawTranscript,
        recipe: aiResult.recipe as ExtractedRecipe,
      });
    } catch (saveErr) {
      console.warn('Lỗi lưu transcript xuống Backend:', saveErr);
    }
  }
  return aiResult as { rawTranscript: string; recipe?: ExtractedRecipe; durationSeconds?: number };
}
