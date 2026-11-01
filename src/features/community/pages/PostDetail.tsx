import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRequireMember } from '@/hooks/useRequireMember';
import { toApiError } from '@/lib/apiError';
import { formatNumber } from '@/lib/format';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { SyncedVideoScriptPlayer } from '@/features/videos/components/SyncedVideoScriptPlayer';
import { useVideoTranscript } from '@/features/videos/hooks/useVideoTranscript';
import { extractAndSaveVideoRecipe } from '@/features/videos/api/videos.api';
import { splitRawTranscriptToSegments } from '@/features/videos/lib/sampleTranscripts';
import type { TranscriptSegment } from '@/features/videos/types/transcript.types';
import type { ExtractedRecipe } from '@/features/videos/types/video.types';
import type { PostVideoAttachment } from '../types/community.types';
import { CommentSection } from '../components/CommentSection';
import { LinkedRecipes } from '../components/PostAttachments';
import { RelatedPosts } from '../components/RelatedPosts';
import { ReportDialog } from '../components/ReportDialog';
import { VoteButton } from '../components/VoteButton';
import { useDeletePost } from '../hooks/usePostMutations';
import { usePost } from '../hooks/usePosts';

const PAGE = 'mx-auto flex w-full max-w-[900px] flex-col gap-space-xl px-margin-mobile py-space-lg sm:px-margin';
const ICON_BUTTON =
  'flex rounded-lg p-2 text-on-surface-variant no-underline transition-colors hover:bg-surface-container-low';

const NotFound: React.FC = () => (
  <EmptyState
    icon="search_off"
    title="Không tìm thấy bài viết"
    description="Bài viết không tồn tại, đã bị xóa hoặc đang chờ kiểm duyệt."
    action={
      <Link
        to={PATHS.COMMUNITY.ROOT}
        className="inline-flex rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary"
      >
        Về Cộng đồng
      </Link>
    }
  />
);

interface PostDetailMediaProps {
  title: string;
  imageUrl?: string | null;
  video?: PostVideoAttachment | null;
}

/**
 * Hiển thị media chính của bài viết chi tiết:
 * - Nếu bài viết có video: hiển thị SyncedVideoScriptPlayer kèm công thức tóm tắt tự động tải từ CSDL hoặc bóc tách 1 lần và lưu Backend.
 * - Nếu là bài viết ảnh thông thường: hiển thị ảnh minh họa.
 */
