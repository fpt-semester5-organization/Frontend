import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { formatDateTime, formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import type { PostListItem } from '../types/community.types';

interface MyPostRowProps {
  post: PostListItem;
  onDelete: (post: PostListItem) => void;
}

/** Một dòng trong "Bài viết của tôi" (SCR-28): ảnh nhỏ, tiêu đề, số liệu và nút Sửa/Xóa. */
export const MyPostRow: React.FC<MyPostRowProps> = ({ post, onDelete }) => (
  <article className="rounded-xl bg-surface-container-lowest p-space-md shadow-card transition-shadow hover:shadow-card-hover sm:p-space-lg">
    <div className="flex flex-col gap-space-md sm:flex-row sm:items-center sm:justify-between sm:gap-space-lg">
      <div className="flex min-w-0 flex-1 items-start gap-space-md">
        <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-primary-fixed/70 to-secondary-fixed/60 sm:h-[100px] sm:w-[100px]">
          {post.imageUrl ? (
            <img src={post.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <Icon name="article" className="text-[32px] text-primary/60" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="truncate">
            <Link
              to={PATHS.COMMUNITY.POST_DETAIL(post.postId)}
              className="font-headline-sm text-headline-sm text-tertiary no-underline hover:text-primary"
            >
              {post.title}
            </Link>
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body-sm text-body-sm text-outline">
            <span className="flex items-center gap-1 font-medium text-secondary">
              <Icon name="favorite" className="text-[16px]" />
              {formatNumber(post.voteCount)} thích
            </span>
            <span className="flex items-center gap-1 text-on-surface-variant">
              <Icon name="chat_bubble_outline" className="text-[16px]" />
              {formatNumber(post.commentCount)} bình luận
            </span>
            {post.createdAt && (
              <span className="flex items-center gap-1">
                <Icon name="calendar_today" className="text-[16px]" />
                <time dateTime={post.createdAt}>{formatDateTime(post.createdAt)}</time>
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        <Link
          to={PATHS.COMMUNITY.EDIT_POST(post.postId)}
          aria-label={`Sửa bài "${post.title}"`}
          className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-2 font-label-md text-label-md text-on-surface no-underline hover:bg-surface-container-high"
        >
          <Icon name="edit" className="text-[18px]" />
          Sửa
        </Link>
        <button
          type="button"
          onClick={() => onDelete(post)}
          aria-label={`Xóa bài "${post.title}"`}
          className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-2 font-label-md text-label-md text-error hover:bg-error-container"
        >
          <Icon name="delete" className="text-[18px]" />
          Xóa
        </button>
      </div>
    </div>
  </article>
);
