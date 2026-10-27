import React from 'react';
import { RefreshCw, Sparkles, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import type { SelectedImageInfo } from '@/types';
import { formatFileSize } from '@/utils/imageUtils';

interface ImagePreviewProps {
  imageInfo: SelectedImageInfo;
  onConfirm: () => void;
  onRetake: () => void;
  isLoading?: boolean;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageInfo,
  onConfirm,
  onRetake,
  isLoading = false,
}) => {
  const { previewUrl, name, size, width, height, source } = imageInfo;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-2 sm:p-4">
      {/* Tiêu đề xem trước - Tông màu Sage green & Surface text của web */}
      <div className="w-full text-center mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-on-surface flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
          <span>Kiểm tra ảnh trước khi phân tích</span>
        </h3>
        <p className="text-xs sm:text-sm text-on-surface-variant text-gray-600 dark:text-gray-400 mt-1">
          Đảm bảo toàn bộ thực phẩm và các ngăn tủ lạnh nằm rõ trong khung hình.
        </p>
      </div>

      {/* Khung chứa ảnh xem trước - Nền be ấm #f4efe8 đồng bộ 100% với website */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-outline-variant/60 bg-[#f4efe8] dark:bg-surface-container p-3 sm:p-4 shadow-inner flex items-center justify-center max-h-[460px] aspect-4/3 sm:aspect-16/10">
        <img
          src={previewUrl}
          alt="Ảnh tủ lạnh đã chụp hoặc tải lên"
          className="max-h-[420px] w-auto max-w-full rounded-xl object-contain shadow-md"
        />

        {/* Badge thông tin nguồn ảnh góc trên */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
          <ImageIcon className="h-3.5 w-3.5 text-primary-fixed" aria-hidden="true" />
          <span>{source === 'camera' ? 'Ảnh chụp máy ảnh' : 'Tệp tải lên'}</span>
        </div>

        {/* Badge kích thước góc dưới */}
        {width && height && (
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-full shadow-xs">
            {width} × {height} px
          </div>
        )}
      </div>

      {/* Thông tin chi tiết tệp - Tông màu surface-container của web */}
      <div className="w-full mt-3 p-3 bg-surface-container-low dark:bg-gray-800/60 rounded-xl border border-outline-variant/50 flex flex-wrap items-center justify-between text-xs sm:text-sm text-on-surface">
        <div className="truncate max-w-[220px] sm:max-w-xs font-medium">
          <span className="text-on-surface-variant text-gray-500">Tên: </span>
          <span title={name} className="font-semibold text-on-surface">
            {name}
          </span>
        </div>
        <div className="font-semibold text-primary">
          <span className="text-on-surface-variant text-gray-500 font-normal">Dung lượng: </span>
          {formatFileSize(size)}
        </div>
      </div>

      {/* Nhóm nút thao tác chuẩn Design System VeggieLife */}
      <div className="w-full mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Nút Chọn lại ảnh khác - Nút phụ chuẩn web */}
        <button
          type="button"
          onClick={onRetake}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-gray-800 text-on-surface hover:bg-surface-container-low active:scale-[0.98] transition-all font-medium text-sm shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label={source === 'camera' ? 'Chụp lại ảnh khác' : 'Chọn lại ảnh khác'}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>Chọn lại ảnh khác</span>
        </button>

        {/* Nút Dùng ảnh này để quét - Nút chính màu xanh rêu thương hiệu #2d5a38 */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2d5a38] hover:bg-[#23472c] active:bg-[#1c3823] text-white font-medium text-sm shadow-xs hover:shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2d5a38]/40"
          aria-label="Xác nhận sử dụng ảnh này để nhận diện thực phẩm"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>Dùng ảnh này để quét</span>
        </button>
      </div>
    </div>
  );
};
