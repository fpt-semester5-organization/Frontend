import type { DeepRequired, Schemas } from '@/api/types';

// Mọi type lấy từ src/api/generated (sinh từ docs/08. OpenAPI); chỉ bổ sung chỗ OpenAPI bỏ trống.

type ProductData = DeepRequired<Schemas['GetProductByBarcodeResponse']['data']>;

/** Kết luận Xanh/Vàng/Đỏ (BR-USR-09). */
export type VeganVerdict = 'GREEN' | 'YELLOW' | 'RED';
export type DetectedAdditive = ProductData['detectedAdditives'][number];
export type AdditiveStatus = DetectedAdditive['veganStatus'];

/**
 * UNSPECIFIED: phần tử allergenWarnings[] để trống trong OpenAPI. Tạm đọc theo nhóm dị ứng
 * của GET /allergens (allergenId, code, allergenName); server trả chuỗi thì hiển thị nguyên chuỗi.
 */
export type AllergenWarning = string | { allergenId?: number; code?: string; allergenName?: string };

/** GET /products/barcode/{barcode} (FN-BAR-01). quota chỉ có với Khách (03 lượt/ngày). */
export type ProductScanResult = Omit<ProductData, 'veganVerdict' | 'allergenWarnings' | 'quota' | 'brand'> & {
  veganVerdict: VeganVerdict;
  brand: string | null;
  allergenWarnings: AllergenWarning[];
  quota?: ProductData['quota'] | null;
};

/** CAMERA_BARCODE khi quét bằng camera, MANUAL_INPUT khi nhập tay (từ chối camera). */
export type ScanMethod = 'CAMERA_BARCODE' | 'MANUAL_INPUT';

/** GET /users/me/scans (FN-BAR-02). */
export type ScanHistoryItem = Omit<DeepRequired<Schemas['ListCurrentUserScansResponse']['data'][number]>, 'veganVerdict'> & {
  veganVerdict: VeganVerdict;
};
export interface ScanHistoryParams {
  verdict?: VeganVerdict;
  allergenOnly?: boolean;
  page: number;
  size: number;
}
