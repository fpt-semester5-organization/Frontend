import React, { useEffect, useState } from 'react';
import { getFallbackImage, type FallbackType } from './image.fallback';

export interface ImageWithFallbackProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallbackType?: FallbackType;
  fallbackKey?: number | string | null;
  fallbackSrc?: string;
  iconFallback?: boolean;
}

/**
 * Component hình ảnh thông minh có cơ chế phòng thủ đa tầng:
 * 1. Tải ảnh từ nguồn src được cung cấp.
 * 2. Nếu src lỗi (404/Cloudinary mock), tự động fallback sang ảnh chất lượng cao nội bộ từ public/images/.
 * 3. Nếu mọi nguồn ảnh đều không tải được, hiển thị khung icon trang nhã (không vỡ layout/alt text).
 */
export function ImageWithFallback({
  src,
  alt = '',
  className = '',
  fallbackType = 'recipe',
  fallbackKey,
  fallbackSrc,
  iconFallback = false,
  onError,
  ...rest
}: ImageWithFallbackProps) {
  const defaultFallback = getFallbackImage(fallbackType, fallbackKey, fallbackSrc);
  const initialSrc = src && src.trim() !== '' ? src : defaultFallback;

  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const [hasTriedFallback, setHasTriedFallback] = useState<boolean>(!src || src.trim() === '');
  const [hasFailedAll, setHasFailedAll] = useState<boolean>(false);

  useEffect(() => {
    if (src && src.trim() !== '') {
      setCurrentSrc(src);
      setHasTriedFallback(false);
      setHasFailedAll(false);
    } else {
      const fb = getFallbackImage(fallbackType, fallbackKey, fallbackSrc);
      setCurrentSrc(fb);
      setHasTriedFallback(true);
      setHasFailedAll(false);
    }
  }, [src, fallbackType, fallbackKey, fallbackSrc]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasTriedFallback && currentSrc !== defaultFallback) {
      // Chuyển sang ảnh fallback
      setHasTriedFallback(true);
      setCurrentSrc(defaultFallback);
    } else {
      // Đã thử fallback mà vẫn lỗi (hoặc chọn dùng icon fallback)
      setHasFailedAll(true);
    }

    if (onError) {
      onError(e);
    }
  };

  if (hasFailedAll || iconFallback) {
    const iconName =
      fallbackType === 'venue'
        ? 'storefront'
        : fallbackType === 'avatar'
        ? 'person'
        : 'restaurant';

    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-surface-container text-outline ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="material-symbols-outlined text-[40px] select-none text-outline-variant">
          {iconName}
        </span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading={rest.loading ?? 'lazy'}
      {...rest}
    />
  );
}
