import React, { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { CAMERA_UNAVAILABLE, useBarcodeCamera, type CameraState } from '../hooks/useBarcodeCamera';

interface CameraScannerProps {
  onDetected: (barcode: string) => void;
  onUnavailable: (state: CameraState) => void;
  /** Đang tra mã hoặc đang xem kết quả: không bật lại camera. */
  paused: boolean;
  /** Bật camera ngay khi hiện (bấm "Quét sản phẩm khác" sau lần quét trước). */
  autoStart?: boolean;
}

/** Khung quét bằng camera (ZXing). Lần đầu người dùng bấm "Bật camera" thì trình duyệt mới hỏi quyền. */
export const CameraScanner: React.FC<CameraScannerProps> = ({ onDetected, onUnavailable, paused, autoStart }) => {
  const { videoRef, state, start, stop } = useBarcodeCamera(onDetected);
  const live = state === 'starting' || state === 'scanning';

  useEffect(() => {
    if (autoStart) void start();
    // Chỉ chạy khi khung quét vừa hiện.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (CAMERA_UNAVAILABLE.includes(state)) onUnavailable(state);
  }, [state, onUnavailable]);

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-inverse-surface">
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="Hình ảnh từ camera"
          className={cn('h-full w-full object-cover', !live && 'invisible')}
        />

        {state === 'scanning' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="relative h-[42%] w-[78%] rounded-lg shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]">
              <span className="absolute top-0 left-0 h-6 w-6 rounded-tl-lg border-t-4 border-l-4 border-white" />
              <span className="absolute top-0 right-0 h-6 w-6 rounded-tr-lg border-t-4 border-r-4 border-white" />
              <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-4 border-l-4 border-white" />
              <span className="absolute right-0 bottom-0 h-6 w-6 rounded-br-lg border-r-4 border-b-4 border-white" />
              <span className="absolute inset-x-2 top-1/2 h-0.5 bg-error shadow-[0_0_8px_2px_rgb(198_40_40/0.6)] motion-safe:animate-pulse" />
            </div>
          </div>
        )}

        {state === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-space-sm text-inverse-on-surface" role="status">
            <Icon name="progress_activity" className="animate-spin text-[36px]" />
            <p className="font-body-sm text-body-sm">Đang mở camera, hãy cho phép quyền camera nếu trình duyệt hỏi.</p>
          </div>
        )}

        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-space-sm px-space-lg text-center text-inverse-on-surface">
            <Icon name="barcode_scanner" className="text-[48px] opacity-90" />
            <p className="font-label-lg text-label-lg">{paused ? 'Đã quét xong' : 'Quét mã vạch trên bao bì'}</p>
            {!paused && (
              <Button onClick={() => void start()} className="mt-1">
                <Icon name="photo_camera" className="text-[18px]" />
                Bật camera
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-space-sm">
        <p className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
          <Icon name="lock" className="mt-0.5 text-[16px]" />
          {state === 'scanning'
            ? 'Đưa mã vạch vào giữa khung, giữ máy chắc tay và đủ sáng.'
            : 'Hình ảnh chỉ xử lý trên máy bạn, không gửi đi đâu.'}
        </p>
        {state === 'scanning' && (
          <Button variant="ghost" size="sm" onClick={stop}>
            Tắt camera
          </Button>
        )}
      </div>
    </div>
  );
};
