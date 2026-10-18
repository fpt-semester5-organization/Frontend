import { z } from 'zod';
import { addDays, todayInVietnam } from '../lib/dates';

/** Form tạo thực đơn (SCR-23), áp dụng 7 ngày liên tiếp từ ngày bắt đầu bất kỳ. */
export const generatePlanSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày không hợp lệ.')
    .refine((value) => value >= addDays(todayInVietnam(), -6), 'Không chọn ngày quá xa trong quá khứ.'),
  budgetTier: z.enum(['ECONOMICAL', 'STANDARD', 'PREMIUM'], { message: 'Hãy chọn mức ngân sách.' }),
  useFridge: z.boolean(),
  customInstructions: z.string().trim().max(200, 'Ghi chú tối đa 200 ký tự.'),
});

export type GeneratePlanValues = z.infer<typeof generatePlanSchema>;

/** Form tạo danh sách đi chợ (SCR-24). */
export const shoppingListSchema = z.object({
  servingsMultiplier: z
    .number({ invalid_type_error: 'Nhập hệ số khẩu phần.' })
    .min(1, 'Hệ số từ 1 đến 10.')
    .max(10, 'Hệ số từ 1 đến 10.'),
  targetShoppingDate: z
    .string()
    .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Ngày không hợp lệ.'),
});

export type ShoppingListValues = z.infer<typeof shoppingListSchema>;
