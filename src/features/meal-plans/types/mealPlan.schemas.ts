import { z } from 'zod';
import { addDays, todayInVietnam } from '../lib/dates';

/** Form tạo thực đơn (SCR-23), linh hoạt số ngày từ 1 đến 30 ngày. */
export const generatePlanSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày không hợp lệ.')
    .refine((value) => value >= todayInVietnam(), 'Ngày bắt đầu không được ở quá khứ.'),
  numberOfDays: z
    .number({ invalid_type_error: 'Vui lòng nhập số ngày.' })
    .int('Số ngày phải là số nguyên.')
    .min(1, 'Tối thiểu 1 ngày.')
    .max(30, 'Tối đa 30 ngày.')
    .default(7),
  budgetTier: z.enum(['ECONOMICAL', 'STANDARD', 'PREMIUM'], { message: 'Hãy chọn mức ngân sách.' }),
  useFridge: z.boolean(),
  customInstructions: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự.'),
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
  daysCount: z.number().int().min(1, 'Tối thiểu 1 ngày.').max(30, 'Tối đa 30 ngày.').optional(),
});

export type ShoppingListValues = z.infer<typeof shoppingListSchema>;
