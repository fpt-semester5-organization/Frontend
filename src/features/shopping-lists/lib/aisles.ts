import { formatNumber } from '@/lib/format';
import type { AisleCode, ShoppingListStatus } from '../types/shoppingList.types';

/** 4 quầy hàng (D74), xếp theo thứ tự đi trong chợ/siêu thị. */
export const AISLE_ORDER: AisleCode[] = ['PRODUCE', 'PLANT_PROTEIN', 'DRY_GOODS', 'CONDIMENTS'];

export const AISLE_INFO: Record<AisleCode, { label: string; icon: string }> = {
  PRODUCE: { label: 'Rau củ quả', icon: 'eco' },
  PLANT_PROTEIN: { label: 'Đậu hạt & đạm thực vật', icon: 'nutrition' },
  DRY_GOODS: { label: 'Đồ khô', icon: 'grain' },
  CONDIMENTS: { label: 'Gia vị', icon: 'water_drop' },
};

export const aisleInfo = (code: string) =>
  AISLE_INFO[code as AisleCode] ?? { label: code, icon: 'shopping_basket' };

export const LIST_STATUS: Record<ShoppingListStatus, { label: string; className: string }> = {
  PENDING: { label: 'Đang mua', className: 'bg-warning-container text-warning' },
  COMPLETED: { label: 'Đã hoàn tất', className: 'bg-success-container text-success' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-surface-container text-on-surface-variant' },
};

/** Số lượng đã chuẩn hóa g/ml (BR-USR-13): từ 1.000 trở lên đổi sang kg/l cho dễ đọc. */
export function formatQuantity(quantity: number, unit: string): string {
  const lower = unit.toLowerCase();
  if ((lower === 'g' || lower === 'ml') && quantity >= 1000) {
    return `${formatNumber(Math.round(quantity / 100) / 10)} ${lower === 'g' ? 'kg' : 'l'}`;
  }
  return `${formatNumber(Math.round(quantity * 10) / 10)} ${unit}`;
}
