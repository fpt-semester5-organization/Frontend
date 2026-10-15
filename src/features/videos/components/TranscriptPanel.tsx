import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { GuestQuotaBadge } from '@/components/common/GuestQuotaBadge';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCountdown } from '@/hooks/useCountdown';
import { toApiError, type ApiError } from '@/lib/apiError';
import { cn } from '@/lib/cn';
import { getErrorMessage, notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { watchVideoTranscript } from '../hooks/useTranscriptWatchStore';
import { useExtractVideoRecipe, useVideoTranscript } from '../hooks/useVideoTranscript';
import { videoKeys } from '../hooks/videoKeys';
import { TranscriptContent } from './TranscriptContent';

/** Khóa nút sau 429 (UI Spec 1.1: "khóa nút gửi tạm thời"). */
const RATE_LIMIT_LOCK_MS = 10 * 1000;
const TOO_FAST_MESSAGE = 'Thao tác quá nhanh, thử lại sau.';

const isServiceDown = (error: ApiError) => error.status === 502 || error.status === 503;

interface TranscriptPanelProps {
  videoId: number;
  /** null khi không biết video thuộc bài nào (mở link thiếu postId). */
  postId: number | null;
  videoTitle?: string;
  isAuthor: boolean;
}

/** Khối trạng thái giữa panel: icon, tiêu đề, mô tả và hành động. */
const PanelState: React.FC<{
  icon: string;
  title: string;
  spinning?: boolean;
  tone?: 'default' | 'warning';
  children?: React.ReactNode;
  role?: 'status' | 'alert';
}> = ({ icon, title, spinning, tone = 'default', children, role = 'status' }) => (
  <div role={role} className="flex flex-col items-center gap-space-sm py-space-lg text-center">
    <span
      className={cn(
        'flex h-14 w-14 items-center justify-center rounded-xl',
        tone === 'warning' ? 'bg-warning-container text-warning' : 'bg-primary-fixed text-primary'
      )}
    >
      <Icon name={icon} className={cn('text-[28px]', spinning && 'animate-spin')} />
    </span>
    <h3 className="font-label-lg text-label-lg text-on-surface">{title}</h3>
    {children}
  </div>
);

const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="max-w-[360px] font-body-sm text-body-sm text-on-surface-variant">{children}</p>
);

/**
 * TranscriptPanel của SCR-21: bản phiên âm & công thức AI (FN-POST-09) và bóc tách lại (FN-POST-10).
 * - Tác giả: tải ngay, thấy trạng thái PENDING / FAILED / COMPLETED; đang xử lý thì tự hỏi lại.
 * - Người xem: chỉ tải khi bấm "Xem tóm tắt công thức" (Leader câu 8); Khách dùng 1 trong 03 lượt AI dùng thử.
 */
