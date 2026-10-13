import { z } from 'zod';

/** FN-BAR-01: `^\d{8,14}$` (EAN-8, UPC-A, EAN-13, GTIN-14). */
export const BARCODE_REGEX = /^\d{8,14}$/;

export const barcodeSchema = z.object({
  barcode: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã vạch')
    .regex(BARCODE_REGEX, 'Mã vạch gồm 8–14 chữ số (EAN-8, UPC-A, EAN-13).'),
});
export type BarcodeForm = z.infer<typeof barcodeSchema>;

export const scanHistoryFilterSchema = z.object({
  verdict: z.enum(['RED', 'YELLOW', 'GREEN']).optional(),
  allergenOnly: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(50).default(20),
});
