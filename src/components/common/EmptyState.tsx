import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Tên icon Material Symbols. */
  icon?: string;
  /** Hành động gợi ý tiếp theo (UI-3). */
  action?: React.ReactNode;
  className?: string;
}

/** Trạng thái rỗng / không tìm thấy (NFR UI-3). */
export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon = 'inbox', action, className }) => (
  <div
    role="status"
    className={cn('mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 px-gutter py-space-2xl text-center', className)}
  >
    <Icon name={icon} className="text-[48px] text-outline" />
    <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
    {description && <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>}
    {action && <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>}
  </div>
);
