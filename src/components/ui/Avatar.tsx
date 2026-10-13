import React from 'react';
import { cn } from '@/lib/cn';

/** "Nguyễn Văn An" → "VA" (hai chữ cái đầu của hai từ cuối). */
const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'VL';

const SIZE = {
  sm: 'h-8 w-8 text-label-sm',
  md: 'h-10 w-10 text-label-md',
  lg: 'h-12 w-12 text-label-md',
} as const;

/** Ảnh đại diện dạng chữ cái đầu (API cộng đồng không trả avatarUrl). */
export const Avatar: React.FC<{ name: string; size?: keyof typeof SIZE; className?: string }> = ({
  name,
  size = 'md',
  className,
}) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex shrink-0 items-center justify-center rounded-full bg-primary-fixed font-label-md font-bold text-on-primary-fixed',
      SIZE[size],
      className
    )}
  >
    {initialsOf(name)}
  </span>
);
