import React from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { toApiError } from '@/lib/apiError';
import { getErrorMessage } from '@/lib/notify';
import { cn } from '@/lib/cn';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** Trạng thái lỗi có nút thử lại (UI-3); 502/503 hiện "Dịch vụ tạm gián đoạn" (UI Spec 1.1). */
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, retrying, className }) => {
  const apiError = toApiError(error);
  const serviceDown = apiError.status === 502 || apiError.status === 503;

  return (
    <div
      role="alert"
      className={cn('mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 px-gutter py-space-2xl text-center', className)}
    >
      <Icon name={serviceDown ? 'cloud_off' : 'error'} className={cn('text-[48px]', serviceDown ? 'text-warning' : 'text-outline')} />
      <h2 className="font-headline-sm text-headline-sm text-on-surface">
        {serviceDown ? 'Dịch vụ tạm gián đoạn' : 'Đã có lỗi xảy ra'}
      </h2>
      <p className="font-body-md text-body-md text-on-surface-variant">{getErrorMessage(apiError)}</p>
      {onRetry && (
        <Button className="mt-2" onClick={onRetry} loading={retrying}>
          Thử lại
        </Button>
      )}
    </div>
  );
};
