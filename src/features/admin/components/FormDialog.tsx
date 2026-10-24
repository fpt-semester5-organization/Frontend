import React, { forwardRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface FormDialogProps {
  show: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  loading?: boolean;
  danger?: boolean;
  size?: 'sm' | 'lg';
  children: ReactNode;
}

/** Hộp thoại thêm/sửa: đang gửi thì khóa nút + vòng chờ và không cho đóng (SCR-42…45 "thao tác ghi đang gửi"). */
export const FormDialog: React.FC<FormDialogProps> = ({
  show,
  title,
  onClose,
  onSubmit,
  submitLabel,
  loading = false,
  danger = false,
  size,
  children,
}) => (
  <Modal show={show} onHide={onClose} title={title} size={size} locked={loading}>
    <form onSubmit={onSubmit} noValidate className="flex max-h-[80vh] flex-col">
      <div className="flex flex-col gap-space-md overflow-y-auto p-space-lg">{children}</div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-surface-container px-space-lg py-space-md">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button type="submit" variant={danger ? 'danger' : 'primary'} loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  </Modal>
);

/** Nhãn + ô (select/textarea/input tùy biến) + lỗi dưới ô. */
export const FormRow: React.FC<{
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}> = ({ id, label, required, error, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="font-label-md text-label-md text-on-surface">
      {label} {required && <span className="text-secondary">*</span>}
    </label>
    {children}
    {hint && <p className="font-body-sm text-body-sm text-on-surface-variant">{hint}</p>}
    {error && (
      <p id={`${id}-err`} role="alert" className="font-label-sm text-label-sm text-error">
        {error}
      </p>
    )}
  </div>
);

/** Ô đánh dấu có nhãn, vùng bấm đủ lớn. forwardRef để dùng được với `register()` của react-hook-form. */
export const CheckRow = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }
>(function CheckRow({ label, description, className, ...rest }, ref) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 ${className ?? ''}`}>
      <input ref={ref} type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" {...rest} />
      <span className="flex flex-col">
        <span className="font-label-md text-label-md text-on-surface">{label}</span>
        {description && <span className="font-body-sm text-body-sm text-on-surface-variant">{description}</span>}
      </span>
    </label>
  );
});
