import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { dietarySchoolLabel } from '@/constants/dietarySchools';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import type { RecipeListItem } from '../types/recipe.types';

interface RecipeCardProps {
  item: RecipeListItem;
  /** Ảnh nằm trong màn hình đầu (ứng viên LCP): tải ngay thay vì lazy. */
  eager?: boolean;
  className?: string;
}

/** Thẻ công thức/video (trang chủ, kho công thức, gợi ý liên quan): chỉ dùng các trường GET /recipes trả về. */
export const RecipeCard = React.forwardRef<HTMLElement, RecipeCardProps>(({ item, eager = false, className }, ref) => {
  const isVideo = item.type === 'VIDEO';
  const school = dietarySchoolLabel(item.dietarySchool);
  const kcal = Number.isFinite(item.caloriesKcal) ? Math.round(item.caloriesKcal) : null;

  return (
    <article
      ref={ref}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card transition-shadow focus-within:shadow-feed hover:shadow-feed',
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-container">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            width={480}
            height={360}
            loading={eager ? 'eager' : 'lazy'}
            // React 18 chưa nhận prop fetchPriority nên ghi thẳng thuộc tính HTML.
            {...(eager ? { fetchpriority: 'high' } : {})}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary-fixed/70 to-secondary-fixed/60">
            <Icon name="restaurant" className="text-[40px] text-on-primary-fixed-variant" />
          </div>
        )}
        {school && (
          <span className="absolute top-3 left-3 rounded-full bg-secondary px-2.5 py-1 font-label-sm text-label-sm text-on-secondary shadow-sm">
            {school}
          </span>
        )}
        {isVideo && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-inverse-surface/70 text-inverse-on-surface">
              <Icon name="play_arrow" filled className="text-[28px]" />
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-space-md">
        {(item.isVerified || isVideo) && (
          <div className="flex flex-wrap items-center gap-2">
            {item.isVerified && (
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary">
                <Icon name="verified" filled className="text-[16px]" />
                Công thức chay chuẩn
              </span>
            )}
            {isVideo && (
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary">
                <Icon name="smart_display" className="text-[16px]" />
                Video
              </span>
            )}
          </div>
        )}
        <h3 className="font-headline-sm text-headline-sm text-on-surface">
          {/* Liên kết phủ cả thẻ; mục VIDEO cũng mở trang công thức vì API không trả videoId. */}
          <Link
            to={PATHS.RECIPES.DETAIL(item.recipeId)}
            className="text-inherit no-underline after:absolute after:inset-0 after:rounded-2xl hover:text-primary"
          >
            {item.title}
            {isVideo && <span className="sr-only"> (video)</span>}
          </Link>
        </h3>
        <ul className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 font-label-md text-label-md text-on-surface-variant">
          {item.cookTimeMinutes > 0 && (
            <li className="flex items-center gap-1 tabular-nums">
              <Icon name="schedule" className="text-[18px]" />
              {item.cookTimeMinutes} phút
            </li>
          )}
          {kcal !== null && kcal > 0 && (
            <li className="flex items-center gap-1 tabular-nums">
              <Icon name="local_fire_department" className="text-[18px]" />
              {formatNumber(kcal)} kcal
            </li>
          )}
          <li className="flex items-center gap-1 tabular-nums" aria-label={`${item.voteCount} lượt thích`}>
            <Icon name="favorite" filled className="text-[18px] text-secondary" />
            {formatNumber(item.voteCount)}
          </li>
        </ul>
      </div>
    </article>
  );
});
RecipeCard.displayName = 'RecipeCard';

export const RecipeCardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card" aria-hidden="true">
        <Skeleton className="aspect-[4/3] rounded-none" />
        <div className="flex flex-col gap-2 p-space-md">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    ))}
  </>
);
