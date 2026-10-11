export interface DetectedAdditive {
  code: string;
  name: string;
  veganStatus: string;
}

export interface ScanQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface BarcodeScanResponse {
  barcode: string;
  productName: string;
  brand: string;
  veganVerdict: 'VEGAN' | 'NON_VEGAN' | 'DOUBTFUL' | string;
  verdictText: string;
  detectedAdditives: DetectedAdditive[];
  personalAllergyCheck: boolean;
  allergenWarnings: string[];
  quota: ScanQuota;
}

export interface UserScanHistory {
  scanId: number;
  barcode: string;
  productName: string;
  veganVerdict: string;
  isAllergenTriggered: boolean;
  scannedAt: string;
}
