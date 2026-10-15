import React, { type ReactNode } from 'react';

export interface ModalProps {
  show: boolean;
  onHide: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'lg' | 'xl';
  className?: string;
  bare?: boolean;
  locked?: boolean;
  labelledBy?: string;
}

export const Modal: React.FC<ModalProps> = ({
  show,
  onHide,
  title,
  children,
  size,
  className = '',
  bare,
  locked = false,
  labelledBy,
}) => {
  const titleId = React.useId();
  if (!show) return null;

  const sizeClass =
    size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : 'max-w-lg';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={locked ? undefined : onHide}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${sizeClass} overflow-hidden rounded-xl border border-surface-container-high bg-surface-container-lowest shadow-2xl transition-all ${className}`}
      >
        {!bare && title && (
          <div className="flex items-center justify-between bg-surface-container-low px-space-lg py-space-md border-b border-surface-container-high">
            <h2 id={titleId} className="font-headline-sm text-headline-sm text-primary">{title}</h2>
            <button
              type="button"
              onClick={onHide}
              disabled={locked}
              aria-label="Đóng"
              className="text-on-surface-variant hover:text-on-surface p-1 transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
