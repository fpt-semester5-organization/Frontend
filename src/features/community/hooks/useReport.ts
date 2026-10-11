import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReport } from '../api/community.api';
import type { CreateReportBody } from '../types/community.types';
import { communityKeys } from './communityKeys';

/** Báo cáo vi phạm (FN-COMM-05): nội dung bị ẩn ngay nên làm mới danh sách liên quan. */
export function useCreateReport(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReportBody) => createReport(body),
    onSuccess: (_data, body) => {
      if (body.targetType === 'COMMENT') {
        queryClient.invalidateQueries({ queryKey: communityKeys.comments(postId) });
        queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) });
      } else {
        queryClient.removeQueries({ queryKey: communityKeys.post(postId) });
        queryClient.invalidateQueries({ queryKey: communityKeys.postLists() });
      }
    },
  });
}
