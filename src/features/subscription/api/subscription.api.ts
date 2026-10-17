import { http, unwrap } from '@/api/http';
import type { CheckoutRequest, CheckoutResult, MySubscription, PlansResponse } from '../types/subscription.types';

/** FN-SUB-01 — GET /subscription-plans (công khai; Khách dùng Anonymous JWT). */
export async function listPlans(): Promise<PlansResponse> {
  const d = await unwrap<PlansResponse>(http.get('/subscription-plans'));
  return { plans: Array.isArray(d?.plans) ? d.plans : [], benefits: d?.benefits };
}

/** FN-SUB-02 — POST /subscriptions/checkout. Giá do server lấy từ DB; client chỉ gửi planId + gateway. */
export const checkout = (body: CheckoutRequest) => unwrap<CheckoutResult>(http.post('/subscriptions/checkout', body));

/** FN-SUB-04 — GET /users/me/subscription. */
export async function getMySubscription(): Promise<MySubscription> {
  const d = await unwrap<MySubscription>(http.get('/users/me/subscription'));
  return { ...d, transactions: Array.isArray(d?.transactions) ? d.transactions : [] };
}
