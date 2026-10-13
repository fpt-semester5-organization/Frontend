import { PATHS } from '@/routes/paths';

export interface NavItem {
  label: string;
  to: string;
  icon?: string;
  /** Chỉ hiện trong menu di động (logo đã là đường về trang chủ trên desktop). */
  mobileOnly?: boolean;
  /** Chỉ active khi trùng khớp tuyệt đối. */
  end?: boolean;
  /** Các tiền tố route cũng được coi là đang ở mục này. */
  also?: string[];
  badge?: string;
}

/** Điều hướng chính của Khách / Thành viên / VIP — dùng chung cho 33 màn có MainLayout. */
export const MAIN_NAV: NavItem[] = [
  { label: 'Trang chủ', to: PATHS.HOME, end: true, mobileOnly: true },
  { label: 'Công thức', to: PATHS.RECIPES.ROOT },
  { label: 'Tủ lạnh AI', to: PATHS.FRIDGE },
  { label: 'Thực đơn', to: PATHS.MEAL_PLANS.ROOT, also: ['/shopping-lists'] },
  { label: 'Quán chay', to: PATHS.VENUES.ROOT },
  { label: 'Mã vạch', to: PATHS.SCANNER.ROOT },
  { label: 'Cộng đồng', to: PATHS.COMMUNITY.ROOT },
  { label: 'Trợ lý AI', to: PATHS.CHAT.ROOT },
  { label: 'Gói VIP', to: PATHS.VIP.ROOT },
];

/** Menu tài khoản (avatar). */
export const ACCOUNT_NAV: NavItem[] = [
  { label: 'Hồ sơ của tôi', to: PATHS.ME.ROOT, icon: 'person' },
  { label: 'Hồ sơ sức khỏe', to: PATHS.ME.HEALTH, icon: 'monitor_heart' },
  { label: 'Sở thích ăn uống & dị ứng', to: PATHS.ME.DIETARY, icon: 'nutrition' },
  { label: 'Công thức của tôi', to: PATHS.ME.RECIPES, icon: 'menu_book' },
  { label: 'Bài viết của tôi', to: PATHS.ME.POSTS, icon: 'article' },
  { label: 'Lịch sử quét mã vạch', to: PATHS.SCANNER.HISTORY, icon: 'history' },
  { label: 'Gói thành viên của tôi', to: PATHS.ME.SUBSCRIPTION, icon: 'workspace_premium' },
  { label: 'Đổi mật khẩu', to: PATHS.AUTH.CHANGE_PASSWORD, icon: 'lock_reset' },
];

/** Sidebar quản trị — 12 mục, một mục / màn Admin (SCR-34 … SCR-45 + Dashboard). */
export const ADMIN_NAV: NavItem[] = [
  { label: 'Tổng quan', to: PATHS.ADMIN.ROOT, icon: 'space_dashboard', end: true },
  { label: 'Kiểm duyệt', to: PATHS.ADMIN.MODERATION, icon: 'fact_check', end: true },
  { label: 'Bình luận', to: PATHS.ADMIN.COMMENTS, icon: 'rate_review' },
  { label: 'Xác minh công thức', to: PATHS.ADMIN.RECIPE_VERIFICATION, icon: 'verified' },
  { label: 'Danh mục', to: PATHS.ADMIN.CATEGORIES, icon: 'category' },
  { label: 'Người dùng', to: PATHS.ADMIN.USERS, icon: 'group' },
  { label: 'Trường phái & E-Number', to: PATHS.ADMIN.DIETARY_SCHOOLS, icon: 'spa', also: [PATHS.ADMIN.E_NUMBERS] },
  { label: 'Nguyên liệu', to: PATHS.ADMIN.INGREDIENTS, icon: 'egg_alt' },
  { label: 'Quán chay', to: PATHS.ADMIN.VENUES, icon: 'storefront' },
  { label: 'Gói VIP & giao dịch', to: PATHS.ADMIN.SUBSCRIPTION_PLANS, icon: 'loyalty' },
  { label: 'Giám sát AI', to: PATHS.ADMIN.AI, icon: 'psychology' },
  { label: 'Nhật ký kiểm toán', to: PATHS.ADMIN.AUDIT_LOGS, icon: 'history_edu' },
];

export const isNavActive = (item: NavItem, pathname: string): boolean => {
  if (item.end) return pathname === item.to;
  const match = (p: string) => pathname === p || pathname.startsWith(p + '/');
  return match(item.to) || (item.also ?? []).some(match);
};
