import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime, formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import { SyncedVideoScriptPlayer } from '@/features/videos/components/SyncedVideoScriptPlayer';
import { useVideoTranscript } from '@/features/videos/hooks/useVideoTranscript';
import { extractVideoDirectlyWithAi } from '@/features/videos/api/videos.api';
import type { TranscriptSegment } from '@/features/videos/types/transcript.types';
import { splitRawTranscriptToSegments } from '@/features/videos/lib/sampleTranscripts';
import type { CommunityFeedItem, PostListItem } from '../types/community.types';
import { VoteButton } from './VoteButton';

interface PostCardProps {
  item?: CommunityFeedItem;
  post?: PostListItem;
  className?: string;
  defaultShowScriptVideo?: boolean;
}

const ACTION =
  'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-label-md text-label-md no-underline transition-colors hover:bg-surface-container';

/**
 * Thẻ bài viết cộng đồng (SCR-25): hỗ trợ cả 2 loại nội dung:
 * 1. Bài viết (Blog)
 * 2. Công thức món chay (Recipe)
 */
export const PostCard = React.forwardRef<HTMLElement, PostCardProps>(
  ({ item, post, className, defaultShowScriptVideo = false }, ref) => {
    // Chuẩn hóa dữ liệu: ưu tiên `item`, fallback sang `post`
    const isRecipe = item?.kind === 'RECIPE';
    const id = item ? item.id : post?.postId ?? 0;
    const title = item ? item.title : post?.title ?? '';
    const authorName = item?.authorName ?? post?.authorName ?? (isRecipe ? 'Bếp Chay VeggieLife' : 'Thành viên');
    const authorAvatarUrl = item?.authorAvatarUrl ?? post?.authorAvatarUrl ?? (isRecipe ? '/logo.png' : null);
    const imageUrl = item?.imageUrl ?? post?.imageUrl;
    const createdAt = item?.createdAt ?? post?.createdAt;
    const [imgError, setImgError] = React.useState(false);
    const [showSyncedVideo, setShowSyncedVideo] = useState(defaultShowScriptVideo);
    const voteCount = item?.voteCount ?? post?.voteCount ?? 0;
    const commentCount = item?.commentCount ?? post?.commentCount ?? 0;

    const [cardVoteCount, setCardVoteCount] = useState(voteCount);
    useEffect(() => {
      setCardVoteCount(voteCount);
    }, [voteCount]);

    const to = isRecipe ? PATHS.RECIPES.DETAIL(id) : PATHS.COMMUNITY.POST_DETAIL(id);
    const targetResource = isRecipe ? ('recipes' as const) : ('posts' as const);

    // Thông tin thêm cho công thức
    const chips = isRecipe && item
      ? [
          item.cookTimeMinutes != null && `${item.cookTimeMinutes} phút`,
          item.caloriesKcal != null && `${Math.round(item.caloriesKcal)} kcal`,
          item.dietarySchool,
        ].filter(Boolean) as string[]
      : [];

    const resolvedVideoId =
      item?.videoId ??
      (post as { videoId?: number } | undefined)?.videoId;

    const resolvedVideoUrl =
      item?.videoUrl ??
      (post as { videoUrl?: string } | undefined)?.videoUrl ??
      (imageUrl?.includes('/video/upload/') ? imageUrl.replace(/\.jpg$/i, '.mp4') : undefined);

    const hasVideoProp =
      item?.hasVideo ??
      (item?.type === 'VIDEO') ??
      (post as { hasVideo?: boolean; type?: string } | undefined)?.hasVideo ??
      ((post as { type?: string } | undefined)?.type === 'VIDEO') ??
      Boolean(resolvedVideoId) ??
      false;

    // Chỉ bài viết/công thức nào THỰC SỰ có video URL mới hiển thị nút xem video & kịch bản
    const isVideo = Boolean(hasVideoProp && (resolvedVideoUrl || resolvedVideoId));
    const activeVideoUrl = resolvedVideoUrl || (imageUrl?.includes('/video/upload/') ? imageUrl.replace(/\.jpg$/i, '.mp4') : '');

    const [videoDuration, setVideoDuration] = useState<number>(
      (item as { durationSeconds?: number } | undefined)?.durationSeconds ?? 10
    );

    const { data: transcriptData, isLoading: isTranscriptLoading } = useVideoTranscript(resolvedVideoId ?? 0, {
      enabled: isVideo && showSyncedVideo && Boolean(resolvedVideoId),
      poll: false,
    });

    const [aiLiveTranscript, setAiLiveTranscript] = useState<string | null>(null);

    // Kích hoạt gọi AI STT Microservice trực tiếp (/api/v1/ai-stt/stt/video-to-recipe)
    // khi xem video mà CSDL chưa có hoặc đang chờ
    useEffect(() => {
      if (
        isVideo &&
        showSyncedVideo &&
        activeVideoUrl &&
        !isTranscriptLoading &&
        !transcriptData?.transcript?.rawTranscript &&
        !aiLiveTranscript
      ) {
        extractVideoDirectlyWithAi(activeVideoUrl)
          .then((res) => {
            if (res.rawTranscript) {
              setAiLiveTranscript(res.rawTranscript);
            }
          })
          .catch((err) => {
            console.warn('AI STT direct call error:', err);
          });
      }
    }, [isVideo, showSyncedVideo, activeVideoUrl, isTranscriptLoading, transcriptData, aiLiveTranscript]);

    const { activeSegments, transcriptSource } = React.useMemo(() => {
      // 1. Phân đoạn thời gian từ Database (/api/v1/videos/{id}/transcript)
      if (transcriptData?.status === 'COMPLETED' && transcriptData.transcript?.segments?.length) {
        return {
          activeSegments: transcriptData.transcript.segments.map((s, idx) => ({
            id: idx + 1,
            start: s.start,
            end: s.end,
            text: s.text,
          })),
          transcriptSource: 'CSDL VeggieLife (Đồng bộ)',
        };
      }
      // 2. Nội dung phiên âm thô từ Database (/api/v1/videos/{id}/transcript)
      if (transcriptData?.status === 'COMPLETED' && transcriptData.transcript?.rawTranscript) {
        const parsed = splitRawTranscriptToSegments(transcriptData.transcript.rawTranscript, videoDuration);
        if (parsed.length > 0) {
          return {
            activeSegments: parsed,
            transcriptSource: 'CSDL VeggieLife (Bản gốc)',
          };
        }
      }
      // 3. Kết quả bóc tách trực tiếp từ AI STT Microservice (/api/v1/ai-stt/stt/video-to-recipe)
      if (aiLiveTranscript) {
        const parsed = splitRawTranscriptToSegments(aiLiveTranscript, videoDuration);
        if (parsed.length > 0) {
          return {
            activeSegments: parsed,
            transcriptSource: 'AI Faster-Whisper Live',
          };
        }
      }
      // Tuyệt đối không dùng mock data! Trả về rỗng để hiển thị trạng thái tải
      return {
        activeSegments: [] as TranscriptSegment[],
        transcriptSource: isTranscriptLoading ? 'Đang tải CSDL...' : 'Đang xử lý STT...',
      };
    }, [transcriptData, aiLiveTranscript, videoDuration, isTranscriptLoading]);

    return (
      <article
        ref={ref}
        className={cn(
          'flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card border border-surface-container/60 transition-all hover:shadow-card-hover',
          className
        )}
      >
        <header className="flex items-center gap-3 px-4 pt-4 pb-2">
          <Avatar name={authorName} src={authorAvatarUrl} className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-label-md text-label-md font-semibold text-on-surface">
                {authorName}
              </p>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold',
                  isVideo
                    ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                    : isRecipe
                      ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                      : 'bg-surface-container text-on-surface-variant'
                )}
              >
                {isVideo ? 'Video' : isRecipe ? 'Công thức' : 'Bài viết'}
              </span>
            </div>
            {createdAt && (
              <time
                dateTime={createdAt}
                className="font-label-sm text-label-sm text-on-surface-variant"
              >
                {formatDateTime(createdAt)}
              </time>
            )}
          </div>
        </header>

        {(imageUrl && !imgError) || isVideo ? (
          <>
            <h2 className="px-4 pb-2.5">
              <Link
                to={to}
                className="font-headline-md text-headline-md text-on-surface no-underline hover:text-primary transition-colors line-clamp-2"
              >
                {title}
              </Link>
            </h2>

            {isVideo && showSyncedVideo ? (
              <div className="relative w-full overflow-hidden border-y border-surface-container/60">
                <SyncedVideoScriptPlayer
                  videoUrl={activeVideoUrl}
                  posterUrl={imageUrl || undefined}
                  title={title}
                  segments={activeSegments}
                  autoPlay={true}
                  onClose={() => setShowSyncedVideo(false)}
                  onDurationChange={setVideoDuration}
                  subtitleSource={transcriptSource}
                />
              </div>
            ) : (
              <div className="relative block aspect-[16/9] w-full overflow-hidden bg-surface-container-low group">
                <Link
                  to={to}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="block h-full w-full"
                >
                  {imageUrl && !imgError ? (
                    <img
                      src={imageUrl}
                      alt={title}
                      loading="lazy"
                      onError={() => setImgError(true)}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-fixed/40 via-surface-container-low to-secondary-fixed/30">
                      <Icon name="movie" className="text-[56px] text-primary/40" />
                    </div>
                  )}
                </Link>

                {/* Chỉ bài viết/công thức CÓ VIDEO mới hiển thị các nút này, chuẩn màu thương hiệu VeggieLife */}
                {isVideo && (
                  <>
                    {/* Nút bấm to ở giữa màu XANH VeggieLife */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowSyncedVideo(true);
                      }}
                      aria-label="Phát video và xem tóm tắt"
                      className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-on-primary shadow-xl backdrop-blur-xs transition-all hover:scale-110 hover:bg-primary active:scale-95 cursor-pointer z-10"
                    >
                      <Icon name="play_arrow" className="text-[32px] ml-0.5" />
                    </button>

                    {/* Badge góc trên bên phải: Tóm tắt video */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowSyncedVideo(true);
                      }}
                      className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1 font-label-sm text-label-sm font-semibold text-on-primary shadow-md backdrop-blur-sm hover:bg-primary transition-all active:scale-95 cursor-pointer"
                      title="Xem tóm tắt video chạy theo thời gian thực"
                    >
                      <Icon name="auto_awesome" className="text-[16px]" />
                      <span>Tóm tắt video</span>
                    </button>
                  </>
                )}

                {/* Chips công thức đè góc ảnh */}
                {isRecipe && (chips.length > 0 || item?.isVerified) && (
                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
                    {chips.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-surface-container-lowest/90 px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-surface backdrop-blur-sm shadow-xs"
                      >
                        {c}
                      </span>
                    ))}
                    {item?.isVerified && (
                      <span className="rounded-full bg-primary-container px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-primary backdrop-blur-sm">
                        Đã xác minh
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mx-4 my-2 relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-fixed/50 via-surface-container to-secondary-fixed/40 p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-3 -bottom-3 text-primary-fixed-dim/40 opacity-40">
              <Icon name={isRecipe ? 'restaurant_menu' : 'spa'} className="text-[110px]" />
            </div>
            <h2 className="relative z-10 mb-2">
              <Link
                to={to}
                className="font-headline-md text-headline-md text-on-surface no-underline hover:text-primary transition-colors leading-snug"
              >
                {title}
              </Link>
            </h2>
            {isRecipe && chips.length > 0 && (
              <div className="relative z-10 flex flex-wrap gap-1.5 mt-2">
                {chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-surface-container-lowest/80 px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-surface"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 font-label-md text-label-md text-on-surface-variant">
          <span
            className="flex items-center gap-1.5 tabular-nums"
            aria-label={`${cardVoteCount} lượt thích`}
          >
            <Icon name="favorite" filled className="text-[18px] text-secondary" />
            {formatNumber(cardVoteCount)}
          </span>
          <Link
            to={to}
            className="text-on-surface-variant no-underline tabular-nums hover:underline hover:text-primary"
          >
            {isRecipe ? 'Xem công thức' : `${formatNumber(commentCount)} bình luận`}
          </Link>
        </div>

        <div className="mx-3 mb-3 flex items-center gap-1 border-t border-surface-container pt-1.5">
          <VoteButton
            target={{ resource: targetResource, id }}
            voteCount={cardVoteCount}
            onVoteChange={(count) => setCardVoteCount(count)}
            className="flex-1 justify-center bg-transparent"
          />
          <Link to={to} className={cn(ACTION, 'text-on-surface-variant')}>
            <Icon name={isRecipe ? 'menu_book' : 'chat_bubble'} className="text-[18px]" />
            <span>{isRecipe ? 'Xem chi tiết' : 'Bình luận'}</span>
          </Link>
        </div>
      </article>
    );
  }
);
PostCard.displayName = 'PostCard';

export const PostFeedSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => (
  <div
    className="flex flex-col gap-space-md"
    role="status"
    aria-busy="true"
    aria-label="Đang tải dữ liệu"
  >
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} className="h-64 rounded-2xl" />
    ))}
  </div>
);
