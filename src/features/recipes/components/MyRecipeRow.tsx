import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { dietarySchoolLabel } from '@/constants/dietarySchools';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { canArchiveRecipe, canEditRecipe } from '../lib/recipeStatus';
import type { DeleteRecipeMode, MyRecipeItem } from '../types/recipe.types';
import { RecipeStatusBadge } from './RecipeStatusBadge';

interface MyRecipeRowProps {
  item: MyRecipeItem;
  onRemove: (item: MyRecipeItem, mode: DeleteRecipeMode) => void;
}

const ACTION =
  'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-label-md text-label-md no-underline transition-colors hover:bg-surface-container';

const editLabel = (status: MyRecipeItem['status']) =>
  status === 'DRAFT' ? 'Tiếp tục chỉnh sửa' : status === 'REJECTED' ? 'Sửa và gửi lại' : 'Sửa';

/** Một công thức trong SCR-14: trạng thái, thông tin chính và thao tác Xem / Sửa / Gỡ / Xóa (FN-POST-04). */
export const MyRecipeRow: React.FC<MyRecipeRowProps> = ({ item, onRemove }) => {
  const school = dietarySchoolLabel(item.dietarySchool);
  const editable = canEditRecipe(item.status);
  const titleTo = item.status === 'DRAFT' ? PATHS.RECIPES.EDIT(item.recipeId) : PATHS.RECIPES.DETAIL(item.recipeId);

  return (
    <li className="flex gap-space-md rounded-2xl bg-surface-container-lowest p-space-sm shadow-card sm:p-space-md">
      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-container sm:h-24 sm:w-32">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" width={128} height={96} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary-fixed/70 to-secondary-fixed/60">
            <Icon name="restaurant" className="text-[28px] text-on-primary-fixed-variant" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <RecipeStatusBadge status={item.status} />
          {school && <span className="font-label-sm text-label-sm text-on-surface-variant">{school}</span>}
          {item.type === 'VIDEO' && (
            <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary">
              <Icon name="smart_display" className="text-[14px]" />
              Video
            </span>
          )}
        </div>
        <h3 className="font-headline-sm text-headline-sm break-words text-on-surface">
          <Link to={titleTo} className="text-inherit no-underline hover:text-primary">
            {item.title}
          </Link>
        </h3>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 font-label-md text-label-md text-on-surface-variant">
          {item.cookTimeMinutes > 0 && (
            <li className="flex items-center gap-1 tabular-nums">
              <Icon name="schedule" className="text-[16px]" />
              {item.cookTimeMinutes} phút
            </li>
          )}
          {item.caloriesKcal > 0 && (
            <li className="flex items-center gap-1 tabular-nums">
              <Icon name="local_fire_department" className="text-[16px]" />
              {formatNumber(Math.round(item.caloriesKcal))} kcal
            </li>
          )}
          <li className="flex items-center gap-1 tabular-nums" aria-label={`${item.voteCount} lượt thích`}>
            <Icon name="favorite" filled className="text-[16px] text-secondary" />
            {formatNumber(item.voteCount)}
          </li>
        </ul>

        <div className="-ml-2.5 flex flex-wrap items-center gap-1 pt-1">
          <Link to={PATHS.RECIPES.DETAIL(item.recipeId)} className={cn(ACTION, 'text-on-surface')}>
            <Icon name="visibility" className="text-[18px]" />
            Xem
          </Link>
          {editable && (
            <Link to={PATHS.RECIPES.EDIT(item.recipeId)} className={cn(ACTION, 'text-primary')}>
              <Icon name="edit" className="text-[18px]" />
              {editLabel(item.status)}
            </Link>
          )}
          {canArchiveRecipe(item.status) && (
            <button type="button" onClick={() => onRemove(item, 'archive')} className={cn(ACTION, 'text-on-surface-variant')}>
              <Icon name="inventory_2" className="text-[18px]" />
              Gỡ khỏi trang cá nhân
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(item, 'all')}
            aria-label={`Xóa công thức ${item.title}`}
            className={cn(ACTION, 'text-error')}
          >
            <Icon name="delete" className="text-[18px]" />
            Xóa
          </button>
        </div>
      </div>
    </li>
  );
};

export const MyRecipeRowSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <li key={i} className="flex gap-space-md rounded-2xl bg-surface-container-lowest p-space-sm shadow-card sm:p-space-md" aria-hidden="true">
        <Skeleton className="h-20 w-24 shrink-0 rounded-xl sm:h-24 sm:w-32" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </li>
    ))}
  </>
);
