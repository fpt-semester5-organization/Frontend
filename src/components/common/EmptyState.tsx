import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Hành động gợi ý tiếp theo (UI-3). */
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon: Icon = Inbox, action, className }) => (
  <div
    className={cn(
      'flex flex-col items-center rounded-xl bg-white px-6 py-12 text-center ring-1 ring-gray-200',
      className
    )}
  >
    <Icon className="h-10 w-10 text-gray-400" aria-hidden="true" />
    <h2 className="mt-3 text-base font-semibold text-gray-900">{title}</h2>
    {description && <p className="mt-1 max-w-md text-sm text-gray-600">{description}</p>}
    {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
  </div>
);
