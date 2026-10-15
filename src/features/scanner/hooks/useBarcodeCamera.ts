import { useCallback, useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { BARCODE_PATTERN } from '../types/scanner.schemas';

/**
 * idle: chưa bật · starting: đang xin quyền/mở camera · scanning: đang dò mã
 * denied: người dùng từ chối quyền · no-camera: máy không có camera · busy: camera đang bị ứng dụng khác dùng
 * unsupported: trình duyệt không hỗ trợ hoặc trang không chạy HTTPS · error: lỗi khác
 */
export type CameraState = 'idle' | 'starting' | 'scanning' | 'denied' | 'no-camera' | 'busy' | 'unsupported' | 'error';

/** Các trạng thái không dùng được camera: trang chuyển sang nhập tay. */
export const CAMERA_UNAVAILABLE: CameraState[] = ['denied', 'no-camera', 'busy', 'unsupported', 'error'];

/** Lỗi getUserMedia → trạng thái hiển thị. */
function stateFromError(error: unknown): CameraState {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'no-camera';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'busy';
  return 'error';
}

/**
 * Quét mã vạch bằng camera với ZXing (@zxing/browser). Thư viện chỉ tải khi bật camera.
 * Khung hình xử lý ngay trên máy, không gửi đi đâu; tìm được mã hợp lệ thì tắt camera và báo mã.
 */
export function useBarcodeCamera(onDetected: (barcode: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onDetectedRef = useRef(onDetected);
  const [state, setState] = useState<CameraState>('idle');

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setState((current) => (current === 'scanning' || current === 'starting' ? 'idle' : current));
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setState('unsupported');
      return;
    }
    if (!videoRef.current || controlsRef.current) return;
    setState('starting');
    try {
      const { BrowserMultiFormatOneDReader, BarcodeFormat } = await import('@zxing/browser');
      const allowed = new Set([BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
      const reader = new BrowserMultiFormatOneDReader(undefined, { delayBetweenScanAttempts: 150 });
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        videoRef.current,
        (result, _error, controls) => {
          if (!result) return;
          const code = result.getText();
          if (!allowed.has(result.getBarcodeFormat()) || !BARCODE_PATTERN.test(code)) return;
          controls.stop();
          controlsRef.current = null;
          setState('idle');
          navigator.vibrate?.(80);
          onDetectedRef.current(code);
        }
      );
      setState('scanning');
    } catch (error) {
      controlsRef.current = null;
      setState(stateFromError(error));
    }
  }, []);

  // Rời trang thì tắt camera.
  useEffect(() => () => controlsRef.current?.stop(), []);

  return { videoRef, state, start, stop };
}
