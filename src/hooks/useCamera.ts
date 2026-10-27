import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraError, CameraErrorCode } from '@/types';

export interface UseCameraOptions {
  /** Hướng camera ưu tiên ban đầu, mặc định 'environment' (camera sau) */
  initialFacingMode?: 'environment' | 'user';
  /** Chất lượng nén JPEG khi chụp ảnh từ video frame (0.1 - 1.0), mặc định 0.85 */
  captureQuality?: number;
}

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  isActive: boolean;
  isLoading: boolean;
  error: CameraError | null;
  facingMode: 'environment' | 'user';
  hasMultipleCameras: boolean;
  startCamera: (mode?: 'environment' | 'user') => Promise<void>;
  stopCamera: () => void;
  switchCamera: () => Promise<void>;
  capturePhoto: () => Promise<Blob>;
  clearError: () => void;
}

/**
 * Phân loại và chuyển đổi các lỗi DOMException từ getUserMedia sang thông điệp tiếng Việt thân thiện
 */
function parseCameraError(err: unknown): CameraError {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]';
    if (!isLocal) {
      return {
        code: 'INSECURE_CONTEXT',
        message: 'Trình duyệt chỉ cho phép truy cập máy ảnh trên kết nối HTTPS bảo mật hoặc localhost.',
        suggestion: 'Vui lòng truy cập qua HTTPS hoặc sử dụng tính năng "Tải ảnh lên" từ thiết bị.',
        rawError: err,
      };
    }
  }

  if (err instanceof DOMException || (typeof err === 'object' && err !== null && 'name' in err)) {
    const errorName = (err as { name: string }).name;

    switch (errorName) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          code: 'NOT_ALLOWED',
          message: 'Bạn chưa cấp quyền truy cập máy ảnh cho trang web.',
          suggestion:
            'Vui lòng bấm vào biểu tượng 🔒 hoặc ⚙️ trên thanh địa chỉ trình duyệt để BẬT quyền Camera, sau đó thử lại; hoặc bạn có thể dùng tính năng "Tải ảnh lên".',
          rawError: err,
        };

      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          code: 'NOT_FOUND',
          message: 'Không tìm thấy thiết bị máy ảnh nào được kết nối với thiết bị của bạn.',
          suggestion: 'Vui lòng kiểm tra lại webcam/camera vật lý hoặc chuyển sang "Tải ảnh lên".',
          rawError: err,
        };

      case 'NotReadableError':
      case 'TrackStartError':
        return {
          code: 'NOT_READABLE',
          message: 'Máy ảnh đang bị một ứng dụng khác chiếm giữ.',
          suggestion:
            'Vui lòng tắt các ứng dụng đang dùng camera (như Zoom, Google Meet, Teams, Zalo hoặc tab trình duyệt khác) rồi thử lại.',
          rawError: err,
        };

      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return {
          code: 'OVERCONSTRAINED',
          message: 'Thiết bị không hỗ trợ độ phân giải hoặc chế độ camera được yêu cầu.',
          suggestion: 'Hệ thống sẽ tự động thử lại với cấu hình mặc định.',
          rawError: err,
        };

      case 'SecurityError':
        return {
          code: 'INSECURE_CONTEXT',
          message: 'Truy cập camera bị chặn bởi chính sách bảo mật trình duyệt.',
          suggestion: 'Vui lòng kiểm tra lại quyền của trang web.',
          rawError: err,
        };

      default:
        break;
    }
  }

  return {
    code: 'UNKNOWN',
    message: 'Không thể mở máy ảnh do sự cố không xác định.',
    suggestion: 'Vui lòng làm mới trang hoặc chuyển sang dùng tính năng "Tải ảnh lên".',
    rawError: err,
  };
}

/**
 * Hook quản lý toàn bộ vòng đời camera:
 * - Khởi chạy và gán stream vào videoRef
 * - Chuyển đổi camera trước/sau
 * - Chụp frame xuất Blob JPEG
 * - Đảm bảo ngắt toàn bộ MediaStream tracks khi unmount hoặc stop (tránh đèn camera vẫn sáng)
 */
export function useCamera({
  initialFacingMode = 'environment',
  captureQuality = 0.85,
}: UseCameraOptions = {}): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(initialFacingMode);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  /**
   * Dừng toàn bộ các track của stream và giải phóng phần cứng camera
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Lỗi khi dừng camera track:', e);
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStream(null);
    setIsActive(false);
    setIsLoading(false);
  }, []);

  /**
   * Kiểm tra xem thiết bị có nhiều hơn 1 camera không (ví dụ trước + sau)
   */
  const checkCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setHasMultipleCameras(videoInputs.length > 1);
    } catch {
      // Bỏ qua lỗi enumerate
    }
  }, []);

  /**
   * Khởi động camera với facingMode mong muốn
   */
  const startCamera = useCallback(
    async (mode?: 'environment' | 'user') => {
      const targetMode = mode ?? facingMode;
      setIsLoading(true);
      setError(null);

      // Dừng camera cũ nếu đang chạy
      stopCamera();

      // Kiểm tra API hỗ trợ
      if (!navigator.mediaDevices?.getUserMedia) {
        const notSupportedError: CameraError = {
          code: 'NOT_SUPPORTED',
          message: 'Trình duyệt của bạn không hỗ trợ tính năng truy cập camera trực tiếp.',
          suggestion: 'Vui lòng cập nhật trình duyệt mới hơn hoặc sử dụng nút "Tải ảnh lên".',
        };
        setError(notSupportedError);
        setIsLoading(false);
        return;
      }

      try {
        // Cấu hình constraints ưu tiên camera sau độ phân giải cao cho tủ lạnh
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: targetMode },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
        };

        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr) {
          // Fallback nếu constraints quá chặt
          console.warn('Fallback sang constraints video cơ bản:', initialErr);
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: targetMode },
          });
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setFacingMode(targetMode);
        setIsActive(true);

        // Gán stream vào video element nếu đã sẵn sàng
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Lỗi auto-play video:', playErr);
          }
        }

        // Kiểm tra số lượng camera
        void checkCameraDevices();
      } catch (err) {
        console.error('Lỗi khi mở camera:', err);
        const parsed = parseCameraError(err);
        setError(parsed);
        stopCamera();
      } finally {
        setIsLoading(false);
      }
    },
    [facingMode, stopCamera, checkCameraDevices],
  );

  /**
   * Đổi camera trước / sau
   */
  const switchCamera = useCallback(async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    await startCamera(nextMode);
  }, [facingMode, startCamera]);

  /**
   * Chụp ảnh: vẽ frame hiện tại của video lên canvas và xuất ra Blob JPEG
   */
  const capturePhoto = useCallback(async (): Promise<Blob> => {
    const video = videoRef.current;
    if (!video || !isActive) {
      throw new Error('Máy ảnh chưa sẵn sàng để chụp.');
    }

    // Đợi video có khung hình hợp lệ
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Không thể khởi tạo Canvas 2D để chụp ảnh.');
    }

    // Vẽ frame từ video vào canvas
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error('Không thể tạo tệp ảnh từ khung hình máy ảnh.'));
          }
        },
        'image/jpeg',
        captureQuality,
      );
    });

    // QUAN TRỌNG: Dừng camera ngay sau khi chụp thành công để tắt đèn camera
    stopCamera();

    return blob;
  }, [captureQuality, isActive, stopCamera]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup: Đảm bảo dừng stream khi component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // bỏ qua
          }
        });
        streamRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    stream,
    isActive,
    isLoading,
    error,
    facingMode,
    hasMultipleCameras,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    clearError,
  };
}
