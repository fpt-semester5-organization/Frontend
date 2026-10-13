import React from 'react';
import { Spinner } from '@/components/ui/Spinner';

export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Đang tải...' }) => (
  <div className="flex min-h-[40vh] items-center justify-center gap-3 text-on-surface-variant">
    <Spinner className="text-[22px] text-primary" label={label} />
    <span className="font-body-sm text-body-sm">{label}</span>
  </div>
);
