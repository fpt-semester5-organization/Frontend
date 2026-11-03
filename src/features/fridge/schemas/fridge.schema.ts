import { z } from 'zod';

/** Ràng buộc ảnh chụp tủ lạnh theo chuẩn BR-AI-CV-01. */
export const IMAGE_RULES = {
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  maxBytes: 10 * 1024 * 1024, // 10 MB
  minWidth: 640,
  minHeight: 480,
} as const;

export type ImageCheck = { ok: true; width: number; height: number } | { ok: false; reason: string };

/** Kiểm tra định dạng tệp và dung lượng trước khi nén hoặc gửi. */
export function checkImageFile(file: Pick<File, 'type' | 'size' | 'name'>): string | null {
  if (!(IMAGE_RULES.mimeTypes as readonly string[]).includes(file.type)) {
    return 'Chỉ chấp nhận tệp ảnh JPG, PNG hoặc WEBP.';
  }
  if (file.size > IMAGE_RULES.maxBytes) {
    return 'Ảnh quá lớn (tối đa 10 MB). Vui lòng chọn tệp ảnh nhỏ hơn.';
  }
  if (file.size === 0) {
    return 'Tệp ảnh rỗng, vui lòng chọn ảnh khác.';
  }
  return null;
}

/**
 * Kiểm tra độ phân giải ảnh: Cần tối thiểu 640×480 px (chấp nhận cả ảnh dọc/ngang).
 * Trả về thông báo lỗi thân thiện, dễ hiểu nếu ảnh quá nhỏ.
 */
export function checkImageDimensions(width: number, height: number): string | null {
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);

  if (longSide < IMAGE_RULES.minWidth || shortSide < IMAGE_RULES.minHeight) {
    return `Ảnh có kích thước quá nhỏ (${width}×${height} px). Để AI nhận diện chính xác nguyên liệu, vui lòng chọn hoặc chụp ảnh có độ phân giải tối thiểu ${IMAGE_RULES.minWidth}×${IMAGE_RULES.minHeight} pixels (chụp gần hoặc rõ nét hơn).`;
  }
  return null;
}

/** Schema thêm nguyên liệu thủ công vào tủ lạnh ảo. */
export const addItemSchema = z.object({
  ingredientId: z.number().int().optional(),
  customItemName: z.string().trim().max(100, 'Tên tùy chỉnh tối đa 100 ký tự').optional(),
  quantity: z.string().trim().max(50, 'Số lượng tối đa 50 ký tự').optional(),
  unit: z.string().trim().max(30, 'Đơn vị tối đa 30 ký tự').optional(),
  freshnessStatus: z.enum(['FRESH', 'NON-FRESH']).default('FRESH'),
  thumbnailUrl: z.string().optional(),
});
export type AddItemForm = z.infer<typeof addItemSchema>;

/** Schema chỉnh sửa nguyên liệu trong tủ lạnh ảo. */
export const editItemSchema = z.object({
  customItemName: z.string().trim().max(100, 'Tên tùy chỉnh tối đa 100 ký tự').optional(),
  quantity: z.string().trim().max(50, 'Số lượng tối đa 50 ký tự').optional(),
  unit: z.string().trim().max(30, 'Đơn vị tối đa 30 ký tự').optional(),
  freshnessStatus: z.enum(['FRESH', 'NON-FRESH']).default('FRESH'),
  thumbnailUrl: z.string().optional(),
});
export type EditItemForm = z.infer<typeof editItemSchema>;

/** Schema sửa tay nguyên liệu do AI nhận diện. */
export const editDetectedItemSchema = z.object({
  name: z.string().trim().min(1, 'Tên nguyên liệu không được để trống').max(100, 'Tối đa 100 ký tự'),
  quantity: z.string().trim().max(50, 'Định lượng tối đa 50 ký tự').optional(),
  freshnessStatus: z.enum(['FRESH', 'NON-FRESH']),
});
export type EditDetectedItemForm = z.infer<typeof editDetectedItemSchema>;
