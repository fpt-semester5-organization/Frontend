import { PATHS } from '@/routes/paths';
import type { NavItem } from './nav';

export interface AdminNavItem extends NavItem {
  icon: string;
  /** Mô tả ngắn ở trang tổng quan Admin. */
  description: string;
}

/**
 * Điều hướng khu Admin: chỉ gồm các màn đã làm. Màn của Leader (SCR-34…38, 40: kiểm duyệt, danh mục,
 * xác minh công thức, tổng quan số liệu, nhật ký) thêm vào đây khi có route.
 */
export const ADMIN_NAV: AdminNavItem[] = [
  {
    label: 'Người dùng',
    to: PATHS.ADMIN.USERS,
    icon: 'group',
    description: 'Tra cứu tài khoản, xem vi phạm và xử lý kỷ luật.',
  },
  {
    label: 'Giám sát AI',
    to: PATHS.ADMIN.AI,
    icon: 'monitoring',
    description: 'Chi phí token, chất lượng AI và kho tri thức Qdrant.',
  },
  {
    label: 'Dữ liệu gốc',
    to: PATHS.ADMIN.DIETARY_SCHOOLS,
    icon: 'eco',
    also: [PATHS.ADMIN.E_NUMBERS],
    description: '07 trường phái ăn chay và từ điển E-number.',
  },
  {
    label: 'Nguyên liệu & dị ứng',
    to: PATHS.ADMIN.INGREDIENTS,
    icon: 'nutrition',
    description: 'Nguyên liệu, nhóm thực phẩm và nhóm dị ứng.',
  },
  {
    label: 'Gói VIP & đối soát',
    to: PATHS.ADMIN.SUBSCRIPTION_PLANS,
    icon: 'workspace_premium',
    description: 'Giá gói VIP và xử lý giao dịch lỗi.',
  },
  {
    label: 'Quán chay',
    to: PATHS.ADMIN.VENUES,
    icon: 'storefront',
    description: 'Ẩn/hiện quán và đồng bộ từ nguồn dữ liệu.',
  },
];
