import { z } from 'zod';

/** SCR-31 — FN-SUB-02: planId integer > 0, gateway MOMO | VIETQR. */
export const checkoutSchema = z.object({
  planId: z.number({ invalid_type_error: 'Gói không hợp lệ' }).int('Gói không hợp lệ').positive('Gói không hợp lệ'),
  gateway: z.enum(['MOMO', 'VIETQR'], { errorMap: () => ({ message: 'Chọn cổng thanh toán' }) }),
});
export type CheckoutForm = z.infer<typeof checkoutSchema>;

/** `:planId` trên URL là chuỗi; trả về số nguyên dương hoặc undefined. */
export function parsePlanId(raw: string | undefined): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n > 0 ? n : undefined;
}
