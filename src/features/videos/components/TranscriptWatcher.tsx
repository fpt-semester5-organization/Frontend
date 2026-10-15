import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { subscribeTranscriptOutcome } from '../api/transcriptEvents';
import { useTranscriptWatchStore, type TranscriptWatch } from '../hooks/useTranscriptWatchStore';
import { videoKeys } from '../hooks/videoKeys';

const WatchItem: React.FC<{ watch: TranscriptWatch }> = ({ watch }) => {
  const queryClient = useQueryClient();
  const remove = useTranscriptWatchStore((state) => state.remove);
  const pushToast = useUiStore((state) => state.pushToast);
  const { videoId, postId, title, until } = watch;

  useEffect(
    () =>
      subscribeTranscriptOutcome(
        videoId,
        {
          onOutcome: (outcome) => {
            remove(videoId);
            void queryClient.invalidateQueries({ queryKey: videoKeys.transcript(videoId) });
            // Đang mở đúng trang video đó thì trang đã tự cập nhật, không cần báo thêm.
            if (window.location.pathname === PATHS.VIDEOS.DETAIL(videoId)) return;

            const name = title ? `"${title}"` : 'của bạn';
            const action = { label: 'Xem kết quả', to: PATHS.VIDEOS.DETAIL(videoId, postId) };
            if (outcome === 'COMPLETED') {
              pushToast('success', `Đã có bản tóm tắt công thức từ video ${name}. Hãy kiểm tra lại kết quả AI tạo.`, action);
            } else {
              pushToast('warning', `Chưa bóc tách được công thức từ video ${name}.`, action);
            }
          },
          onGiveUp: () => remove(videoId),
        },
        until
      ),
    [videoId, postId, title, until, remove, pushToast, queryClient]
  );

  return null;
};

/**
 * Báo cho tác giả khi video vừa đăng đã bóc tách xong (FN-POST-10 bước 6), kể cả khi đang ở trang khác.
 * Gắn một lần trong AppShell.
 */
export const TranscriptWatcher: React.FC = () => {
  const userId = useAuthStore((state) => state.user?.userId ?? null);
  const watches = useTranscriptWatchStore((state) => state.watches);
  if (userId === null) return null;

  return (
    <>
      {watches
        .filter((watch) => watch.userId === userId)
        .map((watch) => (
          <WatchItem key={watch.videoId} watch={watch} />
        ))}
    </>
  );
};
