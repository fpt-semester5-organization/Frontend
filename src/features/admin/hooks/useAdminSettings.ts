import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAdminSettings, resetAdminSetting, updateAdminSetting } from '../api/admin.api';
import { adminKeys } from '../lib/keys';
import { retryServerErrorsOnce } from '../lib/endpoint';
import type { UpdateSystemSettingBody } from '../types/admin.types';

export function useAdminSettings(category?: string) {
  return useQuery({
    queryKey: adminKeys.settings(category),
    queryFn: () => listAdminSettings(category),
    retry: retryServerErrorsOnce,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, body }: { key: string; body: UpdateSystemSettingBody }) =>
      updateAdminSetting(key, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.settingsAll });
    },
  });
}

export function useResetSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => resetAdminSetting(key),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.settingsAll });
    },
  });
}
