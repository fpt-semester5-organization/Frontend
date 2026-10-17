import http from '@/api/http';
import type { ApiEnvelope } from '@/api/types';
import type { FoodCategory, LatLng, NearbyMeta, NearbyVenue, NearbyVenuesParams, VenueDetail } from '../types/venues.types';

/**
 * GET /venues/nearby — FN-MAP-01 Tìm quán chay lân cận.
 * Cần (lat, lng) hoặc province. Khách: bán kính 5 km, tối đa 03 lần có kết quả; ngoài Việt Nam → 403 ERR_GUEST_REGION_UNSUPPORTED.
 */
export async function listNearbyVenues(params: NearbyVenuesParams) {
  const res = await http.get<ApiEnvelope<NearbyVenue[]> & { meta?: NearbyMeta }>('/venues/nearby', { params });
  return { items: res.data.data, meta: res.data.meta ?? null, message: res.data.message };
}

/**
 * GET /venues/{id} — FN-MAP-02 Xem chi tiết quán chay.
 * Hỗ trợ truyền tọa độ lat/lng người dùng để server tính distanceKm.
 */
export async function getVenue(id: number, coords?: LatLng | null) {
  const res = await http.get<ApiEnvelope<VenueDetail>>(`/venues/${id}`, {
    params: coords ? { lat: coords.lat, lng: coords.lng } : undefined,
  });
  return res.data.data;
}

/** GET /categories — FN-PROF-08 Danh mục món dùng chung (lọc quán theo danh mục). */
export async function listCategories() {
  const res = await http.get<ApiEnvelope<FoodCategory[]>>('/categories');
  return res.data.data;
}

