import React from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber, formatVnd } from '@/lib/format';
import { perThirtyDays } from '@/features/subscription/lib/benefits';
import { StatusBadge } from './AdminUi';

export interface VipPlanCardProps {
  planName: string;
  durationDays: number;
  priceVnd: number;
  isActive?: boolean;
  featured?: boolean;
  badgeText?: string;
  isAdmin?: boolean;
  isLivePreview?: boolean;
  onEdit?: () => void;
  onQuickPrice?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  className?: string;
}

export const VipPlanCard: React.FC<VipPlanCardProps> = ({
  planName,
  durationDays,
  priceVnd,
  isActive = true,
  featured = false,
  badgeText = 'Tiết kiệm nhất',
  isAdmin = false,
  isLivePreview = false,
  onEdit,
  onQuickPrice,
  onToggle,
  onDelete,
  onMoveLeft,
  onMoveRight,
  canMoveLeft = false,
  canMoveRight = false,
  draggable = false,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  className,
}) => {
  const safeDays = Math.max(1, durationDays || 1);
  const safePrice = Math.max(0, priceVnd || 0);
  const perThirty = perThirtyDays(safePrice, safeDays);

  return (
    <article
      aria-label={planName || 'Gói VIP'}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 select-none',
        featured
          ? 'border-primary-container bg-primary-container text-on-primary shadow-md'
          : 'border-surface-container/60 bg-surface-container-lowest text-on-surface shadow-sm hover:shadow-md',
        !isActive && !isLivePreview && 'opacity-75 ring-1 ring-neutral-300',
        isDragging && 'opacity-40 scale-95 border-dashed border-primary ring-2 ring-primary/40',
        isDragOver && 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-lg border-primary',
        draggable && 'cursor-grab active:cursor-grabbing',
        className
      )}
    >
      {/* Thanh kéo thả vị trí cho Admin */}
      {isAdmin && !isLivePreview && (
        <div className="mb-3 flex items-center justify-between border-b border-surface-container/30 pb-2">
          <div
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-0.5 font-label-sm text-[11px] font-medium transition-colors cursor-grab active:cursor-grabbing',
              featured
                ? 'bg-white/15 text-white hover:bg-white/25'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            )}
            title="Nhấp và kéo thẻ này để thay đổi thứ tự vị trí"
          >
            <Icon name="drag_indicator" className="text-[15px]" />
            <span>Kéo đổi vị trí</span>
          </div>

          <div className="flex items-center gap-1">
            {canMoveLeft && onMoveLeft && (
              <button
                type="button"
                onClick={onMoveLeft}
                title="Di chuyển sang trái"
                aria-label={`Chuyển ${planName} sang trái`}
                className={cn(
                  'rounded p-1 transition-colors',
                  featured ? 'hover:bg-white/20 text-white' : 'hover:bg-surface-container text-on-surface-variant'
                )}
              >
                <Icon name="arrow_back" className="text-[16px]" />
              </button>
            )}
            {canMoveRight && onMoveRight && (
              <button
                type="button"
                onClick={onMoveRight}
                title="Di chuyển sang phải"
                aria-label={`Chuyển ${planName} sang phải`}
                className={cn(
                  'rounded p-1 transition-colors',
                  featured ? 'hover:bg-white/20 text-white' : 'hover:bg-surface-container text-on-surface-variant'
                )}
              >
                <Icon name="arrow_forward" className="text-[16px]" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Góc trên: Tiêu đề, số ngày và Trạng thái */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3
            className={cn(
              'font-serif text-xl font-bold leading-snug line-clamp-2 min-h-[3.25rem]',
              featured ? 'text-white' : 'text-primary'
            )}
          >
            {planName || 'Tên gói VIP'}
          </h3>
          <p
            className={cn(
              'font-body-sm text-body-sm font-medium',
              featured ? 'text-white/80' : 'text-on-surface-variant'
            )}
          >
            {formatNumber(safeDays)} ngày
          </p>
        </div>

        {isAdmin && !isLivePreview && (
          <StatusBadge tone={isActive ? 'success' : 'neutral'} className="shrink-0">
            {isActive ? 'Đang bán' : 'Đã ẩn'}
          </StatusBadge>
        )}

        {isLivePreview && (
          <span className="shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-[11px] font-semibold text-on-surface-variant">
            Bản xem trước
          </span>
        )}
      </div>

      {/* Huy hiệu Tiết kiệm nhất (nếu là gói nổi bật) */}
      <div className="min-h-[28px] mt-2">
        {featured ? (
          <span className="inline-block rounded-md bg-secondary-container px-2.5 py-0.5 font-label-sm text-label-sm font-bold text-on-secondary-container shadow-xs">
            {badgeText}
          </span>
        ) : (
          <span className="inline-block h-6" aria-hidden="true" />
        )}
      </div>

      {/* Giá tiền và quy đổi 30 ngày */}
      <div className="mt-4 flex flex-col">
        <p
          className={cn(
            'font-serif text-3xl font-bold tracking-tight',
            featured ? 'text-white' : 'text-on-surface'
          )}
        >
          {formatVnd(safePrice)}
        </p>
        <p
          className={cn(
            'mt-1 font-body-sm text-body-sm',
            featured ? 'text-white/80' : 'text-on-surface-variant'
          )}
        >
          ≈ {formatVnd(perThirty)} / 30 ngày
        </p>
      </div>

      {/* Nút hành động của khách hàng: "Chọn gói" */}
      <div className="mt-6">
        <div
          className={cn(
            'flex w-full items-center justify-center rounded-xl py-3 text-center font-label-md text-label-md font-semibold transition-colors',
            featured
              ? 'bg-surface-container-lowest text-primary shadow-xs hover:bg-surface-container-low'
              : 'bg-primary text-white shadow-xs hover:bg-primary-container'
          )}
        >
          Chọn gói
        </div>
      </div>

      {/* Bảng công cụ quản trị Admin (khi render trong trang cấu hình) */}
      {isAdmin && !isLivePreview && (
        <div className="mt-5 border-t border-surface-container/40 pt-4">
          <p
            className={cn(
              'mb-2 font-label-sm text-[11px] font-semibold uppercase tracking-wider',
              featured ? 'text-white/70' : 'text-on-surface-variant'
            )}
          >
            Thao tác Quản trị viên
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={featured ? 'secondary' : 'outline'}
              size="sm"
              onClick={onEdit}
              aria-label={`Sửa ${planName}`}
              className={cn(
                'flex-1 min-w-[70px]',
                featured && 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              )}
            >
              <Icon name="edit" className="text-[16px]" />
              Sửa
            </Button>
            <Button
              variant={featured ? 'secondary' : 'outline'}
              size="sm"
              onClick={onQuickPrice}
              aria-label={`Đổi giá ${planName}`}
              className={cn(
                'flex-1 min-w-[75px]',
                featured && 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              )}
            >
              <Icon name="payments" className="text-[16px]" />
              Đổi giá
            </Button>
            <Button
              variant={featured ? 'secondary' : 'outline'}
              size="sm"
              onClick={onToggle}
              aria-label={`${isActive ? 'Ẩn gói' : 'Mở bán lại'} ${planName}`}
              className={cn(
                'flex-1 min-w-[75px]',
                featured && 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              )}
            >
              <Icon name={isActive ? 'visibility_off' : 'visibility'} className="text-[16px]" />
              {isActive ? 'Ẩn' : 'Bán'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label={`Xóa ${planName}`}
              className={cn(
                'px-2.5 text-error hover:bg-error-container/20 hover:text-error',
                featured && 'text-error-container hover:bg-white/10'
              )}
            >
              <Icon name="delete" className="text-[18px]" />
              <span className="sr-only">Xóa</span>
            </Button>
          </div>
        </div>
      )}
    </article>
  );
};
