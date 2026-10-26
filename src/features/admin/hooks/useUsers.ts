import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/ui.store';
import * as api from '../api/moderation.api';
import { adminKeys } from '../lib/keys';
import type { AdminUserQuery, UserStatusBody } from '../types/admin.types';

export const useAdminUsers = (q: AdminUserQuery) =>
  useQuery({ queryKey: adminKeys.users(q), queryFn: () => api.listUsers(q), placeholderData: keepPreviousData });

export const useUserContents = (id: number | undefined, q: { type?: string; page: number; size: number }) =>
  useQuery({
    queryKey: adminKeys.userContents(id ?? 0, q),
    queryFn: () => api.getUserContents(id as number, q),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; body: UserStatusBody }) => api.updateUserStatus(v.id, v.body),
    onSuccess: (r) => {
      toast.success(r.message || 'Đã cập nhật trạng thái tài khoản.');
      void qc.invalidateQueries({ queryKey: adminKeys.usersAll });
      void qc.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    },
  });
}