const PostDetailMedia: React.FC<PostDetailMediaProps> = ({ title, imageUrl, video }) => {
  const [duration, setDuration] = useState<number>(video?.durationSeconds ?? 10);
  const videoId = video?.videoId ?? 0;
  const videoUrl = video?.videoUrl;

  const { data: transcriptData, isLoading: isTranscriptLoading } = useVideoTranscript(videoId, {
    enabled: Boolean(videoId),
    poll: false,
  });

  const [aiLiveTranscript, setAiLiveTranscript] = useState<string | null>(null);
  const [aiLiveRecipe, setAiLiveRecipe] = useState<ExtractedRecipe | null>(null);

  // Chỉ gọi AI STT đúng 1 lần nếu CSDL Backend chưa có, sau đó tự động LƯU XUỐNG BACKEND luôn
  useEffect(() => {
    if (videoUrl && !isTranscriptLoading && !transcriptData?.transcript?.rawTranscript && !aiLiveTranscript) {
      extractAndSaveVideoRecipe(videoId, videoUrl)
        .then((res) => {
          if (res.rawTranscript) setAiLiveTranscript(res.rawTranscript);
          if (res.recipe) setAiLiveRecipe(res.recipe);
        })
        .catch((err) => {
          console.warn('AI STT direct call error in PostDetail:', err);
        });
    }
  }, [videoUrl, isTranscriptLoading, transcriptData, aiLiveTranscript, videoId]);

  const activeRecipe = transcriptData?.transcript?.extractedRecipe || aiLiveRecipe;

  const { activeSegments, transcriptSource } = useMemo(() => {
    if (transcriptData?.status === 'COMPLETED' && transcriptData.transcript?.segments?.length) {
      return {
        activeSegments: transcriptData.transcript.segments.map((s, idx) => ({
          id: idx + 1,
          start: s.start,
          end: s.end,
          text: s.text,
        })),
        transcriptSource: 'CSDL VeggieLife (Đã lưu)',
      };
    }
    if (transcriptData?.status === 'COMPLETED' && transcriptData.transcript?.rawTranscript) {
      const parsed = splitRawTranscriptToSegments(transcriptData.transcript.rawTranscript, duration);
      if (parsed.length > 0) {
        return {
          activeSegments: parsed,
          transcriptSource: 'CSDL VeggieLife (Bản gốc)',
        };
      }
    }
    if (aiLiveTranscript) {
      const parsed = splitRawTranscriptToSegments(aiLiveTranscript, duration);
      if (parsed.length > 0) {
        return {
          activeSegments: parsed,
          transcriptSource: 'AI Faster-Whisper (Đã lưu CSDL)',
        };
      }
    }
    return {
      activeSegments: [] as TranscriptSegment[],
      transcriptSource: isTranscriptLoading ? 'Đang tải CSDL...' : 'Đang xử lý STT...',
    };
  }, [transcriptData, aiLiveTranscript, duration, isTranscriptLoading]);

  // Nếu bài viết có video thì hiển thị SyncedVideoScriptPlayer ngay vị trí chính (thay thế ảnh tĩnh đứng yên)
  if (video && video.videoUrl) {
    return (
      <div className="mb-space-lg overflow-hidden rounded-2xl border border-surface-container shadow-md">
        <SyncedVideoScriptPlayer
          videoUrl={video.videoUrl}
          posterUrl={video.thumbnailUrl || imageUrl}
          title={title}
          segments={activeSegments}
          recipe={activeRecipe}
          rawTranscript={transcriptData?.transcript?.rawTranscript || aiLiveTranscript}
          autoPlay={true}
          onDurationChange={setDuration}
          subtitleSource={transcriptSource}
        />
      </div>
    );
  }

  // Nếu bài viết chỉ có ảnh tĩnh thông thường (không có video)
  if (imageUrl) {
    return (
      <figure className="mb-space-lg overflow-hidden rounded-2xl border border-surface-container">
        <div className="aspect-[16/9] w-full overflow-hidden bg-surface-container">
          <img src={imageUrl} alt={`Ảnh minh họa: ${title}`} className="h-full w-full object-cover" />
        </div>
      </figure>
    );
  }

  return null;
};

