import React from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/** Ô nhập chuẩn của design system: nền lanh, focus nền trắng + viền xanh sage. */
export const INPUT_CLASS =
  'w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container';

/** Viền đỏ cho ô đang lỗi (đè cả lúc focus). */
export const INPUT_ERROR_CLASS = 'ring-1 ring-error focus:ring-error';

/** Nhãn trường form. */
export const LABEL_CLASS = 'font-label-md text-label-md text-on-surface';

/** Dòng lỗi dưới trường. */
export const FieldError: React.FC<{ id?: string; children?: React.ReactNode }> = ({ id, children }) =>
  children ? (
    <p id={id} role="alert" className="font-label-sm text-label-sm text-error">
      {children}
    </p>
  ) : null;

type AlertTone = 'error' | 'warning' | 'info' | 'success';

const TONE: Record<AlertTone, { box: string; icon: string }> = {
  error: { box: 'bg-error-container text-on-error-container', icon: 'error' },
  warning: { box: 'bg-warning-container text-warning', icon: 'warning' },
  info: { box: 'bg-surface-container text-on-surface', icon: 'info' },
  success: { box: 'bg-success-container text-success', icon: 'check_circle' },
};

/** Khung cảnh báo nổi bật trong trang (422/409: hiện message của server, không xóa dữ liệu đã nhập). */
export const FormAlert: React.FC<{
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}> = ({ tone = 'error', title, children, className }) => (
  <div
    role={tone === 'info' || tone === 'success' ? 'status' : 'alert'}
    className={cn('flex items-start gap-3 rounded-xl px-4 py-3', TONE[tone].box, className)}
  >
    <Icon name={TONE[tone].icon} className="mt-0.5 text-[20px]" />
    <div className="min-w-0 flex-1 font-body-sm text-body-sm">
      {title && <p className="font-label-md text-label-md">{title}</p>}
      {children}
    </div>
  </div>
);
