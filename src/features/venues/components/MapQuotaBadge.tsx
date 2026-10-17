import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useGuestStore } from '@/stores/guest.store';

/** Lượt tìm quán còn lại của Khách (BR-GUEST-03: 03 lượt có kết quả). Chỉ hiện khi server đã báo hạn mức. */
export const MapQuotaBadge: React.FC = () => {
  const quota = useGuestStore((state) => state.quota?.mapSearch ?? null);
  const remaining = quota ? Math.max(0, quota.remaining) : 3;
  const limit = quota?.limit ?? 3;
  const exhausted = remaining <= 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label-sm text-label-sm font-semibold shadow-xs transition-colors',
        exhausted ? 'bg-error-container text-on-error-container border border-error/30' : 'bg-primary-fixed/40 text-primary border border-primary/20'
      )}
    >
      <Icon name="travel_explore" className="text-[16px]" />
      <span>{exhausted ? 'Đã hết lượt tìm quán' : `Còn ${remaining}/${limit} lượt tìm quán`}</span>
    </span>
  );
};
