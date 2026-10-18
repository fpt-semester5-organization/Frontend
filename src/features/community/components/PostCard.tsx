import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime, formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import type { CommunityFeedItem, PostListItem } from '../types/community.types';
import { VoteButton } from './VoteButton';

interface PostCardProps {
  item?: CommunityFeedItem;
  post?: PostListItem;
  className?: string;
}

const ACTION =
  'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-label-md text-label-md no-underline transition-colors hover:bg-surface-container';

/**
 * Thẻ bài viết cộng đồng (SCR-25): hỗ trợ cả 2 loại nội dung:
 * 1. Bài viết (Blog)
 * 2. Công thức món chay (Recipe)
 */
export const PostCard = React.forwardRef<HTMLElement, PostCardProps>(
  ({ item, post, className }, ref) => {
    // Chuẩn hóa dữ liệu: ưu tiên `item`, fallback sang `post`
    const isRecipe = item?.kind === 'RECIPE';
    const id = item ? item.id : post?.postId ?? 0;
    const title = item ? item.title : post?.title ?? '';
    const authorName = item?.authorName ?? post?.authorName ?? (isRecipe ? 'Bếp Chay VeggieLife' : 'Thành viên');
    const imageUrl = item?.imageUrl ?? post?.imageUrl;
    const createdAt = item?.createdAt ?? post?.createdAt;
    const voteCount = item?.voteCount ?? post?.voteCount ?? 0;
    const commentCount = item?.commentCount ?? post?.commentCount ?? 0;

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

    return (
      <article
        ref={ref}
        className={cn(
          'flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card border border-surface-container/60 transition-all hover:shadow-card-hover',
          className
        )}
      >
        <header className="flex items-center gap-3 px-4 pt-4 pb-2">
          <Avatar name={authorName} className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-label-md text-label-md font-semibold text-on-surface">
                {authorName}
              </p>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold',
                  isRecipe
                    ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                    : 'bg-surface-container text-on-surface-variant'
                )}
              >
                {isRecipe ? 'Công thức' : 'Bài viết'}
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

        {imageUrl ? (
          <>
            <h2 className="px-4 pb-2.5">
              <Link
                to={to}
                className="font-headline-md text-headline-md text-on-surface no-underline hover:text-primary transition-colors line-clamp-2"
              >
                {title}
              </Link>
            </h2>
            <Link
              to={to}
              tabIndex={-1}
              aria-hidden="true"
              className="relative block aspect-[16/9] w-full overflow-hidden bg-surface-container-low"
            >
              <img
                src={imageUrl}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-102"
              />
              {/* Chips công thức đè góc ảnh */}
              {isRecipe && (chips.length > 0 || item?.isVerified) && (
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 z-10">
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
            </Link>
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
            aria-label={`${voteCount} lượt thích`}
          >
            <Icon name="favorite" filled className="text-[18px] text-secondary" />
            {formatNumber(voteCount)}
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
            voteCount={voteCount}
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
