import React from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Loader2 } from 'lucide-react';
import { PATHS } from '@/routes/paths';
import type { PostRecipeAttachment, PostVideoAttachment } from '../types/community.types';

interface PostAttachmentsProps {
  videos: PostVideoAttachment[];
  recipes: PostRecipeAttachment[];
}

/** Video và công thức đính kèm bài viết (FN-POST-06). */
export const PostAttachments: React.FC<PostAttachmentsProps> = ({ videos, recipes }) => {
  if (videos.length === 0 && recipes.length === 0) return null;

  return (
    <div className="space-y-4">
      {videos.map((video, index) =>
        video.status === 'READY' && video.videoUrl ? (
          <video
            key={video.videoId ?? index}
            src={video.videoUrl}
            poster={video.thumbnailUrl}
            controls
            preload="metadata"
            className="w-full rounded-lg bg-black"
            aria-label={video.title ?? 'Video đính kèm'}
          />
        ) : (
          <div
            key={video.videoId ?? index}
            className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600 ring-1 ring-gray-200"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Video đang được xử lý, vui lòng quay lại sau ít phút.
          </div>
        )
      )}
      {recipes.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Công thức đính kèm</h2>
          <ul className="space-y-2 p-0">
            {recipes.map((recipe, index) => (
              <li key={recipe.recipeId ?? index} className="list-none">
                {recipe.recipeId ? (
                  <Link
                    to={PATHS.RECIPES.DETAIL(recipe.recipeId)}
                    className="flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800 no-underline ring-1 ring-brand-100 hover:bg-brand-100"
                  >
                    <ChefHat className="h-4 w-4" aria-hidden="true" />
                    {recipe.title ?? `Công thức #${recipe.recipeId}`}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
