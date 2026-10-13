import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth.store';
import { mergeGuestQuota } from '@/features/shared/lib/guestQuota';
import { getProductByBarcode, listMyScans } from '../api/scanner.api';
import type { ScanHistoryParams, ScanMethod } from '../types/scanner.types';

export const scannerKeys = {
  all: ['scanner'] as const,
  history: (p: ScanHistoryParams) => ['scanner', 'history', p] as const,
  recent: ['scanner', 'history', 'recent'] as const,
};

/** Tra cứu = mutation (không retry: mỗi lần gọi của Khách tiêu 1 lượt/ngày). */
export function useBarcodeLookup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { barcode: string; method: ScanMethod }) => getProductByBarcode(v.barcode, v.method),
    retry: false,
    onSuccess: (res) => {
      const guest = !selectIsAuthenticated(useAuthStore.getState());
      if (res.quota) mergeGuestQuota({ barcodeDaily: res.quota }, guest);
      if (!guest) void qc.invalidateQueries({ queryKey: scannerKeys.all });
    },
  });
}

export function useScanHistory(p: ScanHistoryParams) {
  const authed = useAuthStore(selectIsAuthenticated);
  return useQuery({
    queryKey: scannerKeys.history(p),
    queryFn: () => listMyScans(p),
    enabled: authed,
    placeholderData: keepPreviousData,
  });
}

/** 3 lượt quét gần nhất cho trang quét (chỉ Thành viên). */
export function useRecentScans() {
  const authed = useAuthStore(selectIsAuthenticated);
  return useQuery({
    queryKey: scannerKeys.recent,
    queryFn: () => listMyScans({ page: 1, size: 3 }),
    enabled: authed,
  });
}
