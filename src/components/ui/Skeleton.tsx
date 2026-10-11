import React from 'react';
import { cn } from '@/lib/cn';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-gray-200', className)} />
);
