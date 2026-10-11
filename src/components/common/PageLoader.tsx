import React from 'react';
import { Spinner } from '@/components/ui/Spinner';

export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Đang tải...' }) => (
  <div className="flex min-h-[40vh] items-center justify-center gap-3 text-gray-500">
    <Spinner className="h-5 w-5 text-brand-600" label={label} />
    <span className="text-sm">{label}</span>
  </div>
);
