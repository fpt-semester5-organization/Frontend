import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/subscription.api';
import type { CheckoutRequest } from '../types/subscription.types';

export const subscriptionKeys = {
  plans: ['subscription', 'plans'] as const,
  me: ['subscription', 'me'] as const,
};

/** FN-SUB-01 — bảng giá + quyền lợi (công khai). */
export const usePlans = () => useQuery({ queryKey: subscriptionKeys.plans, queryFn: api.listPlans });

/** FN-SUB-04 — trạng thái VIP + lịch sử giao dịch. `pollMs`: bật làm mới định kỳ khi đang chờ cổng xác nhận. */
export const useMySubscription = (opts: { enabled?: boolean; pollMs?: number | false } = {}) =>
  useQuery({
    queryKey: subscriptionKeys.me,
    queryFn: api.getMySubscription,
    enabled: opts.enabled ?? true,
    refetchInterval: opts.pollMs || false,
    // Dữ liệu thanh toán phải luôn mới khi mở trang.
    staleTime: 0,
  });

/** FN-SUB-02 — tạo đơn; sau đó làm mới lịch sử giao dịch. */
export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CheckoutRequest) => api.checkout(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: subscriptionKeys.me }),
  });
}
