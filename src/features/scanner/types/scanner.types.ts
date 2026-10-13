/** Hợp đồng FN-BAR-01/02 (openapi.yaml: getProductByBarcode, listCurrentUserScans). */
export type VeganVerdict = 'GREEN' | 'YELLOW' | 'RED';
export type AdditiveVeganStatus = 'VEGAN' | 'NON_VEGAN' | 'DOUBTFUL';
export type ScanMethod = 'CAMERA_BARCODE' | 'MANUAL_INPUT';

export interface DetectedAdditive {
  code: string;
  name: string;
  veganStatus: AdditiveVeganStatus;
}

/**
 * `allergenWarnings` không có schema trong openapi (mảng `{}`); backend hiện trả mảng chuỗi.
 * FE chấp nhận cả chuỗi lẫn object `{ allergenName | name }` (UNSPECIFIED — xem báo cáo).
 */
export type AllergenWarningRaw = string | { allergenName?: string; name?: string; [k: string]: unknown };

export interface ScanQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface BarcodeResult {
  barcode: string;
  productName: string;
  brand?: string | null;
  veganVerdict: VeganVerdict;
  verdictText: string;
  detectedAdditives: DetectedAdditive[];
  personalAllergyCheck: boolean;
  allergenWarnings: AllergenWarningRaw[];
  quota?: ScanQuota | null;
}

export interface ScanHistoryItem {
  scanId: number;
  barcode: string;
  productName: string;
  veganVerdict: VeganVerdict;
  isAllergenTriggered: boolean;
  scannedAt: string;
}

export interface ScanHistoryParams {
  verdict?: VeganVerdict;
  allergenOnly?: boolean;
  page: number;
  size: number;
}
