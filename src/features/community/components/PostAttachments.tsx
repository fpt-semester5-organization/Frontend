import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import { SyncedVideoScriptPlayer } from '@/features/videos/components/SyncedVideoScriptPlayer';
import { useVideoTranscript } from '@/features/videos/hooks/useVideoTranscript';
import { extractAndSaveVideoRecipe } from '@/features/videos/api/videos.api';
import { splitRawTranscriptToSegments } from '@/features/videos/lib/sampleTranscripts';
import type { TranscriptSegment } from '@/features/videos/types/transcript.types';
import type { ExtractedRecipe } from '@/features/videos/types/video.types';
import type { PostRecipeAttachment, PostVideoAttachment } from '../types/community.types';

/** Công thức đính kèm bài viết (FN-POST-06): khối "Liên kết công thức" dẫn tới SCR-12. */
export const LinkedRecipes: React.FC<{ recipes: PostRecipeAttachment[] }> = ({ recipes }) => {
  const linked = recipes.filter((recipe) => recipe.recipeId);
  if (linked.length === 0) return null;

  return (
    <div className="flex flex-col gap-space-sm">
      {linked.map((recipe) => (
        <div
          key={recipe.recipeId}
          className="flex flex-col items-start justify-between gap-space-md rounded-lg bg-surface-container-low p-space-md sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 items-center gap-space-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary">
              <Icon name="menu_book" className="text-[20px]" />
            </span>
            <div className="min-w-0">
              <span className="font-label-sm text-label-sm text-secondary">Liên kết công thức</span>
              <p className="truncate font-label-md text-label-md text-on-surface">
                {recipe.title ?? `Công thức #${recipe.recipeId}`}
              </p>
            </div>
          </div>
          <Link
            to={PATHS.RECIPES.DETAIL(recipe.recipeId!)}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1 rounded-lg bg-primary px-space-md py-2.5 font-label-md text-label-md text-on-primary no-underline transition-all hover:bg-primary-container sm:w-auto"
          >
            Xem chi tiết món
            <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </div>
      ))}
    </div>
  );
};

const InlineVideoScriptPlayer: React.FC<{
  video: PostVideoAttachment;
  onClose: () => void;
}> = ({ video, onClose }) => {
  const [duration, setDuration] = useState<number>(video.durationSeconds ?? 10);
  const videoId = video.videoId ?? 0;
  const { data: transcriptData, isLoading } = useVideoTranscript(videoId, {
    enabled: Boolean(videoId),
    poll: false,
  });
  const [aiLiveTranscript, setAiLiveTranscript] = useState<string | null>(null);
  const [aiLiveRecipe, setAiLiveRecipe] = useState<ExtractedRecipe | null>(null);
  const [aiLiveSummary, setAiLiveSummary] = useState<string | null>(null);

  // Kích hoạt AI STT 1 lần duy nhất và lưu ngay xuống Backend
  useEffect(() => {
    const hasDbData = Boolean(
      transcriptData?.transcript?.rawTranscript ||
      transcriptData?.transcript?.extractedRecipe ||
      transcriptData?.transcript?.aiSummary
    );
    if (video.videoUrl && !isLoading && !hasDbData && !aiLiveTranscript) {
      extractAndSaveVideoRecipe(videoId, video.videoUrl)
        .then((res) => {
          if (res.rawTranscript) setAiLiveTranscript(res.rawTranscript);
          if (res.recipe) setAiLiveRecipe(res.recipe);
          if (res.aiSummary) setAiLiveSummary(res.aiSummary);
        })
        .catch((err) => {
          console.warn('AI STT direct call error in InlinePlayer:', err);
        });
    }
  }, [video.videoUrl, isLoading, transcriptData, aiLiveTranscript, videoId]);

  const activeRecipe = transcriptData?.transcript?.extractedRecipe || aiLiveRecipe;
  const activeAiSummary = transcriptData?.transcript?.aiSummary || aiLiveSummary;

  const { segments, source } = useMemo(() => {
    if (transcriptData?.status === 'COMPLETED' && transcriptData.transcript?.segments?.length) {
      return {
        segments: transcriptData.transcript.segments.map((s, idx) => ({
          id: idx + 1,
          start: s.start,
          end: s.end,
          text: s.text,
        })),
        source: 'CSDL VeggieLife (Đã lưu)',
      };
    }
    if (transcriptData?.status === 'COMPLETED' && transcriptData.transcript?.rawTranscript) {
      return {
        segments: splitRawTranscriptToSegments(transcriptData.transcript.rawTranscript, duration),
        source: 'CSDL VeggieLife (Bản gốc)',
      };
    }
    if (aiLiveTranscript) {
      return {
        segments: splitRawTranscriptToSegments(aiLiveTranscript, duration),
        source: 'AI Faster-Whisper (Đã lưu CSDL)',
      };
    }
    return {
      segments: [] as TranscriptSegment[],
      source: isLoading ? 'Đang tải CSDL...' : 'Đang xử lý STT...',
    };
  }, [transcriptData, aiLiveTranscript, duration, isLoading]);

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-container shadow-md">
      <SyncedVideoScriptPlayer
        videoUrl={video.videoUrl}
        posterUrl={video.thumbnailUrl}
        title={video.title}
        segments={segments}
        recipe={activeRecipe}
        aiSummary={activeAiSummary}
        rawTranscript={transcriptData?.transcript?.rawTranscript || aiLiveTranscript}
        autoPlay={true}
        onClose={onClose}
        onDurationChange={setDuration}
        subtitleSource={source}
      />
    </div>
  );
};

