import type { ApiOperations, DeepRequired, Schemas } from '@/api/types';

// Mọi type lấy từ src/api/generated (sinh từ docs/08. OpenAPI); chỉ bổ sung chỗ OpenAPI bỏ trống.

type NearbyResponse = DeepRequired<Schemas['ListNearbyVenuesResponse']>;

/**
 * Một quán trong GET /venues/nearby (FN-MAP-01).
 */
export type NearbyVenue = Omit<NearbyResponse['data'][number], 'thumbnailUrl' | 'distanceKm'> & {
  thumbnailUrl: string | null;
  /** Tìm theo tỉnh/thành thì không có vị trí gốc nên có thể không có khoảng cách. */
  distanceKm: number | null;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  isFullyVegan?: boolean;
};

/** GET /venues/{id} (FN-MAP-02): Chi tiết quán chay. */
export interface VenueDetail {
  venueId: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  lat: number;
  lng: number;
  distanceKm?: number | null;
  rating: number;
  isFullyVegan: boolean;
  thumbnailUrl?: string | null;
  categories: string[];
  directionsUrl: string;
  source?: string;
  lastSyncedAt?: string;
}

/** meta: phân trang + bán kính đã áp dụng + hạn mức của Khách (chỉ Khách mới có quota). */
export type NearbyMeta = Omit<NearbyResponse['meta'], 'quota'> & {
  quota?: NearbyResponse['meta']['quota'] | null;
};

export type NearbyVenuesParams = NonNullable<ApiOperations['listNearbyVenues']['parameters']['query']>;

/** GET /categories (FN-PROF-08): danh mục món dùng để lọc quán. */
export type FoodCategory = DeepRequired<Schemas['ListCategoriesResponse']['data'][number]>;

export interface LatLng {
  lat: number;
  lng: number;
}
