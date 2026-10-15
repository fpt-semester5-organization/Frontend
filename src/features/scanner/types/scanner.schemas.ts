import { z } from 'zod';

/** Mã EAN-8, EAN-13, UPC-A: 8–14 chữ số (FN-BAR-01, regex ^\d{8,14}$). */
export const BARCODE_PATTERN = /^\d{8,14}$/;

export const barcodeSchema = z.object({
  barcode: z
    .string()
    .trim()
    .min(1, 'Hãy nhập mã vạch.')
    .regex(BARCODE_PATTERN, 'Mã vạch gồm 8–14 chữ số (EAN-8, EAN-13, UPC-A).'),
});

export type BarcodeFormValues = z.infer<typeof barcodeSchema>;
