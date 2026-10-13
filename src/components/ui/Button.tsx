import React from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

// Kiểu nút theo DESIGN.md (Linen & Earth): bo 4px, chữ Work Sans label-md.
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-container text-on-primary shadow-sm hover:bg-primary',
  secondary: 'bg-surface-container text-on-surface hover:bg-surface-container-high',
  outline:
    'bg-surface-container-lowest text-on-surface ring-1 ring-inset ring-outline-variant hover:bg-surface-container-low',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  danger: 'bg-error text-on-error hover:opacity-90',
  accent: 'bg-secondary text-on-secondary shadow-sm hover:bg-on-secondary-fixed-variant',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3',
  md: 'h-10 px-4',
  lg: 'h-12 px-6',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, className, disabled, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-label-md text-label-md transition-all',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {loading && <Spinner className="text-[16px]" label="Đang xử lý" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
