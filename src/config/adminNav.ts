import { PATHS } from '@/routes/paths';
import type { NavItem } from './nav';

export interface AdminNavItem extends NavItem {
  icon: string;
  /** Mô tả ngắn ở trang tổng quan Admin. */
  description: string;
}

/**
 * Điều hướng khu Admin đầy đủ toàn bộ 12 màn hình (SCR-34 … SCR-45).
 */
export const ADMIN_NAV: AdminNavItem[] = [
  {
    label: 'Tổng quan',
    to: PATHS.ADMIN.ROOT,
    icon: 'space_dashboard',
    end: true,
    description: 'Tổng quan chỉ số người dùng, nội dung và chi phí hệ thống.',
  },
  {
    label: 'Kiểm duyệt',
    to: PATHS.ADMIN.MODERATION,
    icon: 'fact_check',
    also: [PATHS.ADMIN.COMMENT_MODERATION],
    description: 'Xử lý báo cáo vi phạm nội dung và kiểm duyệt bình luận.',
  },
  {
    label: 'Xác minh công thức',
    to: PATHS.ADMIN.RECIPE_VERIFICATION,
    icon: 'verified',
    description: 'Thẩm định và gắn huy hiệu xác minh cho công thức đạt chuẩn.',
  },
  {
    label: 'Danh mục',
    to: PATHS.ADMIN.CATEGORIES,
    icon: 'category',
    description: 'Quản lý cây danh mục ẩm thực, gán món và chuyển nhóm.',
  },
  {
    label: 'Người dùng',
    to: PATHS.ADMIN.USERS,
    icon: 'group',
    description: 'Tra cứu tài khoản, xem vi phạm và xử lý kỷ luật.',
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
    label: 'Quán chay',
    to: PATHS.ADMIN.VENUES,
    icon: 'storefront',
    description: 'Ẩn/hiện quán và đồng bộ từ nguồn dữ liệu.',
  },
  {
    label: 'Gói VIP & đối soát',
    to: PATHS.ADMIN.SUBSCRIPTION_PLANS,
    icon: 'workspace_premium',
    description: 'Giá gói VIP và xử lý giao dịch lỗi.',
  },
  {
    label: 'Giám sát AI',
    to: PATHS.ADMIN.AI,
    icon: 'monitoring',
    description: 'Chi phí token, chất lượng AI và kho tri thức Qdrant.',
  },
  {
    label: 'Nhật ký kiểm toán',
    to: PATHS.ADMIN.AUDIT_LOGS,
    icon: 'history_edu',
    description: 'Nhật ký truy vết các thao tác quản trị và thay đổi hệ thống.',
  },
];
