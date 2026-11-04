import { parseServerDate } from '@/lib/serverDate';
import { storage } from '@/lib/storage';
import type { CheckoutResult, Gateway, SubscriptionTransaction } from '../types/subscription.types';

/**
 * Đơn thanh toán đang chờ, lưu ở localStorage ngay sau khi tạo (trước khi chuyển sang cổng) để trang kết quả
 * biết `transactionId` cần theo dõi. Không dùng sessionStorage vì trang cổng mở ở tab mới và quay về ngay trong tab đó.
 * Chỉ là tiện ích hiển thị — trạng thái thật luôn lấy từ GET /users/me/subscription.
 */
export interface PendingOrder extends CheckoutResult {
  planId: number;
  planName: string;
  gateway: Gateway;
  userId: number;
}

const KEY = 'vl_pending_order';

/** Đơn chờ có hiệu lực 5 phút kể từ lúc tạo (BR-PAY-TXN-01). */
const ORDER_TTL_MS = 5 * 60 * 1000;

/**
 * Trạng thái hiển thị của giao dịch. Server chuyển PENDING sang EXPIRED chậm (job quét mỗi phút, GET /users/me/subscription
 * còn cache cả danh sách 5 phút) nên quá 5 phút mà server vẫn báo PENDING thì hiển thị Hết hạn.
 * Chỉ áp dụng cho PENDING: mọi trạng thái khác, nhất là SUCCESS, luôn theo server.
 */
export function displayStatus(tx: Pick<SubscriptionTransaction, 'status' | 'createdAt'>, now: number): string {
  if (tx.status !== 'PENDING') return tx.status;
  const createdAt = parseServerDate(tx.createdAt)?.getTime();
  return createdAt !== undefined && now >= createdAt + ORDER_TTL_MS ? 'EXPIRED' : 'PENDING';
}

/** Số giây còn lại của đơn theo `expiresAt` của server; 0 là đã hết hạn. */
export function secondsLeft(expiresAt: string, now: number): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
}

export const formatCountdown = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

/** Storage bị chặn thì không lưu được: trang kết quả sẽ rơi về giao dịch mới nhất. */
export function savePendingOrder(order: PendingOrder) {
  storage.set(KEY, JSON.stringify(order));
}

export function readPendingOrder(userId?: number): PendingOrder | null {
  try {
    const raw = storage.get(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as PendingOrder;
    if (typeof o.transactionId !== 'number' || (userId !== undefined && o.userId !== userId)) return null;
    return o;
  } catch {
    return null;
  }
}

export function clearPendingOrder() {
  storage.remove(KEY);
}

/** Mã đơn cổng gắn trên URL có phải đơn này không: PayOS trả phần số của orderCode (VL_1793516377203 → 1793516377203). */
export function isSameOrder(order: PendingOrder, gatewayOrder: string | null | undefined): boolean {
  if (!gatewayOrder) return false;
  return gatewayOrder === order.orderCode || gatewayOrder === order.orderCode.replace(/\D/g, '');
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

const PAYOS_CHECKOUT_HOSTS = ['pay.payos.vn', 'next.pay.payos.vn', 'dev.pay.payos.vn', 'next.dev.pay.payos.vn'];

/**
 * payUrl là trang thanh toán PayOS (https://pay.payos.vn/web/{id}) thì nhúng được vào iframe để hiện mã QR ngay trong trang.
 * Chỉ nhúng đúng các host của PayOS, không nhúng URL lạ. Không dùng chế độ /embedded/ vì PayOS bắt `redirect_uri` phải trùng
 * ReturnUrl của đơn do Backend đặt, sai là báo "Thông tin truyền lên không hợp lệ".
 */
export function payosCheckoutUrl(url: string | undefined | null): string | null {
  const safe = safePayUrl(url);
  if (!safe) return null;
  const u = new URL(safe);
  return u.protocol === 'https:' && PAYOS_CHECKOUT_HOSTS.includes(u.hostname) && /^\/web\/[^/]+\/?$/.test(u.pathname) ? safe : null;
}

/** payUrl của VietQR có thể là ảnh QR (spec chưa nói rõ): chỉ coi là ảnh khi có đuôi ảnh hoặc là data:image. */
export function isQrImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(url)) return true;
  const safe = safePayUrl(url);
  return !!safe && /\.(png|jpe?g|gif|webp|svg)$/i.test(new URL(safe).pathname);
}
