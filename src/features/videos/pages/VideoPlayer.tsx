import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePost } from '@/features/community/hooks/usePosts';
import { toApiError } from '@/lib/apiError';
import { formatDuration } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { TranscriptPanel } from '../components/TranscriptPanel';
import { VideoStage } from '../components/VideoStage';

const PAGE = 'mx-auto flex w-full max-w-[1200px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin';
const LINK_BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 font-label-md text-label-md no-underline transition-colors';

const NotFound: React.FC<{ description: string; icon?: string }> = ({ description, icon = 'search_off' }) => (
  <EmptyState
    icon={icon}
    title="Không tìm thấy video"
    description={description}
    action={
      <Link to={PATHS.COMMUNITY.ROOT} className={`${LINK_BUTTON} bg-primary-container text-on-primary hover:bg-primary`}>
        Về Cộng đồng
      </Link>
    }
  />
);

/**
 * SCR-21 videos/VideoPlayer + TranscriptPanel — /videos/:id?postId=…
 * Không có API trả URL video theo videoId, nên trang đọc videos[] của GET /posts/{postId} (đã thống nhất 13/10/2026).
 * Bản phiên âm & công thức: GET /videos/{id}/transcript (FN-POST-09); bóc tách lại: POST /videos/{id}/extract-recipe (FN-POST-10).
 */
const VideoPlayer: React.FC = () => {
  const { id } = useParams();
  const videoId = Number(id);
  const validVideoId = Number.isInteger(videoId) && videoId > 0;
  const [searchParams] = useSearchParams();
  const postIdParam = Number(searchParams.get('postId'));
  const postId = Number.isInteger(postIdParam) && postIdParam > 0 ? postIdParam : null;
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const post = usePost(postId ?? 0);

  if (!validVideoId) return <NotFound description="Đường dẫn video không hợp lệ." />;

  if (postId !== null && post.isPending) {
    return (
      <div className={PAGE} role="status" aria-busy="true" aria-label="Đang tải video">
        <Skeleton className="h-10 w-2/3" />
        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
          <Skeleton className="aspect-video lg:col-span-7" />
          <Skeleton className="h-[360px] lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (postId !== null && post.isError) {
    if (toApiError(post.error).status === 404) {
      return <NotFound description="Bài viết chứa video không tồn tại, đã bị xóa hoặc đang chờ kiểm duyệt." />;
    }
    return <ErrorState error={post.error} onRetry={() => post.refetch()} retrying={post.isRefetching} />;
  }

  const postData = postId !== null ? post.data : undefined;
  const video = postData?.videos.find((item) => item.videoId === videoId) ?? null;

  if (postData && !video) return <NotFound description="Video không thuộc bài viết này hoặc đã bị gỡ." />;
  if (video?.status === 'BANNED') {
    return <NotFound icon="block" description="Video đã bị gỡ do vi phạm tiêu chuẩn cộng đồng." />;
  }

  const isAuthor = !!postData && currentUserId !== null && postData.author.userId === currentUserId;
  const title = video?.title || `Video #${videoId}`;

  return (
    <div className={PAGE}>
      <nav
        aria-label="Đường dẫn"
        className="flex min-w-0 flex-wrap items-center gap-space-xs font-label-md text-label-md text-on-surface-variant"
      >
        <Link to={PATHS.HOME} className="flex items-center gap-1 text-on-surface-variant no-underline hover:text-primary">
          <Icon name="home" className="text-[16px]" />
          Trang chủ
        </Link>
        <span className="text-outline-variant">/</span>
        <Link to={PATHS.COMMUNITY.ROOT} className="text-on-surface-variant no-underline hover:text-primary">
          Cộng đồng
        </Link>
        {postData && (
          <>
            <span className="text-outline-variant">/</span>
            <Link
              to={PATHS.COMMUNITY.POST_DETAIL(postData.postId)}
              className="max-w-[240px] truncate text-on-surface-variant no-underline hover:text-primary"
            >
              {postData.title}
            </Link>
          </>
        )}
        <span className="text-outline-variant">/</span>
        <span className="text-primary" aria-current="page">
          Video
        </span>
      </nav>

      <header className="flex flex-col gap-space-xs">
        <div className="flex flex-wrap items-center gap-space-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-primary">
            <Icon name="play_circle" className="text-[14px]" />
            Video nấu ăn
          </span>
          {video?.durationSeconds !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
              <Icon name="schedule" className="text-[14px]" />
              {formatDuration(video.durationSeconds)}
            </span>
          )}
          {isAuthor && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-0.5 font-label-sm text-label-sm text-on-secondary-fixed-variant">
              <Icon name="person" className="text-[14px]" />
              Video của bạn
            </span>
          )}
        </div>
        <h1 className="font-headline-lg text-headline-lg-mobile leading-tight break-words text-on-surface sm:text-headline-lg">
          {title}
        </h1>
      </header>

      <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-space-md lg:col-span-7">
          <VideoStage key={videoId} video={video} />

          {postData ? (
            <div className="flex flex-col gap-space-md rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-card sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-space-sm">
                <Avatar name={postData.author.fullName} />
                <div className="min-w-0">
                  <p className="font-label-md text-label-md text-on-surface">{postData.author.fullName}</p>
                  <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
                    Trong bài viết: {postData.title}
                  </p>
                </div>
              </div>
              <Link
                to={PATHS.COMMUNITY.POST_DETAIL(postData.postId)}
                className={`${LINK_BUTTON} bg-surface-container text-on-surface hover:bg-surface-container-high`}
              >
                <Icon name="forum" className="text-[18px]" />
                Xem bài viết & bình luận
              </Link>
            </div>
          ) : (
            <p className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
              <Icon name="info" className="mt-0.5 text-[16px]" />
              Liên kết này thiếu thông tin bài viết nên chưa phát được video. Bạn vẫn xem được phần tóm tắt bên cạnh.
            </p>
          )}
        </div>

        <div className="min-w-0 lg:sticky lg:top-[88px] lg:col-span-5">
          <TranscriptPanel key={videoId} videoId={videoId} postId={postId} videoTitle={video?.title} isAuthor={isAuthor} />
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
