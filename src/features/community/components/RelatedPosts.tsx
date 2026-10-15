import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime, formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { usePostList } from '../hooks/usePosts';
import type { PostListItem } from '../types/community.types';

interface RelatedPostsProps {
  currentPostId: number;
  className?: string;
}

const RelatedCard: React.FC<{ post: PostListItem }> = ({ post }) => {
  const to = PATHS.COMMUNITY.POST_DETAIL(post.postId);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-surface-container bg-surface-container-low transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-surface-container-lowest hover:shadow-card-hover">
      <Link to={to} tabIndex={-1} aria-hidden="true" className="relative aspect-[16/10] w-full overflow-hidden bg-surface-container">
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-fixed/60 via-surface-container to-secondary-fixed/50 p-4 text-center">
            <Icon name="article" className="text-[32px] text-primary/70" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-space-md">
        <h3 className="mb-2 line-clamp-2 font-headline-sm text-label-lg font-bold text-on-surface transition-colors group-hover:text-primary">
          <Link to={to} className="no-underline text-inherit">
            {post.title}
          </Link>
        </h3>

        <div className="mt-auto flex items-center justify-between pt-space-xs text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <Avatar name={post.authorName} className="h-6 w-6 text-[10px]" />
            <span className="truncate max-w-[100px] font-label-sm text-label-sm">{post.authorName}</span>
          </div>

          <div className="flex items-center gap-3 font-label-sm text-label-sm tabular-nums">
            <span className="flex items-center gap-1">
              <Icon name="favorite" filled className="text-[14px] text-secondary" />
              {formatNumber(post.voteCount)}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="chat_bubble_outline" className="text-[14px]" />
              {formatNumber(post.commentCount)}
            </span>
          </div>
        </div>

        {post.createdAt && (
          <time dateTime={post.createdAt} className="mt-1 font-label-sm text-[11px] text-outline">
            {formatDateTime(post.createdAt)}
          </time>
        )}
      </div>
    </article>
  );
};

export const RelatedPosts: React.FC<RelatedPostsProps> = ({ currentPostId, className }) => {
  const { data, isPending, isError } = usePostList({ sort: 'POPULAR', size: 6 });

  if (isPending) {
    return (
      <section aria-labelledby="related-posts-title" className={`rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card md:p-space-xl ${className ?? ''}`}>
        <div className="mb-space-md flex items-center justify-between">
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (isError || !data?.items) return null;

  const related = data.items.filter((p) => p.postId !== currentPostId).slice(0, 3);
  if (related.length === 0) return null;

  return (
    <section
      aria-labelledby="related-posts-title"
      className={`rounded-xl border border-surface-container bg-surface-container-lowest p-space-lg shadow-card md:p-space-xl ${className ?? ''}`}
    >
      <div className="mb-space-lg flex items-center justify-between gap-space-sm border-b border-surface-container pb-space-sm">
        <h2 id="related-posts-title" className="flex items-center gap-2 font-headline-sm text-headline-sm text-on-surface">
          <Icon name="auto_awesome" className="text-[22px] text-primary" />
          <span>Bài viết liên quan &amp; Gợi ý cho bạn</span>
        </h2>
        <Link
          to={PATHS.COMMUNITY.ROOT}
          className="flex items-center gap-1 font-label-md text-label-md text-primary no-underline transition-colors hover:text-primary-container"
        >
          <span>Xem tất cả</span>
          <Icon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3">
        {related.map((post) => (
          <RelatedCard key={post.postId} post={post} />
        ))}
      </div>
    </section>
  );
};
