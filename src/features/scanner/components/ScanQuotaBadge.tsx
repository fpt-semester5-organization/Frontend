import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { QuotaCounter } from '@/lib/guestQuota';
import { useGuestStore } from '@/stores/guest.store';

/**
 * Lượt quét mã vạch còn lại hôm nay (D122: hạn mức cấu hình ở Chỉ số hệ thống). Chỉ hiện khi server đã báo hạn mức.
 * Thành viên truyền `quota` từ lần quét gần nhất; Khách đọc từ store Khách.
 */
export const ScanQuotaBadge: React.FC<{ quota?: QuotaCounter | null }> = ({ quota: memberQuota }) => {
  const guestQuota = useGuestStore((state) => state.quota?.barcodeDaily ?? null);
  const quota = memberQuota ?? guestQuota;
  if (!quota) return null;
  const exhausted = quota.remaining <= 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm',
        exhausted ? 'bg-error-container text-on-error-container' : 'bg-secondary-fixed text-on-secondary-fixed-variant'
      )}
    >
      <Icon name="barcode" className="text-[14px]" />
      {exhausted ? 'Đã hết lượt quét hôm nay' : `Còn ${quota.remaining}/${quota.limit} lượt quét hôm nay`}
    </span>
  );
};
