import type { ReactNode } from 'react';
import BsModal from 'react-bootstrap/Modal';

interface ModalProps {
  show: boolean;
  onHide: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'lg' | 'xl';
  /** Class Tailwind cho nội dung hộp thoại. */
  className?: string;
  /** Ẩn thanh tiêu đề mặc định để trang tự vẽ nội dung (giữ nguyên bố cục Stitch). */
  bare?: boolean;
}

/** Hộp thoại dựng sẵn (react-bootstrap Modal — D102) với giao diện Tailwind của design system. */
export function Modal({ show, onHide, title, children, size, className = '', bare }: ModalProps) {
  return (
    <BsModal
      show={show}
      onHide={onHide}
      size={size}
      centered
      contentClassName={`!border-0 !rounded-xl !bg-surface-container-lowest shadow-xl overflow-hidden ${className}`}
    >
      {!bare && title && (
        <div className="flex items-center justify-between bg-surface-container-low px-space-lg py-space-md">
          <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>
          <button type="button" onClick={onHide} aria-label="Đóng" className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
      {children}
    </BsModal>
  );
}
