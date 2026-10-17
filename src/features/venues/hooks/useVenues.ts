import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toApiError } from '@/lib/apiError';
import { mergeGuestQuota } from '@/lib/guestQuota';
import { useAuthStore } from '@/stores/auth.store';
import { getVenue, listCategories, listNearbyVenues } from '../api/venues.api';
import type { LatLng, NearbyVenuesParams } from '../types/venues.types';

export const venueKeys = {
  all: ['venues'] as const,
  nearby: (params: NearbyVenuesParams) => [...venueKeys.all, 'nearby', params] as const,
  categories: () => ['categories'] as const,
  detail: (id: number, coords?: LatLng | null) => [...venueKeys.all, 'detail', id, coords] as const,
};

/** Không thử lại lỗi 4xx (403 hết lượt/ngoài lãnh thổ, 400, 429): mỗi lần gọi của Khách có thể bị tính lượt. */
const retryServerErrorsOnce = (failureCount: number, error: unknown) =>
  failureCount < 1 && toApiError(error).status >= 500;

/**
 * GET /venues/nearby. `params = null` là chưa tìm.
 * Truy vấn có tọa độ GPS không giữ trong cache sau khi rời trang (gcTime 0): không lưu vị trí của Khách (BR-AUTH-002).
 */
export function useNearbyVenues(params: NearbyVenuesParams | null) {
  const usesGps = params?.lat !== undefined;
  return useQuery({
    queryKey: venueKeys.nearby(params ?? {}),
    queryFn: async () => {
      const result = await listNearbyVenues(params!);
      if (result.meta?.quota) {
        mergeGuestQuota({ mapSearch: result.meta.quota }, !useAuthStore.getState().isAuthenticated);
      }
      return result;
    },
    enabled: params !== null,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    gcTime: usesGps ? 0 : 5 * 60 * 1000,
    retry: retryServerErrorsOnce,
  });
}

/** GET /categories cho ô lọc danh mục; ít thay đổi nên giữ lâu. */
export function useFoodCategories() {
  return useQuery({
    queryKey: venueKeys.categories(),
    queryFn: listCategories,
    staleTime: 30 * 60 * 1000,
    retry: retryServerErrorsOnce,
  });
}

/**
 * GET /venues/{id} — FN-MAP-02 Chi tiết một quán chay.
 * Hỗ trợ truyền tọa độ người dùng để server tính distanceKm.
 */
export function useVenue(id: number, coords?: LatLng | null) {
  return useQuery({
    queryKey: venueKeys.detail(id, coords),
    queryFn: () => getVenue(id, coords),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 5 * 60 * 1000,
    retry: retryServerErrorsOnce,
  });
}

