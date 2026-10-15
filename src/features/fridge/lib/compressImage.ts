import type { ImageOptimizationResult } from '../types/fridge.types';

export interface CompressOptions {
  /** Chiều cạnh tối đa (chiều dài hoặc rộng nhất), mặc định 1920px. */
  maxDimension?: number;
  /** Ngưỡng dung lượng (bytes) để kích hoạt nén tự động, mặc định 1.5 MB. */
  maxFileSizeBytes?: number;
  /** Chất lượng nén JPEG (0.1 - 1.0), mặc định 0.85. */
  quality?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxDimension: 1920,
  maxFileSizeBytes: 1.5 * 1024 * 1024, // 1.5 MB
  quality: 0.85,
};

/**
 * Tự động thu nhỏ và nén ảnh lớn trước khi gửi lên AI server (FN-VIS-01).
 * Giúp tiết kiệm băng thông, tăng tốc độ phản hồi của Gemini Vision và tránh lỗi 413 Payload Too Large.
 * Đảm bảo độ phân giải sau khi nén không bao giờ tụt xuống dưới mức tối thiểu 640×480.
 */
export async function compressImage(
  file: File,
  options?: CompressOptions,
): Promise<ImageOptimizationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // 1. Tải ảnh vào Image object để đọc kích thước
  const imageElement = await loadImage(file);
  if (!imageElement) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      width: 0,
      height: 0,
      reductionPercentage: 0,
    };
  }

  const { naturalWidth: width, naturalHeight: height } = imageElement;

  // 2. Kiểm tra xem ảnh có phải là "ảnh lớn" cần thu nhỏ / nén không
  const isLargeDimension = width > opts.maxDimension || height > opts.maxDimension;
  const isLargeFileSize = originalSize > opts.maxFileSizeBytes;

  if (!isLargeDimension && !isLargeFileSize) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      width,
      height,
      reductionPercentage: 0,
    };
  }

  // 3. Tính toán kích thước mới giữ nguyên tỉ lệ khung hình
  let targetWidth = width;
  let targetHeight = height;

  if (isLargeDimension) {
    const longSide = Math.max(width, height);
    const scale = opts.maxDimension / longSide;
    targetWidth = Math.round(width * scale);
    targetHeight = Math.round(height * scale);
  }

  // Đảm bảo không bao giờ nén nhỏ hơn mức chuẩn tối thiểu 640×480
  const finalLong = Math.max(targetWidth, targetHeight);
  const finalShort = Math.min(targetWidth, targetHeight);
  if (finalLong < 640 || finalShort < 480) {
    targetWidth = width;
    targetHeight = height;
  }

  // 4. Vẽ lên canvas và xuất ra Blob JPEG chất lượng cao
  try {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        wasCompressed: false,
        width,
        height,
        reductionPercentage: 0,
      };
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imageElement, 0, 0, targetWidth, targetHeight);

    const mimeType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mimeType, opts.quality);
    });

    if (!blob) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        wasCompressed: false,
        width,
        height,
        reductionPercentage: 0,
      };
    }

    // Nếu dung lượng sau nén nhỏ hơn ảnh gốc -> nhận ảnh nén
    if (blob.size < originalSize) {
      const ext = mimeType === 'image/webp' ? '.webp' : '.jpg';
      const newName = file.name.replace(/\.[^/.]+$/, '') + ext;
      const compressedFile = new File([blob], newName, {
        type: mimeType,
        lastModified: Date.now(),
      });

      const reductionPercentage = Math.round(((originalSize - blob.size) / originalSize) * 100);

      return {
        file: compressedFile,
        originalSize,
        compressedSize: blob.size,
        wasCompressed: true,
        width: targetWidth,
        height: targetHeight,
        reductionPercentage,
      };
    }

    // Nếu ảnh nén không nhẹ hơn (ví dụ đã được tối ưu từ trước)
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      width,
      height,
      reductionPercentage: 0,
    };
  } catch (err) {
    console.warn('[compressImage] Không thể nén ảnh trên canvas, dùng ảnh gốc:', err);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      width,
      height,
      reductionPercentage: 0,
    };
  }
}

function loadImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}
