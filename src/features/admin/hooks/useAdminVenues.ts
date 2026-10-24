import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { venueKeys } from '@/features/venues/hooks/useVenues';
import { listAdminVenues, syncAdminVenues, updateAdminVenue } from '../api/admin.api';
import { retryServerErrorsOnce } from '../lib/endpoint';
import type { AdminVenueFilters } from '../types/admin.types';

export const adminVenueKeys = {
  all: ['admin', 'venues'] as const,
  list: (filters: AdminVenueFilters) => [...adminVenueKeys.all, filters] as const,
};

export function useAdminVenues(filters: AdminVenueFilters) {
  return useQuery({
    queryKey: adminVenueKeys.list(filters),
    queryFn: () => listAdminVenues(filters),
    placeholderData: keepPreviousData,
    retry: retryServerErrorsOnce,
  });
}

/** Ẩn/hiện quán: bản đồ và trang chi tiết quán công khai cũng phải thấy ngay. */
export function useToggleVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateAdminVenue(id, isActive),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminVenueKeys.all });
      void qc.invalidateQueries({ queryKey: venueKeys.all });
    },
  });
}

export function useSyncVenues() {
  return useMutation({ mutationFn: (province: string) => syncAdminVenues(province) });
}
