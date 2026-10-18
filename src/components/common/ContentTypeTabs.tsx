import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';

export interface ContentTypeTabsProps {
  activeType: 'POST' | 'RECIPE';
  className?: string;
}

/**
 * Bộ chuyển đổi nhanh loại nội dung muốn tạo (SCR-27 Bài viết Blog vs SCR-13 Công thức món chay).
 * Đặt ở đầu trang tạo bài để người dùng chủ động chọn 1 trong 2 loại.
 */
export const ContentTypeTabs: React.FC<ContentTypeTabsProps> = ({ activeType, className }) => {
  return (
    <div className={cn('mb-space-lg rounded-2xl bg-surface-container-lowest p-space-md shadow-card border border-surface-container/80', className)}>
      <div className="flex items-center gap-2 mb-space-sm">
        <Icon name="post_add" className="text-[20px] text-primary" />
        <p className="font-label-md text-label-md font-bold text-on-surface">
          Chọn loại nội dung muốn đăng:
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
        {/* Lựa chọn 1: Bài viết (Blog) */}
        <Link
          to={PATHS.COMMUNITY.NEW_POST}
          className={cn(
            'flex items-center gap-space-md p-space-md rounded-xl border transition-all no-underline cursor-pointer',
            activeType === 'POST'
              ? 'border-primary bg-primary-fixed/20 shadow-xs'
              : 'border-surface-container bg-surface-container-lowest hover:bg-surface-container-low hover:border-outline'
          )}
        >
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
              activeType === 'POST'
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container text-on-surface-variant'
            )}
          >
            <Icon name="article" className="text-[24px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-label-md text-label-md font-bold text-on-surface">
                1. Bài viết (Blog chia sẻ)
              </p>
              {activeType === 'POST' && (
                <span className="flex h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px] mt-0.5 leading-snug">
              Chia sẻ cảm nghĩ, mẹo vặt, hỏi đáp và hành trình ẩm thực chay.
            </p>
          </div>
        </Link>

        {/* Lựa chọn 2: Công thức món chay (Recipe) */}
        <Link
          to={`${PATHS.RECIPES.NEW}?from=community`}
          className={cn(
            'flex items-center gap-space-md p-space-md rounded-xl border transition-all no-underline cursor-pointer',
            activeType === 'RECIPE'
              ? 'border-secondary bg-secondary-fixed/20 shadow-xs'
              : 'border-surface-container bg-surface-container-lowest hover:bg-surface-container-low hover:border-outline'
          )}
        >
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
              activeType === 'RECIPE'
                ? 'bg-secondary text-on-secondary'
                : 'bg-surface-container text-on-surface-variant'
            )}
          >
            <Icon name="restaurant_menu" className="text-[24px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-label-md text-label-md font-bold text-on-surface">
                2. Công thức món chay
              </p>
              {activeType === 'RECIPE' && (
                <span className="flex h-2 w-2 rounded-full bg-secondary" />
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px] mt-0.5 leading-snug">
              Đăng công thức nấu chi tiết kèm nguyên liệu, các bước làm và calo.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};
