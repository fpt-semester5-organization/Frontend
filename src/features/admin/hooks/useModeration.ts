import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/ui.store';
import * as api from '../api/moderation.api';
import { adminKeys } from '../lib/keys';
import type { ModerationDecisionBody, ModerationQuery } from '../types/admin.types';

export const useModerationQueue = (q: ModerationQuery) =>
  useQuery({ queryKey: adminKeys.moderation(q), queryFn: () => api.listModerationQueue(q), placeholderData: keepPreviousData });

/** Đếm theo nguồn hoặc loại đối tượng bằng `meta.total` của truy vấn size=1 — không có endpoint thống kê riêng. */
export const useModerationCount = (filter?: Partial<ModerationQuery>) =>
  useQuery({
    queryKey: adminKeys.moderation({ count: filter ?? 'all' }),
    queryFn: async () => (await api.listModerationQueue({ ...filter, page: 1, size: 1 })).meta.total,
    staleTime: 30_000,
  });

export function useDecideReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; body: ModerationDecisionBody }) => api.decideReport(v.id, v.body),
    onSuccess: (r) => {
      toast.success(r.message || 'Đã ghi quyết định.');
      void qc.invalidateQueries({ queryKey: adminKeys.moderationAll });
      void qc.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; reason: string }) => api.deleteComment(v.id, v.reason),
    onSuccess: (r) => {
      toast.success(r.message || 'Đã xóa bình luận.');
      void qc.invalidateQueries({ queryKey: adminKeys.moderationAll });
      void qc.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    },
  });
}