export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ videoId, postId, videoTitle, isAuthor }) => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isGuest = !useAuthStore((state) => state.isAuthenticated);
  const pushToast = useUiStore((state) => state.pushToast);
  const openSignupPrompt = useUiStore((state) => state.openSignupPrompt);

  // Đã xem trong phiên (còn trong cache) thì hiện luôn, không bắt bấm lại.
  const [requested, setRequested] = useState(
    () => queryClient.getQueryData(videoKeys.transcript(videoId)) !== undefined
  );
  const transcript = useVideoTranscript(videoId, { enabled: isAuthor || requested, poll: isAuthor });
  const extract = useExtractVideoRecipe(videoId);
  const [extractError, setExtractError] = useState<ApiError | null>(null);
  const [alreadyDone, setAlreadyDone] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const lockSeconds = useCountdown(lockedUntil);

  const status = transcript.data?.status;
  const loadError = transcript.error ? toApiError(transcript.error) : null;

  // 429 khi tải: toast + khóa nút tạm thời.
  useEffect(() => {
    if (loadError?.status === 429) {
      pushToast('warning', loadError.message || TOO_FAST_MESSAGE);
      setLockedUntil(Date.now() + RATE_LIMIT_LOCK_MS);
    }
  }, [loadError, pushToast]);

  // Tác giả đang chờ: theo dõi nền để vẫn được báo nếu rời trang.
  useEffect(() => {
    if (isAuthor && status === 'PENDING' && postId) watchVideoTranscript({ videoId, postId, title: videoTitle });
  }, [isAuthor, status, postId, videoId, videoTitle]);

  const runExtract = () => {
    setExtractError(null);
    extract.mutate(undefined, {
      onSuccess: (res) => {
        notifySuccess(res.message || 'Đang bóc tách công thức.');
        transcript.restartPolling();
      },
      onError: (error) => {
        const apiError = toApiError(error);
        if (apiError.errorCode === 'ERR_STT_ALREADY_DONE') {
          setAlreadyDone(getErrorMessage(apiError));
        } else if (apiError.status === 422 || isServiceDown(apiError)) {
          setExtractError(apiError);
        } else if (apiError.errorCode === 'ERR_CONTENT_NOT_OWNER') {
          pushToast('warning', getErrorMessage(apiError));
        } else {
          if (apiError.status === 429) setLockedUntil(Date.now() + RATE_LIMIT_LOCK_MS);
          notifyApiError(apiError);
        }
      },
    });
  };

  const closeAlreadyDone = () => {
    setAlreadyDone(null);
    void transcript.refetch();
  };

  const quota = transcript.data?.transcript?.quota;
  const quotaExhausted = loadError?.errorCode === 'ERR_QUOTA_AI_EXCEEDED';
  const returnUrl = `${location.pathname}${location.search}`;

  const renderBody = () => {
    // Người xem chưa yêu cầu: giới thiệu chức năng, chưa gọi API (không tốn lượt).
    if (!isAuthor && !requested) {
      return (
        <PanelState icon="auto_awesome" title="Tóm tắt công thức từ video">
          <Hint>
            AI đã nghe lời thoại trong video và tóm tắt thành bản phiên âm cùng công thức: nguyên liệu, định lượng và các
            bước nấu.
          </Hint>
          {isGuest && (
            <Hint>Khách dùng 1 trong 03 lượt AI dùng thử cho mỗi video. Mở lại video đã xem không bị trừ thêm lượt.</Hint>
          )}
          <Button className="mt-1" onClick={() => setRequested(true)}>
            <Icon name="auto_awesome" className="text-[18px]" />
            Xem tóm tắt công thức
          </Button>
          {isGuest && (
            <Link
              to={withReturnUrl(PATHS.AUTH.REGISTER, returnUrl)}
              className="font-label-md text-label-md text-secondary no-underline hover:underline"
            >
              Đăng ký để dùng không giới hạn
            </Link>
          )}
        </PanelState>
      );
    }

    if (transcript.isPending) {
      return (
        <div role="status" aria-busy="true" aria-label="Đang tải bản tóm tắt" className="flex flex-col gap-space-sm">
          <Skeleton className="h-10" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      );
    }

    if (loadError) {
      if (quotaExhausted) {
        return (
          <PanelState icon="lock" title="Bạn đã dùng hết 03 lượt AI dùng thử" tone="warning" role="alert">
            <Hint>Đăng ký tài khoản miễn phí để xem tóm tắt công thức của mọi video không giới hạn.</Hint>
            <Button className="mt-1" onClick={() => openSignupPrompt(returnUrl)}>
              Đăng ký miễn phí
            </Button>
          </PanelState>
        );
      }
      if (loadError.status === 404) {
        return (
          <PanelState icon="search_off" title="Không tìm thấy bản tóm tắt" role="alert">
            <Hint>Video không tồn tại hoặc chưa được hiển thị công khai.</Hint>
          </PanelState>
        );
      }
      return (
        <PanelState
          icon={isServiceDown(loadError) ? 'cloud_off' : 'error'}
          title={isServiceDown(loadError) ? 'Dịch vụ tạm gián đoạn' : 'Chưa tải được bản tóm tắt'}
          tone="warning"
          role="alert"
        >
          <Hint>{getErrorMessage(loadError)}</Hint>
          <Button
            variant="outline"
            className="mt-1"
            onClick={() => transcript.refetch()}
            loading={transcript.isFetching}
            disabled={lockSeconds > 0}
          >
            {lockSeconds > 0 ? `Thử lại sau ${lockSeconds} giây` : 'Thử lại'}
          </Button>
        </PanelState>
      );
    }

    if (status === 'PENDING') {
      if (!isAuthor) {
        return (
          <PanelState icon="hourglass_empty" title="Video này chưa có bản tóm tắt công thức">
            <Hint>Hệ thống đang xử lý video. Vui lòng quay lại sau ít phút.</Hint>
            <Button variant="outline" className="mt-1" onClick={() => transcript.refetch()} loading={transcript.isFetching}>
              Kiểm tra lại
            </Button>
          </PanelState>
        );
      }
      if (transcript.pollingExpired) {
        return (
          <PanelState icon="hourglass_top" title="Việc bóc tách đang lâu hơn dự kiến">
            <Hint>Hệ thống vẫn đang xử lý video của bạn. Bạn có thể kiểm tra lại sau ít phút.</Hint>
            <Button variant="outline" className="mt-1" onClick={transcript.restartPolling} loading={transcript.isFetching}>
              Kiểm tra lại
            </Button>
          </PanelState>
        );
      }
      return (
        <PanelState icon="progress_activity" title="Đang bóc tách công thức từ video" spinning>
          <Hint>
            AI đang chuyển lời thoại thành bản phiên âm và công thức, thường mất 2–3 phút. Trang sẽ tự cập nhật; bạn cũng có
            thể rời trang, hệ thống sẽ báo khi xong.
          </Hint>
        </PanelState>
      );
    }

    if (status === 'FAILED') {
      return (
        <div className="flex flex-col gap-space-md">
          <PanelState icon="error" title="Bóc tách thất bại" tone="warning" role="alert">
            <Hint>Hệ thống chưa tạo được bản phiên âm từ video này. Bạn có thể yêu cầu bóc tách lại.</Hint>
            <Button
              className="mt-1"
              onClick={runExtract}
              loading={extract.isPending}
              disabled={lockSeconds > 0}
            >
              <Icon name="refresh" className="text-[18px]" />
              {lockSeconds > 0 ? `Thử lại sau ${lockSeconds} giây` : 'Bóc tách lại'}
            </Button>
          </PanelState>
          {extractError && (
            <FormAlert tone="warning" title={isServiceDown(extractError) ? 'Dịch vụ tạm gián đoạn' : undefined}>
              {getErrorMessage(extractError)}
            </FormAlert>
          )}
        </div>
      );
    }

    if (transcript.data?.transcript) {
      return <TranscriptContent transcript={transcript.data.transcript} isAuthor={isAuthor} />;
    }
    return null;
  };

  const statusChip =
    isAuthor && status === 'PENDING'
      ? { label: 'Đang xử lý', className: 'bg-warning-container text-warning' }
      : isAuthor && status === 'FAILED'
        ? { label: 'Thất bại', className: 'bg-error-container text-on-error-container' }
        : isAuthor && status === 'COMPLETED'
          ? { label: 'Bản nháp AI', className: 'bg-primary-fixed text-on-primary-fixed' }
          : null;

  return (
    <section
      aria-labelledby="transcript-panel-title"
      className="flex flex-col gap-space-md rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card"
    >
      <header className="flex flex-wrap items-center gap-space-sm">
        <h2 id="transcript-panel-title" className="mr-auto font-headline-sm text-headline-sm text-on-surface">
          Tóm tắt từ video
        </h2>
        {statusChip && (
          <span className={cn('rounded-full px-2.5 py-0.5 font-label-sm text-label-sm', statusChip.className)}>
            {statusChip.label}
          </span>
        )}
        {isGuest && (quota || quotaExhausted) && (
          <GuestQuotaBadge remaining={quotaExhausted ? 0 : quota!.remaining} limit={quota?.limit ?? 3} />
        )}
      </header>

      {renderBody()}

      <Modal show={alreadyDone !== null} onHide={closeAlreadyDone} size="sm" title="Video đã có bản phiên âm">
        <div className="flex flex-col gap-space-md">
          <p className="font-body-md text-body-md text-on-surface-variant">{alreadyDone}</p>
          <div className="flex justify-end">
            <Button onClick={closeAlreadyDone}>Xem bản phiên âm</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
};
