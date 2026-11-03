import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAdminNutritionDocument,
  getAdminAiMetrics,
  getAdminKnowledgeStatus,
  getAdminLlmopsDashboard,
  getAdminLlmopsLogs,
  listAdminAiSurveys,
  listAdminNutritionDocuments,
  reindexAdminKnowledge,
  updateAdminNutritionDocumentStatus,
  uploadAdminNutritionDocument,
} from '../api/admin.api';
import { retryServerErrorsOnce } from '../lib/endpoint';
import type {
  AdminSurveyFilters,
  AiMetricsFilters,
  KnowledgeScope,
  LlmopsFilters,
  LlmopsLogFilters,
  UploadNutritionDocumentPayload,
} from '../types/admin.types';

export const aiKeys = {
  all: ['admin', 'ai'] as const,
  llmops: (filters: LlmopsFilters) => [...aiKeys.all, 'llmops', filters] as const,
  llmopsLogs: (filters: LlmopsLogFilters) => [...aiKeys.all, 'llmops-logs', filters] as const,
  metrics: (filters: AiMetricsFilters) => [...aiKeys.all, 'metrics', filters] as const,
  knowledge: ['admin', 'ai', 'knowledge'] as const,
  documents: ['admin', 'ai', 'knowledge', 'documents'] as const,
  surveys: (filters: AdminSurveyFilters) => [...aiKeys.all, 'surveys', filters] as const,
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

/** Trạng thái Qdrant; tự động làm mới khi có cờ isPolling hoặc khi còn mục pending. */
export function useKnowledgeStatus(isPolling: boolean = false) {
  return useQuery({
    queryKey: aiKeys.knowledge,
    queryFn: getAdminKnowledgeStatus,
    refetchInterval: (query) => {
      if (isPolling) return 4000;
      return (query.state.data?.pending ?? 0) > 0 ? 10 * 1000 : false;
    },
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

/** Danh sách tài liệu dinh dưỡng PDF trong Qdrant Vector DB. */
export function useNutritionDocuments() {
  return useQuery({
    queryKey: aiKeys.documents,
    queryFn: listAdminNutritionDocuments,
    retry: retryServerErrorsOnce,
  });
}

/** Tải lên tệp tài liệu PDF và vector hoá vào Qdrant. */
export function useUploadNutritionDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UploadNutritionDocumentPayload) => uploadAdminNutritionDocument(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiKeys.documents });
      qc.invalidateQueries({ queryKey: aiKeys.knowledge });
    },
  });
}

/** Bật/tắt trạng thái sử dụng tài liệu dinh dưỡng cho Chatbot RAG. */
export function useUpdateNutritionDocumentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdminNutritionDocumentStatus(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiKeys.documents });
      qc.invalidateQueries({ queryKey: aiKeys.knowledge });
    },
  });
}

/** Xóa tài liệu khỏi Vector DB. */
export function useDeleteNutritionDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminNutritionDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiKeys.documents });
      qc.invalidateQueries({ queryKey: aiKeys.knowledge });
    },
  });
}

/** Danh sách khảo sát phản hồi người dùng cho Chatbot AI phân trang và lọc theo tiêu chí. */
export function useAiSurveys(filters: AdminSurveyFilters) {
  return useQuery({
    queryKey: aiKeys.surveys(filters),
    queryFn: () => listAdminAiSurveys(filters),
    placeholderData: keepPreviousData,
    retry: retryServerErrorsOnce,
  });
}

