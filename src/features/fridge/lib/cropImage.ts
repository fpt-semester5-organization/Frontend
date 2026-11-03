import type { DetectedItem } from '../types/fridge.types';

/**
 * Kiểm tra tính hợp lệ của toạ độ hộp bao box2d theo chuẩn Gemini Vision (0..1000).
 */
export function isValidBox2D(box2d: unknown): box2d is [number, number, number, number] {
  if (!Array.isArray(box2d) || box2d.length !== 4) return false;
  const [ymin, xmin, ymax, xmax] = box2d;
  if (
    typeof ymin !== 'number' ||
    typeof xmin !== 'number' ||
    typeof ymax !== 'number' ||
    typeof xmax !== 'number'
  ) {
    return false;
  }
  return ymin >= 0 && xmin >= 0 && ymax <= 1000 && xmax <= 1000 && ymin < ymax && xmin < xmax;
}

/**
 * Tải đối tượng hình ảnh từ nguồn (File, Blob, hoặc URL string).
 */
export function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const isCreatedUrl = typeof source !== 'string';
    const objectUrl = isCreatedUrl
      ? URL.createObjectURL(source)
      : (source.startsWith('http') ? `${source}${source.includes('?') ? '&' : '?'}cors=1` : source);

    img.onload = () => {
      if (isCreatedUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve(img);
    };

    img.onerror = (err) => {
      if (isCreatedUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error(typeof err === 'string' ? err : 'Không thể tải ảnh để cắt thumbnail.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Cắt ảnh cận cảnh thumbnail của nguyên liệu từ HTMLImageElement dựa trên toạ độ box2d (0..1000).
 */
export function cropFromImageElement(
  img: HTMLImageElement,
  box2d: [number, number, number, number],
  targetSize = 240
): string | null {
  if (!isValidBox2D(box2d)) return null;

  try {
    const [ymin, xmin, ymax, xmax] = box2d;
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;

    if (!naturalW || !naturalH) return null;

    // Chuyển đổi toạ độ chuẩn hoá 0..1000 sang pixel thực tế
    const sx = Math.max(0, Math.round((xmin / 1000) * naturalW));
    const sy = Math.max(0, Math.round((ymin / 1000) * naturalH));
    const sw = Math.min(naturalW - sx, Math.round(((xmax - xmin) / 1000) * naturalW));
    const sh = Math.min(naturalH - sy, Math.round(((ymax - ymin) / 1000) * naturalH));

    if (sw <= 0 || sh <= 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Vẽ phần ảnh cắt lên canvas vuông kích thước targetSize
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetSize, targetSize);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}

/**
 * Tiện ích cắt ảnh cục bộ bằng HTML5 Canvas cho 1 nguyên liệu.
 * Hoạt động 100% tại Client, không gọi server, không tốn băng thông.
 */
export async function cropIngredientThumbnail(
  imageSource: File | Blob | string,
  box2d: [number, number, number, number],
  targetSize = 240
): Promise<string | null> {
  if (!isValidBox2D(box2d)) return null;

  try {
    const img = await loadImage(imageSource);
    return cropFromImageElement(img, box2d, targetSize);
  } catch {
    return null;
  }
}

/**
 * Tối ưu cắt hàng loạt (Batch Cropping) cho toàn bộ danh sách nguyên liệu nhận diện được.
 * Chỉ nạp và giải mã ảnh nguồn MỘT LẦN duy nhất vào bộ nhớ đồ họa,
 * sau đó lần lượt cắt các vùng tương ứng cho từng nguyên liệu có box2d.
 */
export async function cropAllDetectedThumbnails(
  imageSource: File | Blob | string,
  items: DetectedItem[],
  targetSize = 240
): Promise<DetectedItem[]> {
  if (!items || items.length === 0) return items;

  // Nếu không có mục nào có box2d thì trả về nguyên bản
  const hasAnyBox = items.some((it) => it.box2d && isValidBox2D(it.box2d));
  if (!hasAnyBox) return items;

  try {
    const img = await loadImage(imageSource);
    return items.map((item) => {
      if (!item.box2d || !isValidBox2D(item.box2d)) {
        return item;
      }
      const thumb = cropFromImageElement(img, item.box2d, targetSize);
      return {
        ...item,
        thumbnailUrl: thumb ?? item.thumbnailUrl,
      };
    });
  } catch {
    // Nếu gặp lỗi khi nạp ảnh (ví dụ định dạng không hỗ trợ canvas), giữ nguyên danh sách
    return items;
  }
}
