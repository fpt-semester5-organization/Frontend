import http from '@/api/http';
import type { ApiEnvelope } from '@/api/types';
import type { FoodCategory, NearbyMeta, NearbyVenue, NearbyVenuesParams } from '../types/venues.types';

/**
 * GET /venues/nearby — FN-MAP-01 Tìm quán chay lân cận.
 * Cần (lat, lng) hoặc province. Khách: bán kính 5 km, tối đa 03 lần có kết quả; ngoài Việt Nam → 403 ERR_GUEST_REGION_UNSUPPORTED.
 */
export async function listNearbyVenues(params: NearbyVenuesParams) {
  const res = await http.get<ApiEnvelope<NearbyVenue[]> & { meta?: NearbyMeta }>('/venues/nearby', { params });
  return { items: res.data.data, meta: res.data.meta ?? null, message: res.data.message };
}

/** GET /categories — FN-PROF-08 Danh mục món dùng chung (lọc quán theo danh mục). */
export async function listCategories() {
  const res = await http.get<ApiEnvelope<FoodCategory[]>>('/categories');
  return res.data.data;
}
