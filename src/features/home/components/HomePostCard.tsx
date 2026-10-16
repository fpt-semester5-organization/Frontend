import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import type { PostListItem } from '@/features/community/types/community.types';
import { formatDateTime, formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';

/** Thẻ bài viết gọn cho khối "Từ cộng đồng" của trang chủ (dữ liệu GET /posts). */
export const HomePostCard: React.FC<{ post: PostListItem }> = ({ post }) => (
  <article className="relative flex gap-3 rounded-2xl bg-surface-container-lowest p-3 shadow-card transition-shadow hover:shadow-feed">
    {post.imageUrl ? (
      <img
        src={post.imageUrl}
        alt=""
        width={88}
        height={88}
        loading="lazy"
        decoding="async"
        className="h-[88px] w-[88px] shrink-0 rounded-xl object-cover"
      />
    ) : (
      <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary-fixed/70 to-secondary-fixed/60">
        <Avatar name={post.authorName} className="h-11 w-11" />
      </div>
    )}
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <h3 className="line-clamp-2 font-label-lg text-label-lg tracking-normal text-on-surface">
        <Link
          to={PATHS.COMMUNITY.POST_DETAIL(post.postId)}
          className="text-inherit no-underline after:absolute after:inset-0 after:rounded-2xl hover:text-primary"
        >
          {post.title}
        </Link>
      </h3>
      <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
        {post.authorName}
        {post.createdAt && (
          <>
            {' · '}
            <time dateTime={post.createdAt}>{formatDateTime(post.createdAt)}</time>
          </>
        )}
      </p>
      <p className="mt-auto flex items-center gap-3 font-label-sm text-label-sm text-on-surface-variant">
        <span className="flex items-center gap-1 tabular-nums" aria-label={`${post.voteCount} lượt thích`}>
          <Icon name="favorite" filled className="text-[16px] text-secondary" />
          {formatNumber(post.voteCount)}
        </span>
        <span className="flex items-center gap-1 tabular-nums" aria-label={`${post.commentCount} bình luận`}>
          <Icon name="chat_bubble" className="text-[16px]" />
          {formatNumber(post.commentCount)}
        </span>
      </p>
    </div>
  </article>
);

export const HomePostSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="flex gap-3 rounded-2xl bg-surface-container-lowest p-3 shadow-card" aria-hidden="true">
        <Skeleton className="h-[88px] w-[88px] shrink-0" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-auto h-3 w-1/3" />
        </div>
      </div>
    ))}
  </>
);
