import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { PATHS } from '@/routes/paths';
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

/** Video đính kèm (FN-POST-06): mỗi video dẫn tới trang xem video và bản phiên âm (SCR-21). */
export const PostVideos: React.FC<{ videos: PostVideoAttachment[] }> = ({ videos }) => {
  const list = videos.filter((video) => video.videoId);
  if (list.length === 0) return null;

  return (
    <div className="flex flex-col gap-space-sm">
      {list.map((video) => {
        const processing = video.status !== undefined && video.status !== 'READY';
        const body = (
          <>
            <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-inverse-surface">
              {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
              <Icon
                name={processing ? 'hourglass_top' : 'play_circle'}
                className="absolute inset-0 m-auto flex h-fit w-fit text-[32px] text-white/90"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-label-md text-label-md text-on-surface">
                {video.title || `Video #${video.videoId}`}
              </p>
              {processing && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">Video đang được xử lý, quay lại sau ít phút.</p>
              )}
            </div>
          </>
        );
        return processing ? (
          <div key={video.videoId} className="flex items-center gap-space-md rounded-lg bg-surface-container-low p-space-sm">
            {body}
          </div>
        ) : (
          <Link
            key={video.videoId}
            to={PATHS.VIDEOS.DETAIL(video.videoId!)}
            className="flex items-center gap-space-md rounded-lg bg-surface-container-low p-space-sm no-underline hover:bg-surface-container"
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
};
