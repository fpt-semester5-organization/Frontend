import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAdminUserContents, listAdminUsers, updateAdminUserStatus } from '../api/admin.api';
import { retryServerErrorsOnce } from '../lib/endpoint';
import type { AdminUserContentsFilters, AdminUserFilters, UpdateUserStatusBody } from '../types/admin.types';

export const adminUserKeys = {
  all: ['admin', 'users'] as const,
  list: (filters: AdminUserFilters) => [...adminUserKeys.all, 'list', filters] as const,
  contents: (userId: number, filters: AdminUserContentsFilters) => [...adminUserKeys.all, 'contents', userId, filters] as const,
};

/** GET /admin/users; đổi trang/bộ lọc giữ dữ liệu cũ (mờ) thay vì nháy skeleton. */
export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({
    queryKey: adminUserKeys.list(filters),
    queryFn: () => listAdminUsers(filters),
    placeholderData: keepPreviousData,
    retry: retryServerErrorsOnce,
  });
}

export function useAdminUserContents(userId: number, filters: AdminUserContentsFilters) {
  return useQuery({
    queryKey: adminUserKeys.contents(userId, filters),
    queryFn: () => listAdminUserContents(userId, filters),
    enabled: Number.isInteger(userId) && userId > 0,
    placeholderData: keepPreviousData,
    retry: retryServerErrorsOnce,
  });
}

/** PUT /admin/users/{id}/status; xong thì tải lại danh sách và chi tiết để thấy trạng thái mới. */
export function useUpdateUserStatus(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserStatusBody) => updateAdminUserStatus(userId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminUserKeys.all }),
  });
}
