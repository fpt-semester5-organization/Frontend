import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';

/**
 * Biểu tượng VeggieLife (public/logo.png, nền trong suốt).
 * Mặc định là ảnh trang trí (alt rỗng) vì luôn đi kèm chữ "VeggieLife" hoặc nằm trong link đã có nhãn;
 * truyền `alt` nếu dùng biểu tượng đứng một mình.
 */
export const LogoMark: React.FC<{ size?: number; className?: string; alt?: string }> = ({ size = 36, className, alt = '' }) => (
  <img src="/logo.png" width={size} height={size} alt={alt} className={cn('shrink-0 object-contain', className)} />
);

export interface LogoProps {
  to?: string;
  size?: number;
  /** Dòng phụ dưới tên thương hiệu (vd. "Ẩm thực chay", "Quản trị"). */
  tagline?: string;
  onClick?: () => void;
  className?: string;
  /** Chỉ hiện biểu tượng (sidebar thu gọn). */
  markOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ to = PATHS.HOME, size = 36, tagline, onClick, className, markOnly }) => (
  <Link to={to} onClick={onClick} aria-label="VeggieLife - Trang chủ" className={cn('flex items-center gap-space-sm no-underline', className)}>
    <LogoMark size={size} />
    {!markOnly && (
      <span className="flex flex-col leading-none">
        <span className="font-headline-sm text-headline-sm tracking-tight text-primary">VeggieLife</span>
        {tagline && (
          <span className="mt-0.5 hidden font-label-sm text-label-sm text-on-surface-variant sm:block">{tagline}</span>
        )}
      </span>
    )}
  </Link>
);
