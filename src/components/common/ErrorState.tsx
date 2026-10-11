import React from 'react';
import { AlertTriangle, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toApiError } from '@/lib/apiError';
import { getErrorMessage } from '@/lib/notify';
import { cn } from '@/lib/cn';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** Trạng thái lỗi có nút thử lại (UI-3); 502/503 hiện banner "Dịch vụ tạm gián đoạn" (UI Spec 1.1). */
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, retrying, className }) => {
  const apiError = toApiError(error);
  const serviceDown = apiError.status === 502 || apiError.status === 503;
  const Icon = serviceDown ? CloudOff : AlertTriangle;

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center rounded-xl px-6 py-10 text-center ring-1',
        serviceDown ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-gray-200',
        className
      )}
    >
      <Icon className={cn('h-10 w-10', serviceDown ? 'text-amber-600' : 'text-red-500')} aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold text-gray-900">
        {serviceDown ? 'Dịch vụ tạm gián đoạn' : 'Không tải được dữ liệu'}
      </h2>
      <p className="mt-1 max-w-md text-sm text-gray-600">{getErrorMessage(apiError)}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry} loading={retrying}>
          Thử lại
        </Button>
      )}
    </div>
  );
};
