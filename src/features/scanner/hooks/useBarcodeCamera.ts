import { useCallback, useEffect, useRef, useState } from 'react';
import { BARCODE_PATTERN } from '../types/scanner.schemas';

/**
 * idle: chưa bật · starting: đang xin quyền/mở camera · scanning: đang dò mã
 * denied: người dùng từ chối quyền · no-camera: máy không có camera · busy: camera đang bị ứng dụng khác dùng
 * unsupported: trình duyệt không hỗ trợ hoặc trang không chạy HTTPS · error: lỗi khác
 */
export type CameraState = 'idle' | 'starting' | 'scanning' | 'denied' | 'no-camera' | 'busy' | 'unsupported' | 'error';

/** Các trạng thái không dùng được camera: trang chuyển sang nhập tay. */
export const CAMERA_UNAVAILABLE: CameraState[] = ['denied', 'no-camera', 'busy', 'unsupported', 'error'];

/** Chỉ nhận mã vạch sản phẩm bán lẻ. */
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

const SCAN_INTERVAL_MS = 150;

/** Lỗi getUserMedia → trạng thái hiển thị. */
function stateFromError(error: unknown): CameraState {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'no-camera';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'busy';
  return 'error';
}

interface NativeBarcodeDetector {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string; format: string }>>;
}

interface NativeBarcodeDetectorClass {
  new (options: { formats: string[] }): NativeBarcodeDetector;
  getSupportedFormats(): Promise<string[]>;
}

/** BarcodeDetector có sẵn của trình duyệt (Chrome macOS/Android): đọc mã méo, nhòe tốt và nhanh hơn ZXing. */
async function createNativeDetector(): Promise<NativeBarcodeDetector | null> {
  const Detector = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorClass }).BarcodeDetector;
  if (!Detector) return null;
  try {
    const supported = await Detector.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    return formats.length ? new Detector({ formats }) : null;
  } catch {
    return null;
  }
}

/**
 * Xin camera sau ở Full HD: mặc định trình duyệt thường trả 640×480, các vạch mảnh bị nhòe nên không đọc được.
 * Bật lấy nét liên tục nếu camera hỗ trợ (webcam laptop thường lấy nét cố định thì bỏ qua).
 */
async function openCamera(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  });
  const [track] = stream.getVideoTracks();
  const capabilities = (track?.getCapabilities?.() ?? {}) as { focusMode?: string[] };
  if (capabilities.focusMode?.includes('continuous')) {
    await track
      .applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
      .catch(() => undefined);
  }
  return stream;
}

/**
 * Quét mã vạch bằng camera: ưu tiên BarcodeDetector của trình duyệt, không có thì dùng ZXing (chỉ tải khi cần)
 * với chế độ dò kỹ TRY_HARDER. Khung hình xử lý ngay trên máy, không gửi đi đâu; tìm được mã hợp lệ thì tắt camera và báo mã.
 */
export function useBarcodeCamera(onDetected: (barcode: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const onDetectedRef = useRef(onDetected);
  const [state, setState] = useState<CameraState>('idle');

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setState((current) => (current === 'scanning' || current === 'starting' ? 'idle' : current));
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setState('unsupported');
      return;
    }
    const video = videoRef.current;
    if (!video || stopRef.current) return;
    setState('starting');

    let stream: MediaStream | null = null;
    let stopped = false;
    let stopDecoder: (() => void) | null = null;
    const release = () => {
      stopped = true;
      stopDecoder?.();
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
    stopRef.current = release;

    const found = (code: string) => {
      if (stopped || !BARCODE_PATTERN.test(code)) return;
      release();
      stopRef.current = null;
      setState('idle');
      navigator.vibrate?.(80);
      onDetectedRef.current(code);
    };

    try {
      stream = await openCamera();
      if (stopped) {
        release();
        return;
      }

      const detector = await createNativeDetector();
      if (detector) {
        video.srcObject = stream;
        await video.play();
        let timer: number | undefined;
        const tick = async () => {
          if (stopped) return;
          try {
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const [hit] = await detector.detect(video);
              if (hit) found(hit.rawValue);
            }
          } catch {
            // Khung hình lỗi thì bỏ qua, dò khung tiếp theo
          }
          if (!stopped) timer = window.setTimeout(tick, SCAN_INTERVAL_MS);
        };
        stopDecoder = () => window.clearTimeout(timer);
        void tick();
      } else {
        const [{ BrowserMultiFormatOneDReader, BarcodeFormat }, { DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        const formats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
        const hints = new Map<number, unknown>([
          [DecodeHintType.POSSIBLE_FORMATS, formats],
          [DecodeHintType.TRY_HARDER, true],
        ]);
        const reader = new BrowserMultiFormatOneDReader(hints, { delayBetweenScanAttempts: SCAN_INTERVAL_MS });
        const controls = await reader.decodeFromStream(stream, video, (result) => {
          if (result && formats.includes(result.getBarcodeFormat())) found(result.getText());
        });
        stopDecoder = () => controls.stop();
        if (stopped) controls.stop();
      }
      if (!stopped) setState('scanning');
    } catch (error) {
      release();
      stopRef.current = null;
      setState(stateFromError(error));
    }
  }, []);

  // Rời trang thì tắt camera.
  useEffect(() => () => stopRef.current?.(), []);

  return { videoRef, state, start, stop };
}
