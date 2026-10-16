import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReport } from '../api/community.api';
import type { ContentRef, CreateReportBody } from '../types/community.types';
import { communityKeys } from './communityKeys';

/**
 * Báo cáo vi phạm (FN-COMM-05) trên trang của một bài viết/công thức (`content`):
 * nội dung bị ẩn ngay nên làm mới danh sách liên quan.
 */
export function useCreateReport(content: ContentRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReportBody) => createReport(body),
    onSuccess: (_data, body) => {
      if (body.targetType === 'COMMENT') {
        queryClient.invalidateQueries({ queryKey: communityKeys.comments(content) });
        queryClient.invalidateQueries({ queryKey: communityKeys.content(content) });
      } else {
        queryClient.removeQueries({ queryKey: communityKeys.content(content) });
        queryClient.invalidateQueries({ queryKey: communityKeys.contentLists(content) });
      }
    },
  });
}
