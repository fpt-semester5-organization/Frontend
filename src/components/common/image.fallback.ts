/** Danh mục các ảnh món ăn chay đẹp có sẵn trong public/images/ */
export const FALLBACK_RECIPE_IMAGES = [
  '/images/01d00038e1.jpg', // Món ăn chay tổng hợp
  '/images/cbfb196a44.jpg', // Món canh nấm rong biển
  '/images/f69adfd232.jpg', // Món nấm kho tiêu hạt sen
  '/images/32ad7946e9.jpg', // Món cuốn thanh mát
  '/images/96ef905998.jpg', // Món súp dinh dưỡng
  '/images/2f0a1969da.jpg', // Món mì xào rau củ
  '/images/55e020cc9c.jpg', // Món xào / áp chảo
  '/images/c9dc8bcdde.jpg', // Món hầm bổ dưỡng
  '/images/0c9e9e0e87.jpg', // Món salad tươi ngon
  '/images/2b6936ec9e.jpg', // Món ăn thanh tịnh
];

export const FALLBACK_VENUE_IMAGE = '/images/fc59281550.jpg';

export type FallbackType = 'recipe' | 'venue' | 'avatar' | 'post';

/**
 * Trả về ảnh fallback nội bộ tương ứng theo loại và định danh (để tránh các món ăn trùng lặp ảnh đơn điệu)
 */
export function getFallbackImage(
  type: FallbackType = 'recipe',
  key?: number | string | null,
  customFallback?: string
): string {
  if (customFallback) return customFallback;
  if (type === 'venue') return FALLBACK_VENUE_IMAGE;

  if (type === 'recipe' || type === 'post') {
    if (key != null) {
      const numericKey =
        typeof key === 'number'
          ? Math.abs(key)
          : Array.from(String(key)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return FALLBACK_RECIPE_IMAGES[numericKey % FALLBACK_RECIPE_IMAGES.length];
    }
    return FALLBACK_RECIPE_IMAGES[0];
  }

  return FALLBACK_RECIPE_IMAGES[0];
}