/**
 * Video đính kèm trong bài viết: phát trực tiếp kèm tóm tắt kịch bản tại chỗ mà không cần chuyển trang.
 */
export const PostVideos: React.FC<{ videos: PostVideoAttachment[]; postId: number }> = ({ videos }) => {
  const list = videos.filter((video) => video.videoId);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);

  if (list.length === 0) return null;

  const currentActiveVideo = list.find((v) => v.videoId === activeVideoId);

  return (
    <div className="flex flex-col gap-space-md">
      {currentActiveVideo && currentActiveVideo.videoUrl && (
        <InlineVideoScriptPlayer
          video={currentActiveVideo}
          onClose={() => setActiveVideoId(null)}
        />
      )}

      <div className="flex flex-col gap-space-sm">
        {list.map((video) => {
          const isPlaying = activeVideoId === video.videoId;
          const processing = video.status !== undefined && video.status !== 'READY';
          return (
            <button
              key={video.videoId}
              type="button"
              disabled={processing}
              onClick={() => setActiveVideoId(isPlaying ? null : video.videoId!)}
              className={cn(
                'flex w-full items-center gap-space-md rounded-xl p-space-sm text-left transition-all cursor-pointer border',
                isPlaying
                  ? 'bg-primary-container/20 border-primary/40 shadow-xs'
                  : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
              )}
            >
              <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-inverse-surface">
                {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                <Icon
                  name={processing ? 'hourglass_top' : isPlaying ? 'pause_circle' : 'play_circle'}
                  className="absolute inset-0 m-auto flex h-fit w-fit text-[32px] text-white/90"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-label-md text-label-md font-semibold text-on-surface">
                  {video.title || `Video #${video.videoId}`}
                </p>
                {processing ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Video đang được xử lý, quay lại sau ít phút.
                  </p>
                ) : (
                  <p className="flex flex-wrap items-center gap-x-space-sm font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    {video.durationSeconds !== undefined && <span>{formatDuration(video.durationSeconds)}</span>}
                    <span className="text-primary font-medium">
                      {isPlaying ? 'Đang phát video kèm kịch bản' : 'Bấm để phát video & kịch bản'}
                    </span>
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
