import http from '@/api/http';
import type { ApiEnvelope } from '@/api/types';
import type { ProductScanResult, ScanHistoryItem, ScanHistoryParams, ScanMethod } from '../types/scanner.types';

/**
 * GET /products/barcode/{barcode} — FN-BAR-01 Quét mã vạch & đánh giá phụ gia.
 * Khách tối đa 03 lần/ngày; không tìm thấy sản phẩm (404) thì không trừ lượt.
 */
export async function lookupBarcode(barcode: string, method: ScanMethod) {
  const res = await http.get<ApiEnvelope<ProductScanResult>>(`/products/barcode/${barcode}`, { params: { method } });
  return res.data;
}

/** GET /users/me/scans — FN-BAR-02 Lịch sử quét của Thành viên, mới nhất trước. */
export async function listMyScans(params: ScanHistoryParams) {
  const res = await http.get<ApiEnvelope<ScanHistoryItem[]>>('/users/me/scans', {
    params: {
      page: params.page,
      size: params.size,
      ...(params.verdict ? { verdict: params.verdict } : {}),
      ...(params.allergenOnly ? { allergenOnly: true } : {}),
    },
  });
  return res.data;
}
