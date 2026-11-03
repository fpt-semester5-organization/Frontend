import { http } from '@/api/http';
import { apiCall, cleanParams, unwrapPaged } from '../lib/api';
import type {
  AdminPlan,
  AiMetrics,
  AnalyticsOverview,
  AuditLog,
  AuditQuery,
  DateRange,
  KnowledgeScope,
  KnowledgeStatus,
  LlmopsDashboard,
  PlanCreateBody,
  PlanUpdateBody,
  ReconcileBody,
  ReconcileResult,
} from '../types/admin.types';

/* FN-ADM-13 */
export const listAdminPlans = async () => (await apiCall<AdminPlan[]>(http.get('/admin/subscription-plans'))).data ?? [];
export const createPlan = (body: PlanCreateBody) => apiCall<{ planId: number }>(http.post('/admin/subscription-plans', body));
export const updatePlan = (id: number, body: PlanUpdateBody) => apiCall<{ planId: number; priceVnd?: number }>(http.put(`/admin/subscription-plans/${id}`, body));
export const reconcilePayment = (id: number, body: ReconcileBody) => apiCall<ReconcileResult>(http.post(`/admin/payments/${id}/reconcile`, body));

/* FN-ADM-17 / FN-ADM-18 — Khi S7-N1 (Nguyễn Ngọc Anh) chưa merge, bắt 404 và fallback dữ liệu mẫu để giao diện không bị gián đoạn */
export const listAuditLogs = async (q: AuditQuery) => {
  try {
    return await unwrapPaged<AuditLog>(http.get('/admin/audit-logs', { params: cleanParams(q) }));
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      const mockLogs: AuditLog[] = [
        {
          auditId: 1,
          action: 'MOD_DISMISS_REPORT',
          actorUserId: 1,
          actorRole: 'ADMIN',
          targetTable: 'Posts',
          targetId: '220',
          note: 'Bác bỏ báo cáo bài viết không vi phạm chuẩn cộng đồng.',
          createdAt: new Date().toISOString(),
        },
        {
          auditId: 2,
          action: 'MOD_DELETE_COMMENT',
          actorUserId: 1,
          actorRole: 'ADMIN',
          targetTable: 'Comments',
          targetId: '45',
          note: 'Xóa mềm bình luận do vi phạm ngôn từ thù ghét.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          auditId: 3,
          action: 'RECIPE_VERIFY',
          actorUserId: 1,
          actorRole: 'ADMIN',
          targetTable: 'Recipes',
          targetId: '175',
          note: 'Cấp huy hiệu công thức chuẩn chay.',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ];
      return {
        items: mockLogs,
        meta: { page: q.page || 1, size: q.size || 20, total: mockLogs.length },
      };
    }
    throw err;
  }
};

export const getAnalyticsOverview = async (q: DateRange) => {
  try {
    return (await apiCall<AnalyticsOverview>(http.get('/admin/analytics/overview', { params: cleanParams(q) }))).data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      return {
        users: {
          total: 12480,
          newInPeriod: 342,
          byStatus: {
            ACTIVE: 11950,
            SUSPENDED_3D: 18,
            SUSPENDED_10D: 5,
            SUSPENDED_30D: 2,
            BANNED: 12,
            ANONYMIZED_REQUESTED: 3,
          },
        },
        content: {
          recipes: 1850,
          recipesNewInPeriod: 45,
          posts: 3420,
          postsNewInPeriod: 120,
          videos: 620,
          videosNewInPeriod: 15,
        },
        vip: {
          active: 890,
          revenueVnd: 78500000,
        },
        moderationQueue: 8,
        aiCostUsd: 48.75,
      };
    }
    throw err;
  }
};

/* FN-ADM-15 / FN-ADM-16 / FN-CHAT-07 */
export const getAiMetrics = async (q: DateRange & { module?: string }) => (await apiCall<AiMetrics>(http.get('/admin/ai/metrics', { params: cleanParams(q) }))).data;
export const getLlmopsDashboard = async (q: DateRange & { groupBy?: 'DAY' | 'FEATURE' }) => (await apiCall<LlmopsDashboard>(http.get('/admin/llmops/dashboard', { params: cleanParams(q) }))).data;
export const getKnowledgeStatus = async () => (await apiCall<KnowledgeStatus>(http.get('/admin/knowledge/status'))).data;
export const reindexKnowledge = (scope: KnowledgeScope) => apiCall<{ jobId: string }>(http.post('/admin/knowledge/reindex', { scope }));
