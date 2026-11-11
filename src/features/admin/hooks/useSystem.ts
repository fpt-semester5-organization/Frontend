import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/ui.store';
import * as api from '../api/system.api';
import { adminKeys } from '../lib/keys';
import type { AuditQuery, DateRange, KnowledgeScope, PlanCreateBody, PlanUpdateBody, ReconcileBody } from '../types/admin.types';

const auditStale = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });

/* ---- Gói VIP & đối soát ---- */
export const useAdminPlans = () => useQuery({ queryKey: adminKeys.plans, queryFn: api.listAdminPlans });

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: PlanCreateBody) => api.createPlan(b),
    onSuccess: (r) => {
      toast.success(r.message || 'Đã tạo gói.');
      void qc.invalidateQueries({ queryKey: adminKeys.plans });
      void qc.invalidateQueries({ queryKey: ['subscription', 'plans'] });
      void auditStale(qc);
    },
  });
}
export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; body: PlanUpdateBody }) => api.updatePlan(v.id, v.body),
    onSuccess: (r) => {
      toast.success(r.message || 'Đã cập nhật gói.');
      void qc.invalidateQueries({ queryKey: adminKeys.plans });
      void qc.invalidateQueries({ queryKey: ['subscription', 'plans'] });
      void auditStale(qc);
    },
  });
}
export function useReconcilePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; body: ReconcileBody }) => api.reconcilePayment(v.id, v.body),
    onSuccess: (r) => {
      toast.success(r.message || 'Đã đối soát giao dịch.');
      void auditStale(qc);
      void qc.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
  });
}

/* ---- Nhật ký, thống kê ---- */
export const useAuditLogs = (q: AuditQuery) =>
  useQuery({
    queryKey: adminKeys.audit(q),
    queryFn: async () => (await api.listAuditLogs(q)) ?? { items: [], meta: { page: q.page, size: q.size, total: 0 } },
    placeholderData: keepPreviousData,
  });

export const useAnalyticsOverview = (q: DateRange) =>
  useQuery({
    queryKey: adminKeys.analytics(q),
    queryFn: async () => (await api.getAnalyticsOverview(q)) ?? null,
    placeholderData: keepPreviousData,
  });

/* ---- AI / LLMOps / kho tri thức ---- */
export const useAiMetrics = (q: DateRange & { module?: string }) =>
  useQuery({
    queryKey: adminKeys.aiMetrics(q),
    queryFn: async () => (await api.getAiMetrics(q)) ?? null,
    placeholderData: keepPreviousData,
  });

export const useLlmops = (q: DateRange & { groupBy?: 'DAY' | 'FEATURE' }) =>
  useQuery({
    queryKey: adminKeys.llmops(q),
    queryFn: async () => (await api.getLlmopsDashboard(q)) ?? null,
    placeholderData: keepPreviousData,
    // Backend cache LLMOps 1 phút: tự làm mới để biểu đồ chi phí theo giờ cập nhật khi đang mở trang
    refetchInterval: 60 * 1000,
  });

/** Tự làm mới 3 giây/lần khi còn mục chờ đồng bộ (`pending > 0`) hoặc vừa kích hoạt job. */
export const useKnowledgeStatus = (watchJob: boolean) =>
  useQuery({
    queryKey: adminKeys.knowledge,
    queryFn: async () => (await api.getKnowledgeStatus()) ?? null,
    refetchInterval: (query) => (watchJob || (query.state.data?.pending ?? 0) > 0 ? 3000 : false),
  });

export function useReindexKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scope: KnowledgeScope) => api.reindexKnowledge(scope),
    onSuccess: (r) => {
      toast.success(r.message || 'Đã bắt đầu đồng bộ kho tri thức.');
      void qc.invalidateQueries({ queryKey: adminKeys.knowledge });
      void auditStale(qc);
    },
  });
}
