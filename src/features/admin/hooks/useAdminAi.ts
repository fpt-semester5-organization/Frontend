import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminAiMetrics,
  getAdminKnowledgeStatus,
  getAdminLlmopsDashboard,
  getAdminLlmopsLogs,
  reindexAdminKnowledge,
} from '../api/admin.api';
import { retryServerErrorsOnce } from '../lib/endpoint';
import type { AiMetricsFilters, KnowledgeScope, LlmopsFilters, LlmopsLogFilters } from '../types/admin.types';

export const aiKeys = {
  all: ['admin', 'ai'] as const,
  llmops: (filters: LlmopsFilters) => [...aiKeys.all, 'llmops', filters] as const,
  llmopsLogs: (filters: LlmopsLogFilters) => [...aiKeys.all, 'llmops-logs', filters] as const,
  metrics: (filters: AiMetricsFilters) => [...aiKeys.all, 'metrics', filters] as const,
  knowledge: ['admin', 'ai', 'knowledge'] as const,
};

/** Chi phí cache 1 phút ở Backend (ai_cost_today): làm mới mỗi phút khi đang mở trang. */
export function useLlmopsDashboard(filters: LlmopsFilters) {
  return useQuery({
    queryKey: aiKeys.llmops(filters),
    queryFn: () => getAdminLlmopsDashboard(filters),
    placeholderData: keepPreviousData,
    refetchInterval: 60 * 1000,
    retry: retryServerErrorsOnce,
  });
}

/** Tra cứu nhật ký AIQuotaLogs phân trang và lọc theo tiêu chí. */
export function useLlmopsLogs(filters: LlmopsLogFilters) {
  return useQuery({
    queryKey: aiKeys.llmopsLogs(filters),
    queryFn: () => getAdminLlmopsLogs(filters),
    placeholderData: keepPreviousData,
    retry: retryServerErrorsOnce,
  });
}

export function useAiMetrics(filters: AiMetricsFilters) {
  return useQuery({
    queryKey: aiKeys.metrics(filters),
    queryFn: () => getAdminAiMetrics(filters),
    placeholderData: keepPreviousData,
    retry: retryServerErrorsOnce,
  });
}

/** Trạng thái Qdrant; còn mục chờ đồng bộ thì tự làm mới 10 giây/lần để thấy tiến độ. */
export function useKnowledgeStatus() {
  return useQuery({
    queryKey: aiKeys.knowledge,
    queryFn: getAdminKnowledgeStatus,
    refetchInterval: (query) => ((query.state.data?.pending ?? 0) > 0 ? 10 * 1000 : false),
    retry: retryServerErrorsOnce,
  });
}

export function useReindexKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scope: KnowledgeScope) => reindexAdminKnowledge(scope),
    onSuccess: () => qc.invalidateQueries({ queryKey: aiKeys.knowledge }),
  });
}
