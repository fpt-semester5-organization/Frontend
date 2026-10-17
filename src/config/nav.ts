import { PATHS } from '@/routes/paths';

export interface NavItem {
  label: string;
  to: string;
  /** Tên icon Material Symbols. */
  icon?: string;
  /** Chỉ hiện trong menu di động (logo đã là đường về trang chủ trên desktop). */
  mobileOnly?: boolean;
  /** Chỉ active khi trùng khớp tuyệt đối. */
  end?: boolean;
  /** Các tiền tố route khác cũng tính là đang ở mục này. */
  also?: string[];
}

/** Điều hướng chính của Khách / Thành viên / VIP (route theo UI Screen Specification). */
export const MAIN_NAV: NavItem[] = [
  { label: 'Trang chủ', to: PATHS.HOME, end: true, mobileOnly: true },
  { label: 'Công thức', to: PATHS.RECIPES.ROOT },
  { label: 'Tủ lạnh AI', to: PATHS.FRIDGE },
  { label: 'Thực đơn', to: PATHS.MEAL_PLANS.ROOT, also: ['/shopping-lists'] },
  { label: 'Quán chay', to: PATHS.VENUES.ROOT },
  { label: 'Mã vạch', to: PATHS.SCANNER.ROOT },
  { label: 'Cộng đồng', to: PATHS.COMMUNITY.ROOT },
  { label: 'Trợ lý AI', to: PATHS.CHAT.ROOT },
  { label: 'Gói VIP', to: PATHS.SUBSCRIPTION.PRICING },
];

/** Menu tài khoản (bấm avatar). */
export const ACCOUNT_NAV: NavItem[] = [
  { label: 'Hồ sơ của tôi', to: PATHS.ME.PROFILE, icon: 'person' },
  { label: 'Hồ sơ sức khỏe', to: PATHS.ME.HEALTH, icon: 'monitor_heart' },
  { label: 'Sở thích ăn uống & dị ứng', to: PATHS.ME.DIETARY_PREFERENCES, icon: 'nutrition' },
  { label: 'Nội dung của tôi', to: PATHS.ME.CONTENT(), icon: 'library_books' },
  { label: 'Lịch sử quét mã vạch', to: PATHS.SCANNER.HISTORY, icon: 'history' },
  { label: 'Gói thành viên của tôi', to: PATHS.ME.SUBSCRIPTION, icon: 'workspace_premium' },
  { label: 'Đổi mật khẩu', to: PATHS.AUTH.CHANGE_PASSWORD, icon: 'lock_reset' },
];

export const isNavActive = (item: NavItem, pathname: string): boolean => {
  if (item.end) return pathname === item.to;
  const match = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  return match(item.to) || (item.also ?? []).some(match);
};
