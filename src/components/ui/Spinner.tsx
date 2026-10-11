import React from 'react';
import { cn } from '@/lib/cn';

interface SpinnerProps {
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ className, label = 'Đang tải' }) => (
  <span
    role="status"
    aria-label={label}
    className={cn(
      'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent',
      className
    )}
  />
);
