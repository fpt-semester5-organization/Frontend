import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionKeys } from '@/features/subscription/hooks/useSubscription';
import {
  approveAdminPayment,
  createAdminPlan,
  deleteAdminPlan,
  listAdminPayments,
  listAdminPlans,
  reconcileAdminPayment,
  updateAdminPlan,
} from '../api/admin.api';
import { retryServerErrorsOnce } from '../lib/endpoint';
import type { AdminPaymentFilters, CreatePlanBody, ReconcileBody, UpdatePlanBody } from '../types/admin.types';

export const billingKeys = {
  plans: ['admin', 'subscription-plans'] as const,
  payments: (filters?: AdminPaymentFilters) => ['admin', 'payments', filters ?? {}] as const,
  paymentsAll: ['admin', 'payments'] as const,
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

export function useDeletePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (id: number) => deleteAdminPlan(id),
    onSuccess: invalidate,
  });
}

export function useAdminPayments(filters: AdminPaymentFilters) {
  return useQuery({
    queryKey: billingKeys.payments(filters),
    queryFn: () => listAdminPayments(filters),
    retry: retryServerErrorsOnce,
  });
}

export function useApprovePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: number) => approveAdminPayment(transactionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.paymentsAll });
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useReconcilePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, body }: { transactionId: number; body: ReconcileBody }) =>
      reconcileAdminPayment(transactionId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.paymentsAll });
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
