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
}

/**
 * Bảng quyền lợi. openapi.yaml khai `vip.chatPerDay` là string|null (ví dụ trả null = "tối đa theo BR"):
 * nhận cả số, chuỗi và null; null hiển thị theo hạn mức BR (QUOTA.chatPerDay.vip).
 */
export interface TierBenefits {
  mealPlansPerWeek?: number;
  chatPerDay?: number | string | null;
  fridgePhotosPerDay?: number;
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

/** FN-SUB-04 */
export interface SubscriptionTransaction {
  transactionId: number;
  gateway: string;
  amountVnd: number;
  status: string;
  createdAt: string;
}
export interface MySubscription {
  isVip: boolean;
  plan?: Plan | null;
  endsAt?: string | null;
  transactions: SubscriptionTransaction[];
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
