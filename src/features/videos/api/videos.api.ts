import http from '@/api/http';
import type { ApiEnvelope } from '@/api/types';
import { toApiError } from '@/lib/apiError';
import type { ExtractVideoResult, TranscriptResult, VideoTranscriptResponse } from '../types/video.types';

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
