import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { RECIPE_STATUS_META } from '../lib/recipeStatus';
import type { MyRecipeStatus } from '../types/recipe.types';

/** Nhãn trạng thái công thức (Đã đăng, Bản nháp, Đang chờ duyệt…). */
export const RecipeStatusBadge: React.FC<{ status: MyRecipeStatus; className?: string }> = ({ status, className }) => {
  const meta = RECIPE_STATUS_META[status];
  return (
    <span
      title={meta.hint}
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm', meta.className, className)}
    >
      <Icon name={meta.icon} className="text-[14px]" />
      {meta.label}
    </span>
  );
};
