import type { CheckoutResult, Gateway } from '../types/subscription.types';

/**
 * Đơn thanh toán đang chờ, lưu ở sessionStorage ngay sau khi tạo (trước khi chuyển sang cổng) để trang kết quả
 * biết `transactionId` cần theo dõi. Chỉ là tiện ích hiển thị — trạng thái thật luôn lấy từ GET /users/me/subscription.
 */
export interface PendingOrder extends CheckoutResult {
  planId: number;
  planName: string;
  gateway: Gateway;
  userId: number;
}

const KEY = 'vl_pending_order';

export function savePendingOrder(order: PendingOrder) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    /* sessionStorage bị chặn: trang kết quả sẽ rơi về giao dịch mới nhất */
  }
}

export function readPendingOrder(userId?: number): PendingOrder | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as PendingOrder;
    if (typeof o.transactionId !== 'number' || (userId !== undefined && o.userId !== userId)) return null;
    return o;
  } catch {
    return null;
  }
}

export function clearPendingOrder() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* bỏ qua */
  }
}

/** Chỉ cho phép chuyển hướng tới http(s) — không tin chuỗi lạ (javascript:, data:…) từ phản hồi cổng. */
export function safePayUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** payUrl của VietQR có thể là ảnh QR (spec chưa nói rõ): chỉ coi là ảnh khi có đuôi ảnh hoặc là data:image. */
export function isQrImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(url)) return true;
  const safe = safePayUrl(url);
  return !!safe && /\.(png|jpe?g|gif|webp|svg)$/i.test(new URL(safe).pathname);
}
