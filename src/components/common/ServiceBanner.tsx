import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { useUiStore } from '@/stores/ui.store';

/**
 * Banner "Dịch vụ tạm gián đoạn" khi API trả 503 (UI Spec 1.1). http.ts đặt nội dung banner và tự ẩn
 * khi có phản hồi thành công; người dùng có thể thử lại (tải lại trang) hoặc đóng.
 */
export const ServiceBanner: React.FC = () => {
  const message = useUiStore((s) => s.serviceBanner);
  const close = useUiStore((s) => s.setServiceBanner);
  if (!message) return null;

  return (
    <div role="status" className="border-b border-warning/30 bg-warning-container text-warning">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-x-space-md gap-y-1 px-margin-mobile py-2 sm:px-margin">
        <Icon name="cloud_off" className="text-[20px]" />
        <p className="min-w-0 flex-1 font-label-md text-label-md">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md px-2.5 py-1 font-label-md text-label-md underline-offset-2 hover:underline"
        >
          Thử lại
        </button>
        <button type="button" aria-label="Đóng thông báo" onClick={() => close(null)} className="flex rounded p-0.5 hover:bg-black/5">
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
};
