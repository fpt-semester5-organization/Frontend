/**
 * Bộ tiện ích xử lý ảnh cho tính năng Quét tủ lạnh:
 * - Validate tệp ảnh (định dạng, kích thước, độ phân giải)
 * - Tự động resize phía client (cạnh dài tối đa 1600px)
 * - Nén ảnh JPEG (chất lượng 0.85) tiết kiệm băng thông trước khi gửi lên AI
 */

/** Giới hạn dung lượng tối đa cho phép: 10 MB */
export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Độ phân giải tối thiểu quy định trong OpenAPI / FN-VIS-01: 640×480 px */
export const MIN_IMAGE_WIDTH = 640;
export const MIN_IMAGE_HEIGHT = 480;

/** Cạnh dài tối đa sau khi resize phía client */
export const MAX_RESIZE_DIMENSION = 1600;

/** Chất lượng nén JPEG chuẩn */
export const JPEG_COMPRESSION_QUALITY = 0.85;

/** Danh sách phần mở rộng tệp hợp lệ */
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'] as const;

/** Danh sách MIME types hợp lệ */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export interface ImageValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Định dạng dung lượng byte sang chuỗi thân thiện (ví dụ: "2.4 MB", "750 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Kiểm tra tính hợp lệ cơ bản của tệp ảnh trước khi đọc chi tiết:
 * 1. Không rỗng
 * 2. Đuôi tệp hoặc MIME type thuộc danh mục cho phép (JPG, PNG, WEBP, HEIC)
 * 3. Dung lượng <= 10MB
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!file || file.size === 0) {
    return {
      isValid: false,
      errorMessage: 'Tệp ảnh tải lên không có dữ liệu hoặc bị rỗng.',
    };
  }

  // Kiểm tra đuôi mở rộng
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

  // Kiểm tra MIME type
  const fileType = file.type.toLowerCase();
  const hasValidMime =
    ALLOWED_MIME_TYPES.some((mime) => fileType === mime) ||
    fileType.startsWith('image/'); // Fallback cho trường hợp browser nhận diện chung

  if (!hasValidExtension && !hasValidMime) {
    return {
      isValid: false,
      errorMessage:
        'Định dạng tệp không được hỗ trợ. Vui lòng chỉ chọn ảnh có định dạng JPG, PNG, WEBP hoặc HEIC.',
    };
  }

  // Kiểm tra dung lượng tối đa 10MB
  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    const currentSize = formatFileSize(file.size);
    return {
      isValid: false,
      errorMessage: `Ảnh quá nặng (${currentSize}). Dung lượng tối đa cho phép là 10 MB.`,
    };
  }

  return { isValid: true };
}

/**
 * Đọc độ phân giải thực tế của ảnh (width x height)
 */
export function getImageDimensions(source: File | Blob | string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null;

    img.onload = () => {
      const dimensions: ImageDimensions = {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      };
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể tải hoặc đọc thông tin khung hình của ảnh này.'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }
  });
}

/**
 * Kiểm tra xem độ phân giải ảnh có đạt mức tối thiểu 640×480 (hoặc 480×640 đối với ảnh dọc) hay không
 */
export function validateImageDimensions(dimensions: ImageDimensions): ImageValidationResult {
  const { width, height } = dimensions;
  const isLandscapeValid = width >= MIN_IMAGE_WIDTH && height >= MIN_IMAGE_HEIGHT;
  const isPortraitValid = width >= MIN_IMAGE_HEIGHT && height >= MIN_IMAGE_WIDTH;

  if (!isLandscapeValid && !isPortraitValid) {
    return {
      isValid: false,
      errorMessage: `Độ phân giải ảnh quá nhỏ (${width}×${height} px). Tủ lạnh cần ảnh tối thiểu 640×480 px để AI nhận diện rõ nguyên liệu.`,
    };
  }

  return { isValid: true };
}

export interface ResizeOptions {
  maxDimension?: number;
  quality?: number;
}

/**
 * Resize và nén ảnh phía Client:
 * - Giảm cạnh dài về tối đa 1600px nếu ảnh lớn hơn
 * - Giữ nguyên tỷ lệ khung hình
 * - Đảm bảo kích thước sau nén không bị tụt dưới 640×480 (nếu ảnh gốc đạt chuẩn)
 * - Xuất Blob định dạng image/jpeg với chất lượng 0.85
 */
export async function resizeAndCompressImage(
  source: File | Blob,
  options: ResizeOptions = {},
): Promise<{
  blob: Blob;
  width: number;
  height: number;
  wasResized: boolean;
}> {
  const maxDim = options.maxDimension ?? MAX_RESIZE_DIMENSION;
  const quality = options.quality ?? JPEG_COMPRESSION_QUALITY;

  // Đọc ảnh vào HTMLImageElement
  const img = new Image();
  const objectUrl = URL.createObjectURL(source);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Không thể giải mã dữ liệu ảnh để nén.'));
      img.src = objectUrl;
    });

    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;

    let targetWidth = origWidth;
    let targetHeight = origHeight;
    let wasResized = false;

    // Tính toán tỷ lệ co nhỏ nếu cạnh dài vượt quá maxDim (1600px)
    const longestSide = Math.max(origWidth, origHeight);
    if (longestSide > maxDim) {
      const scale = maxDim / longestSide;
      targetWidth = Math.round(origWidth * scale);
      targetHeight = Math.round(origHeight * scale);
      wasResized = true;

      // Bảo vệ không để thu nhỏ dưới ngưỡng tối thiểu 640×480
      const isPortrait = origHeight > origWidth;
      const minW = isPortrait ? MIN_IMAGE_HEIGHT : MIN_IMAGE_WIDTH;
      const minH = isPortrait ? MIN_IMAGE_WIDTH : MIN_IMAGE_HEIGHT;

      if (targetWidth < minW || targetHeight < minH) {
        targetWidth = origWidth;
        targetHeight = origHeight;
        wasResized = false;
      }
    }

    // Vẽ lên Canvas với thuật toán nội suy chất lượng cao
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Trình duyệt không hỗ trợ Canvas 2D để xử lý ảnh.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Xuất ra Blob JPEG
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error('Lỗi khi xuất Blob từ Canvas.'));
          }
        },
        'image/jpeg',
        quality,
      );
    });

    return {
      blob,
      width: targetWidth,
      height: targetHeight,
      wasResized,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
