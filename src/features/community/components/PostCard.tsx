import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Leaf, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime, formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import type { PostListItem } from '../types/community.types';

interface PostCardProps {
  post: PostListItem;
  /** Nút thao tác riêng (ví dụ Sửa/Xóa ở "Bài viết của tôi"), nằm trên lớp link của thẻ. */
  actions?: React.ReactNode;
  className?: string;
}

export const PostCard = React.forwardRef<HTMLElement, PostCardProps>(({ post, actions, className }, ref) => (
  <article
    ref={ref}
    className={cn(
      'group relative flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 transition-shadow hover:shadow-md',
      className
    )}
  >
    <div className="aspect-[16/9] bg-brand-50">
      {post.imageUrl ? (
        <img src={post.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Leaf className="h-10 w-10 text-brand-600/40" aria-hidden="true" />
        </div>
      )}
    </div>
    <div className="flex flex-1 flex-col p-4">
      <h3 className="line-clamp-2 text-base font-semibold text-gray-900">
        <Link
          to={PATHS.COMMUNITY.POST_DETAIL(post.postId)}
          className="text-inherit no-underline after:absolute after:inset-0 group-hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          {post.title}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-gray-600">
        {post.authorName}
        {post.createdAt && (
          <>
            <span aria-hidden="true"> · </span>
            <time dateTime={post.createdAt}>{formatDateTime(post.createdAt)}</time>
          </>
        )}
      </p>
      <div className="mt-auto flex items-center gap-4 pt-3 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1" aria-label={`${post.voteCount} lượt thả tim`}>
          <Heart className="h-4 w-4" aria-hidden="true" />
          {formatNumber(post.voteCount)}
        </span>
        <span className="inline-flex items-center gap-1" aria-label={`${post.commentCount} bình luận`}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {formatNumber(post.commentCount)}
        </span>
        {actions && <div className="relative z-10 ml-auto flex items-center gap-1">{actions}</div>}
      </div>
    </div>
  </article>
));
PostCard.displayName = 'PostCard';

export const PostCardSkeleton: React.FC = () => (
  <div className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-200">
    <Skeleton className="aspect-[16/9] rounded-none" />
    <div className="space-y-2 p-4">
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="mt-4 h-4 w-1/3" />
    </div>
  </div>
);

export const PostGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Đang tải bài viết">
    {Array.from({ length: count }, (_, i) => (
      <PostCardSkeleton key={i} />
    ))}
  </div>
);
