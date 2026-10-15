import { z } from 'zod';
import { isMonday, todayInVietnam } from '../lib/dates';

/** Form tạo thực đơn (SCR-23), validate đúng ràng buộc của POST /meal-plans. */
export const generatePlanSchema = z.object({
  startDate: z
    .string()
    .refine(isMonday, 'Ngày bắt đầu phải là Thứ Hai.')
    .refine((value) => value >= todayInVietnam(), 'Không chọn tuần đã qua.'),
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
