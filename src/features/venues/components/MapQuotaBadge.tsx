import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useGuestStore } from '@/stores/guest.store';

/** Lượt tìm quán còn lại của Khách (BR-GUEST-03: 03 lượt có kết quả). Chỉ hiện khi server đã báo hạn mức. */
export const MapQuotaBadge: React.FC = () => {
  const quota = useGuestStore((state) => state.quota?.mapSearch ?? null);
  if (!quota) return null;
  const exhausted = quota.remaining <= 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm',
        exhausted ? 'bg-error-container text-on-error-container' : 'bg-secondary-fixed text-on-secondary-fixed-variant'
      )}
    >
      <Icon name="travel_explore" className="text-[14px]" />
      {exhausted ? 'Đã hết lượt tìm quán' : `Còn ${quota.remaining}/${quota.limit} lượt tìm quán`}
    </span>
  );
};
