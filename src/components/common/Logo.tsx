import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';

/** Biểu tượng VeggieLife (public/logo.png, nền trong suốt). */
export const LogoMark: React.FC<{ size?: number; className?: string }> = ({ size = 36, className }) => (
  <img src="/logo.png" width={size} height={size} alt="" className={cn('shrink-0 object-contain', className)} />
);

interface LogoProps {
  to?: string;
  size?: number;
  /** Dòng phụ dưới tên thương hiệu, ví dụ "Ẩm thực chay". */
  tagline?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ to = PATHS.HOME, size = 36, tagline, className }) => (
  <Link to={to} aria-label="VeggieLife - Trang chủ" className={cn('flex items-center gap-space-sm no-underline', className)}>
    <LogoMark size={size} />
    <span className="flex flex-col leading-none">
      <span className="font-headline-sm text-headline-sm tracking-tight text-primary">VeggieLife</span>
      {tagline && (
        <span className="mt-0.5 hidden font-label-sm text-label-sm text-on-surface-variant sm:block">{tagline}</span>
      )}
    </span>
  </Link>
);
