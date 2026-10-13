import React from 'react';
import BsModal from 'react-bootstrap/Modal';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface ModalProps {
  show: boolean;
  onHide: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'lg' | 'xl';
  /** Class cho khung nội dung hộp thoại. */
  className?: string;
  /** Ẩn thanh tiêu đề mặc định để nội dung tự vẽ. */
  bare?: boolean;
  /** Đang gửi: khóa đóng hộp thoại. */
  locked?: boolean;
  labelledBy?: string;
}

/** Hộp thoại react-bootstrap (D102) với giao diện của design system: thẻ trắng bo 12px, thanh tiêu đề màu lanh. */
export const Modal: React.FC<ModalProps> = ({
  show,
  onHide,
  title,
  children,
  size,
  className,
  bare = false,
  locked = false,
  labelledBy,
}) => {
  const titleId = React.useId();
  return (
    <BsModal
      show={show}
      onHide={locked ? undefined : onHide}
      size={size}
      centered
      aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
      contentClassName={cn('border-0 overflow-hidden rounded-xl bg-surface-container-lowest shadow-xl', className)}
    >
      {!bare && title && (
        <div className="flex items-center justify-between gap-space-md bg-surface-container-low px-space-lg py-space-md">
          <h2 id={titleId} className="font-headline-sm text-headline-sm text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onHide}
            disabled={locked}
            aria-label="Đóng"
            className="flex rounded-lg p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface disabled:opacity-40"
          >
            <Icon name="close" />
          </button>
        </div>
      )}
      {children}
    </BsModal>
  );
};
