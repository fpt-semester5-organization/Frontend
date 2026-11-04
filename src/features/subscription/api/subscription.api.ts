import { http, unwrap } from '@/api/http';
import type { ApiEnvelope } from '@/api/types';
import type { CancelPendingResult, CheckoutRequest, CheckoutResult, MySubscription, PaymentReceipt, PlansResponse } from '../types/subscription.types';

/** FN-SUB-01 — GET /subscription-plans (công khai; Khách dùng Anonymous JWT). */
export async function listPlans(): Promise<PlansResponse> {
  const d = await unwrap<PlansResponse>(http.get('/subscription-plans'));
  return { plans: Array.isArray(d?.plans) ? d.plans : [], benefits: d?.benefits };
}

/** FN-SUB-02 — POST /subscriptions/checkout. Giá do server lấy từ DB; client chỉ gửi planId + gateway. */
export const checkout = (body: CheckoutRequest) => unwrap<CheckoutResult>(http.post('/subscriptions/checkout', body));

/**
 * POST /subscriptions/cancel-pending — giải phóng đơn chờ thanh toán để tạo đơn mới ngay (không phải chờ hết 5 phút).
 * Backend chỉ đổi trạng thái đơn trong CSDL, không hủy liên kết thanh toán ở cổng.
 */
export async function cancelPendingOrder(): Promise<CancelPendingResult> {
  const body = (await http.post<ApiEnvelope<Partial<CancelPendingResult> | null>>('/subscriptions/cancel-pending')).data;
  return { cancelled: body.data?.cancelled === true, message: body.data?.message || body.message || '' };
}

/** FN-SUB-04 — GET /users/me/subscription. */
export async function getMySubscription(): Promise<MySubscription> {
  const d = await unwrap<MySubscription>(http.get('/users/me/subscription'));
  return { ...d, transactions: Array.isArray(d?.transactions) ? d.transactions : [] };
}

/** FN-SUB-04 — GET /subscriptions/transactions/{transactionId}/receipt.pdf: tệp PDF do Backend dựng (cần Bearer nên tải bằng blob). */
export async function downloadReceiptPdf(transactionId: number, fileName: string): Promise<void> {
  const res = await http.get<Blob>(`/subscriptions/transactions/${transactionId}/receipt.pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** FN-SUB-04 — GET /subscriptions/transactions/{transactionId}/receipt (JSON, chỉ giao dịch SUCCESS của chính người dùng). */
export const getPaymentReceipt = (transactionId: number) =>
  unwrap<PaymentReceipt>(http.get(`/subscriptions/transactions/${transactionId}/receipt`));
