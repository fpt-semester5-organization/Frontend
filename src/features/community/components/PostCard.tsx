import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime, formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import type { PostListItem } from '../types/community.types';
import { VoteButton } from './VoteButton';

interface PostCardProps {
  post: PostListItem;
  className?: string;
}

const ACTION =
  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-label-md text-label-md no-underline transition-colors hover:bg-surface-container';

/** Thẻ bài viết kiểu feed (SCR-25): chỉ hiển thị các trường GET /posts trả về. */
export const PostCard = React.forwardRef<HTMLElement, PostCardProps>(({ post, className }, ref) => {
  const to = PATHS.COMMUNITY.POST_DETAIL(post.postId);

  return (
    <article ref={ref} className={cn('flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-feed', className)}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar name={post.authorName} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-label-md text-label-md text-on-surface">{post.authorName}</p>
          {post.createdAt && (
            <time dateTime={post.createdAt} className="font-label-sm text-label-sm text-on-surface-variant">
              {formatDateTime(post.createdAt)}
            </time>
          )}
        </div>
      </header>

      {post.imageUrl ? (
        <>
          <h2 className="px-4 pb-3">
            <Link to={to} className="font-headline-md text-headline-md text-on-surface no-underline hover:text-primary">
              {post.title}
            </Link>
          </h2>
          <Link to={to} tabIndex={-1} aria-hidden="true" className="block aspect-[16/9] overflow-hidden bg-surface-container">
            <img src={post.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          </Link>
        </>
      ) : (
        <div className="mx-3 flex min-h-[160px] flex-col justify-center rounded-2xl bg-linear-to-br from-primary-fixed/70 via-surface-container-low to-secondary-fixed/60 p-6 sm:p-8">
          <h2>
            <Link
              to={to}
              className="font-headline-lg text-headline-lg-mobile text-on-surface no-underline hover:text-primary sm:text-headline-lg"
            >
              {post.title}
            </Link>
          </h2>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2.5 font-label-md text-label-md text-on-surface-variant">
        <span className="flex items-center gap-1.5 tabular-nums" aria-label={`${post.voteCount} lượt thích`}>
          <Icon name="favorite" filled className="text-[18px] text-secondary" />
          {formatNumber(post.voteCount)}
        </span>
        <Link to={to} className="text-on-surface-variant no-underline tabular-nums hover:underline">
          {formatNumber(post.commentCount)} bình luận
        </Link>
      </div>
      <div className="mx-3 mb-3 flex items-center gap-1 border-t border-outline-variant/40 pt-1.5">
        <VoteButton target={{ resource: 'posts', id: post.postId }} voteCount={post.voteCount} className="flex-1 justify-center bg-transparent" />
        <Link to={to} className={cn(ACTION, 'text-on-surface-variant')}>
          <Icon name="chat_bubble" className="text-[20px]" />
          Xem & bình luận
        </Link>
      </div>
    </article>
  );
});
PostCard.displayName = 'PostCard';

export const PostFeedSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => (
  <div className="flex flex-col gap-space-md" role="status" aria-busy="true" aria-label="Đang tải bài viết">
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} className="h-72 rounded-2xl" />
    ))}
  </div>
);
