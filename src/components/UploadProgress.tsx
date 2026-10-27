import React from 'react';
import { Loader2, XCircle, Sparkles, UploadCloud, Cpu } from 'lucide-react';
import type { UploadProgressInfo } from '@/types';
import { formatFileSize } from '@/utils/imageUtils';

interface UploadProgressProps {
  progress: UploadProgressInfo;
  onCancel?: () => void;
  canCancel?: boolean;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  onCancel,
  canCancel = true,
}) => {
  const { percentage, phase, phaseLabel, loadedBytes, totalBytes } = progress;

  // Chọn icon tương ứng với từng giai đoạn theo màu sắc thương hiệu
  const renderPhaseIcon = () => {
    switch (phase) {
      case 'compressing':
        return <Cpu className="h-6 w-6 text-primary animate-pulse" aria-hidden="true" />;
      case 'uploading':
        return <UploadCloud className="h-6 w-6 text-primary animate-bounce" aria-hidden="true" />;
      case 'analyzing':
        return <Sparkles className="h-6 w-6 text-primary animate-spin" aria-hidden="true" />;
      case 'done':
      default:
        return <Loader2 className="h-6 w-6 text-primary animate-spin" aria-hidden="true" />;
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center py-6 px-4 text-center max-w-md mx-auto w-full"
      role="status"
      aria-live="polite"
    >
      {/* Icon trung tâm với vòng phát sáng nhẹ */}
      <div className="relative mb-4 flex items-center justify-center">
        <div className="h-16 w-16 rounded-2xl bg-[#eaf3ec] dark:bg-emerald-950/60 border border-[#c4dec8] dark:border-emerald-800 flex items-center justify-center shadow-xs">
          {renderPhaseIcon()}
        </div>
      </div>

      {/* Tiêu đề & Thông điệp giai đoạn */}
      <h3 className="text-base sm:text-lg font-bold text-on-surface mb-1">
        Đang phân tích tủ lạnh của bạn
      </h3>
      <p className="text-xs sm:text-sm text-on-surface-variant min-h-[22px] mb-5 text-gray-600 dark:text-gray-400">
        {phaseLabel || 'Đang xử lý dữ liệu...'}
      </p>

      {/* Thanh tiến trình (Progress Bar) */}
      <div className="w-full bg-surface-container dark:bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden shadow-inner">
        <div
          className="bg-[#2d5a38] h-2.5 rounded-full transition-all duration-300 ease-out shadow-xs"
          style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tiến trình tải và phân tích ảnh"
        />
      </div>

      {/* Thông tin phần trăm & byte */}
      <div className="w-full flex items-center justify-between text-xs text-on-surface-variant mb-6 text-gray-500">
        <span>{percentage}% hoàn thành</span>
        {loadedBytes !== undefined && totalBytes !== undefined && totalBytes > 0 && (
          <span>
            {formatFileSize(loadedBytes)} / {formatFileSize(totalBytes)}
          </span>
        )}
      </div>

      {/* Nút Hủy */}
      {canCancel && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-on-surface hover:text-red-700 bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-950/30 rounded-xl border border-outline-variant/60 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer"
          aria-label="Hủy quá trình quét ảnh tủ lạnh"
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
          <span>Hủy quét</span>
        </button>
      )}
    </div>
  );
};
