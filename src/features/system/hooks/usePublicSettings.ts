import { useQuery } from '@tanstack/react-query';
import { getPublicSettings, type PublicSystemSettings } from '../api/system.api';

export const systemKeys = {
  publicSettings: ['system', 'settings', 'public'] as const,
};

/**
 * Hook truy vấn cấu hình hệ thống công khai từ Backend (Cache 5 phút, tự động làm mới khi đổi tab).
 */
export function usePublicSettings() {
  return useQuery<PublicSystemSettings>({
    queryKey: systemKeys.publicSettings,
    queryFn: getPublicSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
