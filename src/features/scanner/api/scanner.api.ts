import http from '@/api/http';
import type { ApiEnvelope, Paged } from '@/api/types';
import type { ProductScanResult, ScanHistoryItem, ScanHistoryParams, ScanMethod } from '../types/scanner.types';

/**
 * GET /products/barcode/{barcode} — FN-BAR-01 Quét mã vạch & đánh giá phụ gia.
 * Khách tối đa 03 lần/ngày; không tìm thấy sản phẩm (404) thì không trừ lượt.
 */
export async function lookupBarcode(barcode: string, method: ScanMethod) {
  const res = await http.get<ApiEnvelope<ProductScanResult>>(`/products/barcode/${barcode}`, { params: { method } });
  return res.data;
}

/** Backend (develop, 18/10/2026) bọc trang trong data thay vì trả data[] + meta như OpenAPI. */
interface ScanHistoryPage {
  items?: ScanHistoryItem[];
  pageNumber?: number;
  pageSize?: number;
  totalItems?: number;
}

/**
 * GET /users/me/scans — FN-BAR-02 Lịch sử quét của Thành viên, mới nhất trước.
 * Nhận cả hai dạng: data là mảng kèm meta (OpenAPI), hoặc data = { items, pageNumber, pageSize, totalItems } (Backend hiện tại).
 */
export async function listMyScans(params: ScanHistoryParams): Promise<Paged<ScanHistoryItem>> {
  const res = await http.get<ApiEnvelope<ScanHistoryItem[] | ScanHistoryPage>>('/users/me/scans', {
    params: {
      page: params.page,
      size: params.size,
      ...(params.verdict ? { verdict: params.verdict } : {}),
      ...(params.allergenOnly ? { allergenOnly: true } : {}),
    },
  });
  const { data, meta } = res.data;
  if (Array.isArray(data)) {
    return { items: data, meta: meta ?? { page: params.page, size: params.size, total: data.length } };
  }
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    items,
    meta: { page: data?.pageNumber ?? params.page, size: data?.pageSize ?? params.size, total: data?.totalItems ?? items.length },
  };
}
