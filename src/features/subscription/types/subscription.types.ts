/** Kiểu dữ liệu Subscription — đúng tên trường camelCase của openapi.yaml (FN-SUB-01 … FN-SUB-04). */
export type Gateway = 'MOMO' | 'VIETQR';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';

/** FN-SUB-01 · mảng `plans` */
export interface Plan {
  planId: number;
  planName: string;
  durationDays: number;
  priceVnd: number;
  isActive: boolean;
  /** Phiên bản đang bán; ở gói đang dùng (`/subscriptions/me`) là phiên bản lúc mua. */
  version?: number;
  /** Ba hạn mức người mua gói nhận được (D121). Backend cũ không trả thì dùng `benefits.vip` của danh sách. */
  benefits?: { chatLimitDaily: number; mealPlanLimitWeekly: number; fridgeScanLimitDaily: number; barcodeScanLimitDaily?: number } | null;
}

/**
 * Bảng quyền lợi. openapi.yaml khai `vip.chatPerDay` là string|null (ví dụ trả null = "tối đa theo BR"):
 * nhận cả số, chuỗi và null; null hiển thị theo hạn mức BR (QUOTA.chatPerDay.vip).
 */
export interface TierBenefits {
  mealPlansPerWeek?: number;
  chatPerDay?: number | string | null;
  fridgePhotosPerDay?: number;
  barcodeScansPerDay?: number;
}
export interface PlansResponse {
  plans: Plan[];
  benefits?: { free?: TierBenefits; vip?: TierBenefits };
}

/** FN-SUB-02 */
export interface CheckoutRequest {
  planId: number;
  gateway: Gateway;
}
export interface CheckoutResult {
  transactionId: number;
  orderCode: string;
  amountVnd: number;
  payUrl: string;
  expiresAt: string;
}

/**
 * POST /subscriptions/cancel-pending (FN-SUB-02): hủy đơn PENDING mới nhất (tạo trong 5 phút) để đổi gói/cổng.
 * `cancelled = false` là không còn đơn chờ (cổng vừa xác nhận, đơn hết hạn hoặc đã hủy ở trang cổng).
 */
export interface CancelPendingResult {
  cancelled: boolean;
  message: string;
}

/** FN-SUB-04 */
export interface SubscriptionTransaction {
  transactionId: number;
  gateway: string;
  amountVnd: number;
  status: string;
  createdAt: string;
  planName?: string;
  orderCode?: string;
  completedAt?: string | null;
  receiptUrl?: string | null;
  canViewReceipt?: boolean;
  /** Phiên bản gói lúc mua (BR-PAY-SUB-01). */
  planVersion?: number;
}

/**
 * `features` của GET /users/me/subscription: quyền lợi Backend đã phân giải cho chính người dùng.
 * VIP đọc từ bản chụp quyền lợi của giao dịch đang hiệu lực (giữ đúng biên lai dù Admin sửa gói sau đó);
 * Free đọc hạn mức chung trong cấu hình hệ thống.
 */
export interface BenefitFeatures {
  isVip: boolean;
  planVersion?: number;
  planName?: string | null;
  chatLimitDaily: number;
  mealPlanLimitWeekly: number;
  fridgeScanLimitDaily: number;
  barcodeScanLimitDaily?: number;
  description?: string | null;
}
export interface MySubscription {
  isVip: boolean;
  plan?: Plan | null;
  endsAt?: string | null;
  /** Thiếu khi Backend cũ chưa trả: khi đó dùng bảng quyền lợi chung. */
  features?: BenefitFeatures | null;
  transactions: SubscriptionTransaction[];
}

/** FN-SUB-04 · GET /subscriptions/transactions/{transactionId}/receipt */
export interface PaymentReceipt {
  receiptNumber: string;
  transactionId: number;
  orderCode: string;
  gateway: string;
  status: string;
  paymentDate: string;
  userId: number;
  fullName: string;
  email: string;
  planId: number;
  /** Phiên bản gói lúc mua. */
  planVersion?: number;
  planName: string;
  durationDays: number;
  /** Bản chụp quyền lợi lúc mua, dạng chuỗi JSON (chatLimitDaily, mealPlanLimitWeekly, fridgeScanLimitDaily…). */
  snapshotFeaturesJson?: string | null;
  amountVnd: number;
  vipStartsAt: string;
  vipEndsAt: string;
  note: string;
}

export const STATUS_LABEL: Record<TransactionStatus, { text: string; tone: 'ok' | 'wait' | 'bad' }> = {
  PENDING: { text: 'Chờ thanh toán', tone: 'wait' },
  SUCCESS: { text: 'Thành công', tone: 'ok' },
  FAILED: { text: 'Thất bại', tone: 'bad' },
  CANCELLED: { text: 'Đã hủy', tone: 'bad' },
  EXPIRED: { text: 'Hết hạn', tone: 'bad' },
  REFUNDED: { text: 'Đã hoàn tiền', tone: 'wait' },
};

export const statusInfo = (status: string) => STATUS_LABEL[status as TransactionStatus] ?? { text: status, tone: 'wait' as const };
export const GATEWAY_LABEL: Record<string, string> = { MOMO: 'MoMo', VIETQR: 'VietQR' };
