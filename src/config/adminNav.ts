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
    also: [PATHS.ADMIN.DIETARY_SCHOOLS, PATHS.ADMIN.E_NUMBERS, PATHS.ADMIN.INGREDIENTS],
    description: 'Cây danh mục món, trường phái ăn chay, từ điển E-number và nguyên liệu.',
  },
  {
    label: 'Người dùng',
    to: PATHS.ADMIN.USERS,
    icon: 'group',
    description: 'Tra cứu tài khoản, xem vi phạm và xử lý kỷ luật.',
  },
  {
    label: 'Cấu hình hệ thống',
    to: PATHS.ADMIN.SUBSCRIPTION_PLANS,
    icon: 'settings',
    description: 'Cấu hình chỉ số hệ thống, giá gói VIP và lịch sử giao dịch.',
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