/** SCR-26 community/PostDetail — bình luận nhiều tầng, thả tim, báo cáo (FN-POST-06, FN-COMM-01..05). */
const PostDetail: React.FC = () => {
  const { id } = useParams();
  const postId = Number(id);
  const validId = Number.isInteger(postId) && postId > 0;
  const navigate = useNavigate();
  const { requireMember } = useRequireMember();
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const post = usePost(postId);
  const target = useMemo(() => ({ resource: 'posts' as const, id: postId }), [postId]);
  const deletePost = useDeletePost();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (!validId) return <NotFound />;

  if (post.isPending) {
    return (
      <div className={PAGE} role="status" aria-busy="true" aria-label="Đang tải bài viết">
        <Skeleton className="h-[480px]" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (post.isError) {
    if (toApiError(post.error).status === 404) return <NotFound />;
    return <ErrorState error={post.error} onRetry={() => post.refetch()} retrying={post.isRefetching} />;
  }

  const data = post.data;
  const isOwner = currentUserId !== null && data.author.userId === currentUserId;

  const primaryVideo: PostVideoAttachment | null =
    data.videos?.find((v) => v.videoId && v.status === 'READY') ??
    data.videos?.find((v) => v.videoId) ??
    (data.videos?.[0] ?? null) ??
    ((data as { videoUrl?: string }).videoUrl
      ? {
          videoId: (data as { videoId?: number }).videoId,
          videoUrl: (data as { videoUrl?: string }).videoUrl!,
          thumbnailUrl: data.imageUrl ?? undefined,
          durationSeconds: 10,
          title: data.title,
        }
      : null);


  const handleDelete = () =>
    deletePost.mutate(postId, {
      onSuccess: (res) => {
        notifySuccess(res.message);
        navigate(PATHS.ME.CONTENT(), { replace: true });
      },
      onError: (error) => {
        setConfirmDelete(false);
        notifyApiError(error);
      },
    });

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(PATHS.COMMUNITY.ROOT);
    }
  };

  return (
    <div className={PAGE}>
      {/* Thanh điều hướng quay lại & Breadcrumb */}
      <nav aria-label="Điều hướng bài viết" className="flex flex-wrap items-center justify-between gap-space-sm pb-1">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 font-label-md text-label-md text-on-surface transition-all hover:bg-surface-container hover:text-primary active:scale-95 cursor-pointer"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          <span>Quay lại</span>
        </button>

        <div className="flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap font-label-sm text-label-sm text-on-surface-variant">
          <Link to={PATHS.HOME} className="shrink-0 hover:text-primary transition-colors">
            Trang chủ
          </Link>
          <Icon name="chevron_right" className="text-[14px] text-outline" />
          <Link to={PATHS.COMMUNITY.ROOT} className="shrink-0 hover:text-primary transition-colors">
            Cộng đồng
          </Link>
          <Icon name="chevron_right" className="text-[14px] text-outline" />
          <span aria-current="page" className="min-w-0 truncate font-semibold text-on-surface sm:max-w-[320px]">
            {data.title}
          </span>
        </div>
      </nav>

      <article className="rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card md:p-space-xl">
        <header className="flex flex-wrap items-center justify-between gap-space-md pb-space-lg">
          <div className="flex items-center gap-space-sm">
            <Avatar name={data.author.fullName} src={data.author.avatarUrl} size="lg" />
            <span className="font-headline-sm text-headline-sm text-on-surface">{data.author.fullName}</span>
          </div>
          <div className="ml-auto flex items-center gap-space-xs">
            {isOwner ? (
              <>
                <Link to={PATHS.COMMUNITY.EDIT_POST(postId)} title="Sửa bài" aria-label="Sửa bài" className={`${ICON_BUTTON} hover:text-primary`}>
                  <Icon name="edit" className="text-[20px]" />
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  title="Xóa bài"
                  aria-label="Xóa bài"
                  className={`${ICON_BUTTON} hover:text-error`}
                >
                  <Icon name="delete" className="text-[20px]" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => requireMember(() => setReportOpen(true))}
                title="Báo cáo vi phạm"
                aria-label="Báo cáo vi phạm"
                className={`${ICON_BUTTON} hover:text-secondary`}
              >
                <Icon name="flag" className="text-[20px]" />
              </button>
            )}
          </div>
        </header>

        <h1 className="mb-space-md font-headline-lg text-headline-lg-mobile leading-tight break-words text-on-surface sm:text-headline-lg">
          {data.title}
        </h1>

        {data.content && (
          <div className="mb-space-md font-body-md text-body-md leading-relaxed break-words whitespace-pre-line text-on-surface">
            {data.content}
          </div>
        )}

        <div className="mb-space-lg empty:hidden">
          <LinkedRecipes recipes={data.recipes} />
        </div>

        <PostDetailMedia
          title={data.title}
          imageUrl={data.imageUrl}
          video={primaryVideo}
        />

        <footer className="flex flex-wrap items-center gap-space-sm pt-space-md">
          <VoteButton target={target} voteCount={data.voteCount} canVote={data.memberActions.canVote} />
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('comments');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                const textarea = el.querySelector('textarea');
                textarea?.focus();
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-space-md py-2 font-label-md text-label-md text-on-surface no-underline transition-all hover:bg-surface-container cursor-pointer"
          >
            <Icon name="chat_bubble_outline" className="text-[20px] text-on-surface-variant" />
            <span>{formatNumber(data.commentCount)} bình luận</span>
          </button>
        </footer>
      </article>

      <CommentSection
        target={target}
        authorId={data.author.userId}
        commentCount={data.commentCount}
        canComment={data.memberActions.canComment}
      />

      <RelatedPosts currentPostId={postId} />

      <ConfirmDialog
        show={confirmDelete}
        title="Xóa bài viết?"
        message="Bài viết sẽ bị xóa khỏi cộng đồng cùng với bình luận và lượt thả tim. Bạn không thể hoàn tác thao tác này."
        confirmLabel="Xóa bài viết"
        danger
        loading={deletePost.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ReportDialog
        show={reportOpen}
        content={target}
        target={{ type: 'POST', id: postId }}
        onClose={() => setReportOpen(false)}
        onReported={() => navigate(PATHS.COMMUNITY.ROOT, { replace: true })}
      />
    </div>
  );
};

export default PostDetail;
