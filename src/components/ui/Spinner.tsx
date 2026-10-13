import React from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface SpinnerProps {
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ className, label = 'Đang tải' }) => (
  <span role="status" aria-label={label} className="inline-flex">
    <Icon name="progress_activity" className={cn('animate-spin text-[18px]', className)} />
  </span>
);
