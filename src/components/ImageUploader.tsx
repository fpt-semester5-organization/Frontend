import React, { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { UploadCloud, AlertCircle, FileImage, ShieldCheck, Camera } from 'lucide-react';
import type { SelectedImageInfo } from '@/types';
import {
  validateImageFile,
  getImageDimensions,
  validateImageDimensions,
} from '@/utils/imageUtils';

interface ImageUploaderProps {
  onImageSelected: (imageInfo: SelectedImageInfo) => void;
  onStartCamera?: () => void;
  onError?: (errorMessage: string) => void;
  className?: string;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
  onStartCamera,
  onError,
  className = '',
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Xử lý xác thực và đọc tệp ảnh
   */
  const processFile = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // 1. Kiểm tra định dạng & dung lượng
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        const msg = validation.errorMessage || 'Tệp ảnh không hợp lệ.';
        setErrorMessage(msg);
        onError?.(msg);
        return;
      }

      // 2. Đọc và kiểm tra kích thước tối thiểu (640x480 px)
      const dimensions = await getImageDimensions(file);
      const dimensionValidation = validateImageDimensions(dimensions);
      if (!dimensionValidation.isValid) {
        const msg = dimensionValidation.errorMessage || 'Ảnh có độ phân giải quá nhỏ.';
        setErrorMessage(msg);
        onError?.(msg);
        return;
      }

      // 3. Tạo Object URL xem trước
      const previewUrl = URL.createObjectURL(file);

      onImageSelected({
        file,
        blob: file,
        previewUrl,
        name: file.name,
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
        source: 'upload',
        mimeType: file.type || 'image/jpeg',
      });
    } catch (err) {
      console.error('Lỗi khi đọc tệp ảnh:', err);
      const msg = err instanceof Error ? err.message : 'Không thể đọc tệp ảnh đã chọn.';
      setErrorMessage(msg);
      onError?.(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    // Reset để có thể chọn lại cùng 1 file nếu cần
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isProcessing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const triggerFileInput = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Vùng Dropzone có hỗ trợ Kéo - Thả và Bấm để chọn */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerFileInput();
          }
        }}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Kéo thả ảnh tủ lạnh vào đây hoặc bấm để chọn tệp từ thiết bị"
        className={`group relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 scale-[1.01]'
            : 'border-emerald-700/20 dark:border-emerald-400/20 bg-emerald-50/20 dark:bg-gray-800/40 hover:border-emerald-600 hover:bg-emerald-50/40 dark:hover:bg-gray-800/80'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Input file ẩn */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={handleFileChange}
          disabled={disabled || isProcessing}
          className="hidden"
          aria-hidden="true"
        />

        {/* Icon hộp tải ảnh */}
        <div
          className={`h-16 w-16 mb-4 rounded-2xl flex items-center justify-center transition-transform duration-200 ${
            isDragging
              ? 'bg-emerald-600 text-white scale-110 shadow-md'
              : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 group-hover:scale-105'
          }`}
        >
          {isProcessing ? (
            <div className="h-7 w-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <UploadCloud className="h-8 w-8" aria-hidden="true" />
          )}
        </div>

        {/* Tiêu đề & Hướng dẫn */}
        <div className="text-center">
          <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {isProcessing
              ? 'Đang kiểm tra chất lượng ảnh...'
              : isDragging
                ? 'Thả ảnh vào đây ngay bây giờ'
                : 'Kéo thả ảnh tủ lạnh vào đây hoặc bấm để chọn tệp'}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5 flex-wrap">
            <FileImage className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span>Hỗ trợ JPG, PNG, WEBP, HEIC</span>
            <span className="hidden sm:inline">•</span>
            <span>Tối thiểu 640×480 px</span>
            <span className="hidden sm:inline">•</span>
            <span>Tối đa 10 MB</span>
          </p>
        </div>

        {/* 2 nút nằm cạnh nhau trong cùng 1 khung */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {onStartCamera && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartCamera();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2d5a38] hover:bg-[#23472c] text-white font-medium text-sm shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              <span>Chụp ảnh ngay</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerFileInput();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2d5a38] hover:bg-[#23472c] text-white font-medium text-sm shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            <span>Chọn ảnh tủ lạnh</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi khi chọn file không đạt chuẩn */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300 animate-fadeIn"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" aria-hidden="true" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}
    </div>
  );
};
