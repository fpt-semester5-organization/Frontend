import type { DetectedItem, FridgeBatchItem, FridgeBatchSaveResult } from '../types/fridge.types';

/** Nhận diện đồ mặn (thịt, cá, hải sản, đồ chế biến từ thịt) để không lưu vào tủ lạnh chay. */
export function isNonVegetarianMeat(item: { name: string; foodGroup?: string | null; isRedMeat?: boolean }): boolean {
  const name = (item.name || '').toLowerCase().trim();
  if (
    name.includes('chay') ||
    name.includes('thực vật') ||
    name.includes('thuần chay') ||
    name.includes('vegan') ||
    name.includes('plant-based') ||
    name.includes('non-dairy')
  ) {
    return false;
  }
  // Trứng, sữa, nước uống, bánh ngọt KHÔNG PHẢI là đồ ăn mặn / thịt cá
  if (
    name.includes('trứng') || name.includes('hột gà') || name.includes('hột vịt') ||
    name.includes('sữa') || name.includes('kem') || name.includes('phô mai') || name.includes('bơ') ||
    name.includes('nước') || name.includes('trà') || name.includes('bánh')
  ) {
    return false;
  }
  if (item.isRedMeat) return true;
  const fg = (item.foodGroup || '').toUpperCase().trim();
  if (
    fg.includes('RED_MEAT') || fg.includes('THỊT ĐỎ') ||
    fg.includes('MEAT') || fg.includes('THỊT') ||
    fg.includes('POULTRY') || fg.includes('GIA CẦM') ||
    fg.includes('SEAFOOD') || fg.includes('HẢI SẢN') ||
    fg.includes('THỦY HẢI SẢN') || fg.includes('FISH') || fg.includes('CÁ')
  ) {
    return true;
  }
  const meatKeywords = [
    'thịt', 'bò', 'heo', 'lợn', 'gà', 'vịt', 'ngan', 'ngỗng', 'cừu', 'dê', 'bê',
    'ba rọi', 'ba chỉ', 'sườn non', 'sườn heo', 'sườn bò', 'xương heo', 'xương bò',
    'bò bít tết', 'beefsteak', 'beef', 'pork', 'chicken',
    'cá ', 'cá hồi', 'cá thu', 'cá chép', 'cá lóc', 'cá tra', 'cá basa', 'cá ngừ', 'cá đuối', 'cá trích',
    'tôm', 'cua', 'ghẹ', 'mực', 'bạch tuộc', 'hàu', 'sò', 'nghêu', 'ốc', 'sứa', 'hải sản',
    'chả cá', 'chả lụa', 'giò lụa', 'xúc xích', 'lạp xưởng', 'pate gan', 'mỡ heo',
    'giăm bông', 'jambon', 'thịt nguội', 'salami', 'bacon', 'ham ', 'sausage',
  ];
  return meatKeywords.some((k) => name.includes(k));
}

/**
 * Dựng danh sách gửi POST /fridge/items/batch từ kết quả nhận diện (bỏ đồ mặn).
 * Không gộp ở đây: backend gộp theo nguyên liệu và cộng dồn số lượng trong một giao dịch (D123).
 */
export function toBatchItems(
  detectedItems: DetectedItem[],
  getThumbnail: (name: string) => string | null = () => null,
): FridgeBatchItem[] {
  return detectedItems
    .filter((item) => !isNonVegetarianMeat(item))
    .map((item) => ({
      ingredientId: item.ingredientId ?? undefined,
      customItemName: item.quantity ? `${item.name} (${item.quantity})` : item.name,
      freshnessStatus: item.freshnessStatus,
      thumbnailUrl: item.thumbnailUrl || getThumbnail(item.name) || undefined,
    }));
}

/**
 * Câu thông báo kết quả lưu dựa trên số liệu backend trả về (không đếm theo số yêu cầu đã gửi).
 * `clientSkipped`: số món đồ mặn đã lọc ở client, không gửi lên nên backend không đếm.
 */
export function formatSaveSummary(result: FridgeBatchSaveResult, detectedCount: number, clientSkipped = 0): string {
  const stored = result.created + result.updated;
  const skipped = result.skipped + clientSkipped;
  const merged = detectedCount - skipped;
  const parts = [`Đã lưu ${stored} nguyên liệu vào tủ lạnh`];
  if (merged > stored) parts[0] += ` (gộp từ ${merged} món nhận diện)`;
  const extras: string[] = [];
  if (result.updated > 0) extras.push(`${result.updated} món đã có sẵn được cập nhật`);
  if (skipped > 0) extras.push(`${skipped} món đồ mặn bị bỏ qua`);
  return extras.length > 0 ? `${parts[0]}; ${extras.join(', ')}.` : `${parts[0]}.`;
}
