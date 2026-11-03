import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Tối ưu URL ảnh đại diện sang độ phân giải cao và sắc nét, tránh mờ do nén thấp trên màn hình Retina/High-DPI.
 */
const getHighResSrc = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  // Nếu là ảnh unsplash bị giới hạn w=160 hoặc q=80 thì nâng cấp lên chuẩn HD sắc nét
  if (url.includes('images.unsplash.com')) {
    return url.replace(/w=\d+/, 'w=600').replace(/q=\d+/, 'q=95');
  }
  // Nếu là cloudinary có thumbnail nhỏ
  if (url.includes('cloudinary.com') && url.includes('w_')) {
    return url.replace(/w_\d+/, 'w_400');
  }
  return url;
};

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

export interface AvatarProps {
  name: string;
  src?: string | null;
  alt?: string;
  size?: keyof typeof SIZE;
  className?: string;
}

/**
 * Ảnh đại diện: Ưu tiên hiển thị ảnh từ `src`, tự động chuyển về chữ cái đầu
 * (initials) nếu chưa có ảnh hoặc tải ảnh thất bại.
 */
export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  alt,
  size = 'md',
  className,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  if (src && !imageError) {
    const optimizedSrc = getHighResSrc(src);
    return (
      <span
        className={cn(
          'relative inline-flex shrink-0 overflow-hidden rounded-full bg-surface-container',
          SIZE[size],
          className
        )}
      >
        <img
          src={optimizedSrc}
          alt={alt || `Ảnh đại diện của ${name}`}
          onError={() => setImageError(true)}
          loading="eager"
          decoding="sync"
          className="h-full w-full object-cover"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </span>
    );
  }

  return (
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
};
