import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionKeys } from '@/features/subscription/hooks/useSubscription';
import { createAdminPlan, listAdminPlans, reconcileAdminPayment, updateAdminPlan } from '../api/admin.api';
import { retryServerErrorsOnce } from '../lib/endpoint';
import type { CreatePlanBody, ReconcileBody, UpdatePlanBody } from '../types/admin.types';

export const billingKeys = {
  plans: ['admin', 'subscription-plans'] as const,
};

export function useAdminPlans() {
  return useQuery({ queryKey: billingKeys.plans, queryFn: listAdminPlans, retry: retryServerErrorsOnce });
}

/** Đổi gói thì trang Gói VIP công khai (SCR-30) cũng cần tải lại. */
function useInvalidatePlans() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: billingKeys.plans });
    void qc.invalidateQueries({ queryKey: subscriptionKeys.plans });
  };
}

export function useCreatePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({ mutationFn: (body: CreatePlanBody) => createAdminPlan(body), onSuccess: invalidate });
}

export function useUpdatePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdatePlanBody }) => updateAdminPlan(id, body),
    onSuccess: invalidate,
  });
}

export function useReconcilePayment() {
  return useMutation({
    mutationFn: ({ transactionId, body }: { transactionId: number; body: ReconcileBody }) =>
      reconcileAdminPayment(transactionId, body),
  });
}
