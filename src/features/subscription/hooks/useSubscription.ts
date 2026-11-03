import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorStatus } from '@/api/http';
import { useAuthStore } from '@/stores/auth.store';
import * as api from '../api/subscription.api';
import { refreshVipSessionClaims } from '../lib/sessionClaims';
import type { CheckoutRequest } from '../types/subscription.types';

export const subscriptionKeys = {
  plans: ['subscription', 'plans'] as const,
  me: ['subscription', 'me'] as const,
  receipt: (transactionId: number | null) => ['subscription', 'receipt', transactionId] as const,
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

/** FN-SUB-04 — biên lai của một giao dịch. 400/403/404 là kết quả cố định nên không thử lại. */
export const usePaymentReceipt = (transactionId: number | null) =>
  useQuery({
    queryKey: subscriptionKeys.receipt(transactionId),
    queryFn: () => api.getPaymentReceipt(transactionId as number),
    enabled: transactionId !== null,
    retry: (count, error) => count < 1 && ![400, 403, 404].includes(apiErrorStatus(error) ?? 0),
  });

/** Đồng hồ cho những gì đổi theo thời gian (đếm ngược, đơn quá hạn); chỉ chạy khi `active`. */
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

/**
 * Server báo trạng thái VIP khác phiên hiện tại (vừa thanh toán ở thiết bị khác, vừa hết hạn…): làm mới JWT một lần
 * để `user.role/isVip` và các guard theo đúng server, không phải đăng nhập lại.
 */
export function useVipClaimSync(serverIsVip: boolean | undefined) {
  const userIsVip = useAuthStore((s) => !!s.user?.isVip);
  const tried = useRef(false);
  useEffect(() => {
    if (serverIsVip === undefined || serverIsVip === userIsVip || tried.current) return;
    tried.current = true;
    void refreshVipSessionClaims();
  }, [serverIsVip, userIsVip]);
}

/** Hủy đơn chờ thanh toán (cancel-pending); làm mới lịch sử giao dịch để thấy trạng thái Đã hủy. */
export function useCancelPending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.cancelPendingOrder(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: subscriptionKeys.me }),
  });
}

/** FN-SUB-02 — tạo đơn; sau đó làm mới lịch sử giao dịch. */
export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CheckoutRequest) => api.checkout(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: subscriptionKeys.me }),
  });
}
