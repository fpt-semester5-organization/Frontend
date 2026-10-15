import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { Freshness } from '../types/fridge.types';

interface FreshnessBadgeProps {
  status: Freshness;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  short?: boolean;
}

export const FreshnessBadge: React.FC<FreshnessBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md',
  className,
  short = false,
}) => {
  const isFresh = status === 'FRESH';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-full tracking-wide transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-label-sm',
        isFresh
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
          : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
        className,
      )}
      title={isFresh ? 'Nguyên liệu còn tươi ngon' : 'Nguyên liệu cần ưu tiên chế biến sớm'}
    >
      {showIcon && (
        <Icon
          name={isFresh ? 'eco' : 'hourglass_bottom'}
          className={cn(size === 'sm' ? 'text-[14px]' : 'text-[16px]')}
        />
      )}
      <span>{short ? status : isFresh ? 'FRESH · Còn tươi' : 'NON-FRESH · Cần dùng sớm'}</span>
    </span>
  );
};
