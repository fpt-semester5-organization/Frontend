import React, { useEffect, useState } from 'react';
import {
  Camera,
  RotateCcw,
  X,
  AlertTriangle,
  Upload,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import type { SelectedImageInfo } from '@/types';

interface CameraCaptureProps {
  onCapture: (imageInfo: SelectedImageInfo) => void;
  onCancel: () => void;
  onSwitchToUpload?: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  onSwitchToUpload,
}) => {
  const {
    videoRef,
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
  } = useCamera({ initialFacingMode: 'environment', captureQuality: 0.85 });

  const [isCapturing, setIsCapturing] = useState(false);

  // Tự động mở camera khi component được mount
  useEffect(() => {
    void startCamera('environment');
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Xử lý khi nhấn nút chụp tròn lớn
  const handleShutterClick = async () => {
    if (!isActive || isCapturing) return;

    try {
      setIsCapturing(true);
      const blob = await capturePhoto();
      const previewUrl = URL.createObjectURL(blob);

      // Đọc kích thước video thực tế để lưu thông tin
      const video = videoRef.current;
      const width = video?.videoWidth || 1280;
      const height = video?.videoHeight || 720;

      onCapture({
        blob,
        previewUrl,
        name: `fridge_photo_${Date.now()}.jpg`,
        size: blob.size,
        width,
        height,
        source: 'camera',
        mimeType: 'image/jpeg',
      });
    } catch (err) {
      console.error('Lỗi khi chụp ảnh:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Trường hợp gặp lỗi máy ảnh (từ chối quyền, không có camera, camera bận...)
  if (error) {
    return (
      <div
        role="alert"
        className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-2xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 shadow-md flex flex-col items-center text-center"
      >
        <div className="h-16 w-16 mb-4 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8" aria-hidden="true" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          {error.message}
        </h3>

        {error.suggestion && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 bg-red-50/60 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/40">
            {error.suggestion}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {/* Nút thử bật lại camera */}
          <button
            type="button"
            onClick={() => {
              clearError();
              void startCamera(facingMode);
            }}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-semibold transition-colors"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Thử mở lại</span>
          </button>

          {/* Nút chuyển sang Tải ảnh lên */}
          {onSwitchToUpload && (
            <button
              type="button"
              onClick={onSwitchToUpload}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>Tải ảnh lên thay thế</span>
            </button>
          )}

          {/* Nút Hủy */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-3xl overflow-hidden bg-black shadow-2xl flex flex-col items-center">
      {/* Video Preview full chiều ngang */}
      <div className="relative w-full aspect-3/4 sm:aspect-4/3 max-h-[580px] overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Loading spinner trong khi camera đang mở */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-3 z-10">
            <div className="h-10 w-10 border-4 border-[#3d5c47] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Đang khởi động máy ảnh...</span>
          </div>
        )}

        {/* Khung ngắm căn chỉnh tủ lạnh (Viewfinder Overlay) */}
        {isActive && (
          <div
            className="absolute inset-6 sm:inset-10 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between"
            aria-hidden="true"
          >
            {/* 4 Góc bo viền xanh sáng định vị */}
            <div className="flex justify-between w-full">
              <div className="h-8 w-8 border-t-4 border-l-4 border-[#6da57d] rounded-tl-xl shadow-sm" />
              <div className="h-8 w-8 border-t-4 border-r-4 border-[#6da57d] rounded-tr-xl shadow-sm" />
            </div>

            {/* Dòng hướng dẫn giữa khung */}
            <div className="self-center bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-xs sm:text-sm text-[#dfeadf] border border-[#6da57d]/40 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#6da57d]" />
              <span>Căn chỉnh nguyên liệu vào giữa khung hình</span>
            </div>

            <div className="flex justify-between w-full">
              <div className="h-8 w-8 border-b-4 border-l-4 border-[#6da57d] rounded-bl-xl shadow-sm" />
              <div className="h-8 w-8 border-b-4 border-r-4 border-[#6da57d] rounded-br-xl shadow-sm" />
            </div>
          </div>
        )}

        {/* Hiệu ứng chớp sáng khi chụp (Camera Flash) */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white animate-fadeOut z-20 pointer-events-none" />
        )}
      </div>

      {/* Thanh điều khiển nổi phía dưới (Bottom Controls Bar) */}
      <div className="w-full bg-gradient-to-t from-black/90 via-black/70 to-transparent p-5 sm:p-6 flex items-center justify-around z-10">
        {/* Nút Hủy quay về idle */}
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
          aria-label="Hủy và quay lại màn hình chính"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>

        {/* Nút chụp tròn lớn ở giữa */}
        <button
          type="button"
          onClick={handleShutterClick}
          disabled={!isActive || isCapturing}
          className="relative group p-1.5 rounded-full border-4 border-white/80 hover:border-white focus:outline-none focus:ring-4 focus:ring-[#3d5c47]/60 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Chụp ảnh tủ lạnh ngay"
        >
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-tr from-[#2d5a38] to-[#4f6f58] group-hover:from-[#23472c] group-hover:to-[#3d5c47] flex items-center justify-center shadow-lg">
            <Camera className="h-7 w-7 sm:h-9 sm:w-9 text-white group-hover:scale-110 transition-transform" />
          </div>
        </button>

        {/* Nút Đổi camera trước / sau */}
        <button
          type="button"
          onClick={switchCamera}
          disabled={!isActive || isCapturing}
          className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-40"
          aria-label={`Đổi sang camera ${facingMode === 'environment' ? 'trước' : 'sau'}`}
          title={hasMultipleCameras ? 'Đổi camera' : 'Đổi chế độ camera'}
        >
          <RotateCcw className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
