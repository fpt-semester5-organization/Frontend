import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUOTA } from '@/constants/quota';
import { toApiError } from '@/lib/apiError';
import { mergeGuestQuota } from '@/lib/guestQuota';
import { useAuthStore } from '@/stores/auth.store';
import { listMyScans, lookupBarcode } from '../api/scanner.api';
import type { ScanHistoryParams, ScanMethod } from '../types/scanner.types';

export const scannerKeys = {
  history: (params: ScanHistoryParams) => ['scanner', 'history', params] as const,
  historyAll: () => ['scanner', 'history'] as const,
};

/**
 * Mỗi lần tra là một lượt quét có ghi nhận (lịch sử của Thành viên, hạn mức của Khách),
 * nên dùng mutation: chỉ gọi khi người dùng quét/bấm, không tự gọi lại.
 */
export function useLookupBarcode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ barcode, method }: { barcode: string; method: ScanMethod }) => lookupBarcode(barcode, method),
    onSuccess: (res) => {
      const isGuest = !useAuthStore.getState().isAuthenticated;
      if (res.data.quota) mergeGuestQuota({ barcodeDaily: res.data.quota }, isGuest);
      if (!isGuest) void queryClient.invalidateQueries({ queryKey: scannerKeys.historyAll() });
    },
    onError: (error) => {
      // Hết lượt: hiện GuestQuotaBadge = 0 (UI Spec 1.1).
      if (toApiError(error).errorCode === 'ERR_QUOTA_BARCODE_EXCEEDED') {
        const limit = QUOTA.guest.barcodeDaily;
        mergeGuestQuota({ barcodeDaily: { limit, used: limit, remaining: 0 } }, !useAuthStore.getState().isAuthenticated);
      }
    },
  });
}

export function useScanHistory(params: ScanHistoryParams) {
  return useQuery({
    queryKey: scannerKeys.history(params),
    queryFn: () => listMyScans(params),
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => failureCount < 1 && toApiError(error).status >= 500,
  });
}
