import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { extractVideoRecipe, getVideoTranscript } from '../api/videos.api';
import type { TranscriptResult } from '../types/video.types';
import { videoKeys } from './videoKeys';

/** Hỏi lại mỗi 5 giây khi đang bóc tách. */
export const TRANSCRIPT_POLL_MS = 5000;
/** Bóc tách thường mất 2–3 phút (Leader, 13/10/2026); quá 5 phút thì dừng hỏi và cho bấm "Kiểm tra lại". */
export const TRANSCRIPT_POLL_LIMIT_MS = 5 * 60 * 1000;

/**
 * GET /videos/{id}/transcript.
 * - enabled: người xem chỉ tải khi bấm "Tóm tắt công thức từ video" (Leader câu 8); tác giả tải ngay.
 * - poll: tác giả hỏi lại định kỳ khi đang PENDING, tới hạn TRANSCRIPT_POLL_LIMIT_MS.
 * Không thử lại và giữ kết quả cả phiên: mỗi lần gọi thành công của Khách có thể bị tính lượt AI.
 */
export function useVideoTranscript(videoId: number, options: { enabled: boolean; poll: boolean }) {
  const [deadline, setDeadline] = useState(() => Date.now() + TRANSCRIPT_POLL_LIMIT_MS);

  const query = useQuery({
    queryKey: videoKeys.transcript(videoId),
    queryFn: () => getVideoTranscript(videoId),
    enabled: options.enabled && Number.isInteger(videoId) && videoId > 0,
    retry: false,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchInterval: (q) =>
      options.poll && q.state.data?.status === 'PENDING' && Date.now() < deadline ? TRANSCRIPT_POLL_MS : false,
  });

  const { refetch } = query;
  /** Hỏi lại ngay và mở thêm một lượt thăm dò mới (sau khi hết hạn hoặc vừa gửi bóc tách lại). */
  const restartPolling = useCallback(() => {
    setDeadline(Date.now() + TRANSCRIPT_POLL_LIMIT_MS);
    void refetch();
  }, [refetch]);

  // Lần hỏi cuối cùng luôn diễn ra sau mốc deadline, nên so dataUpdatedAt là đủ (không đọc Date.now() khi render).
  const pollingExpired = query.data?.status === 'PENDING' && options.poll && query.dataUpdatedAt >= deadline;

  return { ...query, restartPolling, pollingExpired };
}

/** POST /videos/{id}/extract-recipe: thành công (202) thì chuyển ngay sang "đang xử lý". */
export function useExtractVideoRecipe(videoId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => extractVideoRecipe(videoId),
    onSuccess: () =>
      queryClient.setQueryData<TranscriptResult>(videoKeys.transcript(videoId), { status: 'PENDING', transcript: null }),
  });
}
