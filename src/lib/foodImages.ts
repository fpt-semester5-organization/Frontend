/**
 * Tiện ích xử lý ảnh món ăn và công thức VeggieLife:
 * Cung cấp ảnh thay thế (fallback) chất lượng cao từ kho tài nguyên nội bộ (/videos/*.jpg, /images/*.jpg)
 * Đảm bảo 100% không bao giờ bị lỗi hiển thị kể cả khi người dùng bị chặn CDN ngoại, mạng chậm hay link hỏng.
 */

export function getFallbackFoodImage(
  title?: string | null,
  foodName?: string | null,
  categoryName?: string | null
): string {
  const text = `${title ?? ''} ${foodName ?? ''} ${categoryName ?? ''}`.toLowerCase();

  // 1. Món kho, rim, tộ, niêu (Cà tím kho tộ, nấm kho, đậu hũ kho)
  if (
    text.includes('kho') ||
    text.includes('tộ') ||
    text.includes('rim') ||
    text.includes('niêu') ||
    text.includes('cà tím')
  ) {
    return '/videos/clay-pot.jpg';
  }

  // 2. Món xào, nấm, sốt dầu mè, nấm bào ngư, đùi gà xào
  if (
    text.includes('xào') ||
    text.includes('sốt') ||
    text.includes('nấm') ||
    text.includes('bào ngư') ||
    text.includes('đùi gà')
  ) {
    return '/videos/tofu-mushroom.jpg';
  }

  // 3. Món cuốn, gỏi, salad, nộm
  if (
    text.includes('cuốn') ||
    text.includes('gỏi') ||
    text.includes('salad') ||
    text.includes('nộm') ||
    text.includes('bánh tráng')
  ) {
    return '/videos/fresh-rolls.jpg';
  }

  // 4. Món chiên, rán, chả giò, nem, ram giòn
  if (
    text.includes('chiên') ||
    text.includes('rán') ||
    text.includes('chả giò') ||
    text.includes('nem') ||
    text.includes('ram')
  ) {
    return '/videos/spring-rolls.jpg';
  }

  // 5. Món canh, súp, cháo, tiềm, lẩu
  if (
    text.includes('canh') ||
    text.includes('súp') ||
    text.includes('cháo') ||
    text.includes('tiềm') ||
    text.includes('lẩu') ||
    text.includes('rong biển')
  ) {
    return '/videos/seaweed-soup.jpg';
  }

  // 6. Món cơm, xôi, cháy
  if (text.includes('cơm') || text.includes('xôi') || text.includes('cháy')) {
    return '/videos/rice-bowl.jpg';
  }

  // 7. Bún, mì, phở, hủ tiếu, bánh canh
  if (
    text.includes('bún') ||
    text.includes('phở') ||
    text.includes('mì') ||
    text.includes('miến') ||
    text.includes('hủ tiếu') ||
    text.includes('bánh canh')
  ) {
    return '/images/2c71727880.jpg';
  }

  // 8. Đậu hũ, đậu phụ
  if (text.includes('đậu hũ') || text.includes('đậu phụ')) {
    return '/videos/braised-tofu.jpg';
  }

  // Mặc định món chay thơm ngon
  return '/videos/clay-pot.jpg';
}

