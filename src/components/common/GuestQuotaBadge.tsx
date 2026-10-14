import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** Lượt AI dùng thử còn lại của Khách (BR-GUEST-02: 03 lượt/phiên); hết lượt thì đổi sang màu cảnh báo. */
export const GuestQuotaBadge: React.FC<{ remaining: number; limit: number; className?: string }> = ({
  remaining,
  limit,
  className,
}) => {
  const exhausted = remaining <= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm',
        exhausted ? 'bg-error-container text-on-error-container' : 'bg-secondary-fixed text-on-secondary-fixed-variant',
        className
      )}
    >
      <Icon name="auto_awesome" className="text-[14px]" />
      {exhausted ? 'Đã hết lượt AI dùng thử' : `Còn ${Math.max(0, remaining)}/${limit} lượt AI dùng thử`}
    </span>
  );
};
