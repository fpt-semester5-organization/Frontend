import { toApiError } from '@/lib/apiError';
import { getVideoTranscript } from './videos.api';

export type TranscriptOutcome = 'COMPLETED' | 'FAILED';

/** Bóc tách mất khoảng 2–3 phút; tác vụ nền chỉ hỏi lại thưa hơn trang video. */
const WATCH_INTERVAL_MS = 10 * 1000;

/**
 * Nhận kết quả bóc tách của một video cho tác giả.
 *
 * FN-POST-10 (bước 6) dự kiến BE phát SignalR cho tác giả, nhưng chưa có địa chỉ hub và tên sự kiện.
 * Tạm thời hỏi lại GET /videos/{id}/transcript định kỳ (NFR CI-5 cho phép). Khi có hub, chỉ cần thay
 * thân hàm này bằng connection.on(...), nơi gọi giữ nguyên.
 *
 * Trả về hàm hủy theo dõi.
 */
export function subscribeTranscriptOutcome(
  videoId: number,
  handlers: { onOutcome: (outcome: TranscriptOutcome) => void; onGiveUp: () => void },
  until: number
): () => void {
  let stopped = false;
  let timer: number | undefined;

  const tick = async () => {
    try {
      const result = await getVideoTranscript(videoId);
      if (stopped) return;
      if (result.status !== 'PENDING') {
        handlers.onOutcome(result.status);
        return;
      }
    } catch (error) {
      if (stopped) return;
      // Video hoặc bài viết đã bị xóa: không còn gì để báo.
      if (toApiError(error).status === 404) {
        handlers.onGiveUp();
        return;
      }
      // Lỗi tạm thời (mạng, 5xx, 429): bỏ qua lần này, hỏi lại sau.
    }
    if (Date.now() >= until) {
      handlers.onGiveUp();
      return;
    }
    timer = window.setTimeout(tick, WATCH_INTERVAL_MS);
  };

  timer = window.setTimeout(tick, WATCH_INTERVAL_MS);
  return () => {
    stopped = true;
    window.clearTimeout(timer);
  };
}
