import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';

/**
 * Quét mã vạch bằng camera trình duyệt (ZXing) — FN-BAR-01.
 * Hook tự dừng camera khi `active` = false hoặc khi rời trang. Trả về lỗi tiếng Việt nếu bị từ chối quyền / không có camera.
 */
export function useBarcodeCamera(active: boolean, onDetect: (text: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const cb = useRef(onDetect);
  cb.current = onDetect;

  useEffect(() => {
    if (!active || !videoRef.current) return;
    let controls: IScannerControls | undefined;
    let cancelled = false;
    setError(null);
    new BrowserMultiFormatReader()
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result) cb.current(result.getText());
      })
      .then((c) => {
        if (cancelled) c.stop();
        else controls = c;
      })
      .catch((e: unknown) => {
        const name = (e as { name?: string }).name;
        setError(name === 'NotAllowedError' ? 'Bạn chưa cấp quyền camera. Hãy cho phép truy cập camera hoặc nhập mã thủ công.' : 'Không mở được camera. Hãy dùng chế độ nhập mã thủ công.');
      });
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [active]);

  return { videoRef, error };
}
