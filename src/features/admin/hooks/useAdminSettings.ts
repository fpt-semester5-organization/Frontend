import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionKeys } from '@/features/subscription/hooks/useSubscription';
import { systemKeys } from '@/features/system/hooks/usePublicSettings';
import { listAdminSettings, resetAdminSetting, updateAdminSetting } from '../api/admin.api';
import { adminKeys } from '../lib/keys';
import { retryServerErrorsOnce } from '../lib/endpoint';
import type { UpdateSystemSettingBody } from '../types/admin.types';
import { billingKeys } from './useAdminBilling';

/** Ba hạn mức (VIP) của Chỉ số hệ thống dùng chung cho mọi gói VIP: đổi thì thẻ gói và trang Gói VIP phải tải lại. */
export const VIP_PLAN_QUOTA_SETTING_KEYS: ReadonlySet<string> = new Set([
  'CHAT_LIMIT_DAILY_VIP',
  'MEAL_PLAN_WEEKLY_LIMIT_VIP',
  'FRIDGE_SCAN_LIMIT_DAILY_VIP',
]);

export function useAdminSettings(category?: string) {
  return useQuery({
    queryKey: adminKeys.settings(category),
    queryFn: () => listAdminSettings(category),
    retry: retryServerErrorsOnce,
  });
}

/** Sau khi lưu hoặc khôi phục một chỉ số: tải lại danh sách chỉ số, cấu hình công khai và (với mục VIP) các gói. */
function useInvalidateAfterSettingChange() {
  const qc = useQueryClient();
  return (key: string) => {
    void qc.invalidateQueries({ queryKey: adminKeys.settingsAll });
    void qc.invalidateQueries({ queryKey: systemKeys.publicSettings });
    if (VIP_PLAN_QUOTA_SETTING_KEYS.has(key)) {
      void qc.invalidateQueries({ queryKey: billingKeys.plans });
      void qc.invalidateQueries({ queryKey: subscriptionKeys.plans });
    }
  };
}

export function useUpdateSetting() {
  const invalidate = useInvalidateAfterSettingChange();
  return useMutation({
    mutationFn: ({ key, body }: { key: string; body: UpdateSystemSettingBody }) =>
      updateAdminSetting(key, body),
    onSuccess: (_data, { key }) => invalidate(key),
  });
}

export function useResetSetting() {
  const invalidate = useInvalidateAfterSettingChange();
  return useMutation({
    mutationFn: (key: string) => resetAdminSetting(key),
    onSuccess: (_data, key) => invalidate(key),
  });
}
