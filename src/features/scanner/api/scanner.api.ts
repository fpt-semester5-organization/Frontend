import { http, unwrap } from '@/api/http';
import { unwrapEnvelope, type PageMeta } from '@/features/shared/api/envelope';
import type { BarcodeResult, ScanHistoryItem, ScanHistoryParams, ScanMethod } from '../types/scanner.types';

/** FN-BAR-01 — GET /products/barcode/{barcode}?method= (Khách: trừ 1 lượt/ngày; 404 không trừ lượt) */
export const getProductByBarcode = (barcode: string, method: ScanMethod): Promise<BarcodeResult> =>
  unwrap<BarcodeResult>(http.get(`/products/barcode/${encodeURIComponent(barcode)}`, { params: { method }, timeout: 20_000 }));

/** FN-BAR-02 — GET /users/me/scans */
export async function listMyScans(p: ScanHistoryParams): Promise<{ items: ScanHistoryItem[]; meta: PageMeta }> {
  const r = await unwrapEnvelope<ScanHistoryItem[], PageMeta>(
    http.get('/users/me/scans', {
      params: { verdict: p.verdict, allergenOnly: p.allergenOnly || undefined, page: p.page, size: p.size },
    }),
  );
  return { items: r.data, meta: r.meta ?? { page: p.page, size: p.size, total: r.data.length } };
}
