import { z } from 'zod';

/** Ràng buộc đúng cột "Validate" trong UI Screen Specification SCR-34 … SCR-45 / openapi.yaml. */

const REASON_MSG = 'Lý do 10–500 ký tự';
export const reasonField = z
  .string({ required_error: 'Vui lòng nhập lý do' })
  .trim()
  .min(10, REASON_MSG)
  .max(500, REASON_MSG);

/** Số nguyên nhập từ ô văn bản (giữ chuỗi; chuyển sang number khi gửi bằng `toInt`). */
const intString = (label: string, opts: { min?: number; max?: number } = {}) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${label} phải là số nguyên`)
    .refine((v) => Number(v) >= (opts.min ?? 1), `${label} phải ≥ ${opts.min ?? 1}`)
    .refine((v) => opts.max === undefined || Number(v) <= opts.max, `${label} phải ≤ ${opts.max}`);

export const toInt = (v: string) => Number(v);

/** Một lý do (xóa bình luận SCR-35; ...). */
export const reasonOnlySchema = z.object({ reason: reasonField });
export type ReasonOnlyForm = z.infer<typeof reasonOnlySchema>;

/** SCR-34 — FN-ADM-05 */
export const moderationDecisionSchema = z.object({
  note: reasonField,
  applySanction: z.boolean(),
});
export type ModerationDecisionForm = z.infer<typeof moderationDecisionSchema>;

/** SCR-39 — FN-ADM-02: durationDays bắt buộc khi SUSPEND / RESTRICT_COMMENT. */
export const USER_ACTIONS = ['WARN', 'RESTRICT_COMMENT', 'SUSPEND', 'BAN', 'REACTIVATE'] as const;
export const userStatusSchema = z
  .object({
    action: z.enum(USER_ACTIONS, { required_error: 'Chọn hành động' }),
    durationDays: z.string().trim(),
    reason: reasonField,
  })
  .superRefine((v, ctx) => {
    if (v.action !== 'SUSPEND' && v.action !== 'RESTRICT_COMMENT') return;
    const r = intString('Số ngày', { min: 1, max: 3650 }).safeParse(v.durationDays);
    if (!r.success) ctx.addIssue({ code: 'custom', path: ['durationDays'], message: v.durationDays ? r.error.issues[0].message : 'Nhập số ngày khóa' });
  });
export type UserStatusForm = z.infer<typeof userStatusSchema>;

/** Chuyển form kỷ luật sang body PUT: `durationDays` chỉ gửi khi SUSPEND / RESTRICT_COMMENT. */
export function toUserStatusBody(v: UserStatusForm): { action: UserStatusForm['action']; reason: string; durationDays?: number } {
  const needs = v.action === 'SUSPEND' || v.action === 'RESTRICT_COMMENT';
  return { action: v.action, reason: v.reason, durationDays: needs ? Number(v.durationDays) : undefined };
}

/** SCR-36 — FN-ADM-07 */
export const categoryCreateSchema = z.object({
  categoryName: z.string().trim().min(2, 'Tên 2–100 ký tự').max(100, 'Tên 2–100 ký tự'),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').optional().or(z.literal('')),
});
export type CategoryCreateForm = z.infer<typeof categoryCreateSchema>;
export const categoryRenameSchema = z.object({ categoryName: z.string().trim().min(2, 'Tên 2–100 ký tự').max(100, 'Tên 2–100 ký tự') });
export type CategoryRenameForm = z.infer<typeof categoryRenameSchema>;
/** FN-ADM-08 — chọn danh mục nhận dữ liệu chuyển sang. */
export const categoryMigrateSchema = z.object({ targetCategoryId: z.string().min(1, 'Chọn danh mục nhận dữ liệu') });
export type CategoryMigrateForm = z.infer<typeof categoryMigrateSchema>;

/** SCR-37 — FN-ADM-09 */
export const verifyNoteSchema = z.object({ note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự') });
export type VerifyNoteForm = z.infer<typeof verifyNoteSchema>;

/** SCR-42 — FN-ADM-10 (D109: nhóm thực phẩm kiêng ⊂ EGG, DAIRY, POULTRY, SEAFOOD) */
export const FORBIDDEN_GROUPS = ['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'] as const;
export const dietarySchoolSchema = z.object({
  schoolName: z.string().trim().min(1, 'Nhập tên trường phái').max(100, 'Tối đa 100 ký tự'),
  forbiddenFoodGroups: z.array(z.enum(FORBIDDEN_GROUPS)),
  forbidAllium: z.boolean(),
});
export type DietarySchoolForm = z.infer<typeof dietarySchoolSchema>;

/** SCR-42 — FN-ADM-11 */
export const VEGAN_STATUSES = ['VEGAN', 'DOUBTFUL', 'NON_VEGAN'] as const;
export const eNumberCreateSchema = z.object({
  code: z.string().trim().min(1, 'Nhập mã (ví dụ E120)').max(15, 'Mã tối đa 15 ký tự'),
  name: z.string().trim().min(1, 'Nhập tên').max(150, 'Tối đa 150 ký tự'),
  veganStatus: z.enum(VEGAN_STATUSES, { required_error: 'Chọn phân loại' }),
  originSource: z.string().trim().min(1, 'Nhập nguồn gốc').max(100, 'Tối đa 100 ký tự'),
  categoryType: z.string().trim().max(50, 'Tối đa 50 ký tự').optional(),
  healthRiskNotes: z.string().trim().optional(),
});
export type ENumberCreateForm = z.infer<typeof eNumberCreateSchema>;
export const eNumberUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên').max(150, 'Tối đa 150 ký tự'),
  veganStatus: z.enum(VEGAN_STATUSES),
  healthRiskNotes: z.string().trim().optional(),
});
export type ENumberUpdateForm = z.infer<typeof eNumberUpdateSchema>;

/** SCR-43 — FN-ADM-12. MVP chỉ nhập PLANT/EGG/DAIRY (D109). */
export const MVP_FOOD_GROUPS = ['PLANT', 'EGG', 'DAIRY'] as const;
export const STALL_TYPES = ['PRODUCE', 'CONDIMENTS', 'DRY_GOODS', 'PLANT_PROTEIN'] as const;
export const ingredientCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên nguyên liệu').max(100, 'Tối đa 100 ký tự'),
  standardUnit: z.string().trim().max(20, 'Tối đa 20 ký tự').optional(),
  defaultStallType: z.enum(STALL_TYPES, { required_error: 'Chọn loại quầy' }),
  foodGroup: z.enum(MVP_FOOD_GROUPS),
  caloriesPer100g: z
    .string()
    .trim()
    .min(1, 'Nhập calo/100g')
    .refine((v) => /^\d+(\.\d+)?$/.test(v) && Number(v) >= 0, 'Calo phải là số ≥ 0'),
  isAllium: z.boolean(),
});
export type IngredientCreateForm = z.infer<typeof ingredientCreateSchema>;
export const allergenCreateSchema = z.object({
  allergenName: z.string().trim().min(1, 'Nhập tên nhóm').max(100, 'Tối đa 100 ký tự'),
  code: z.string().trim().min(1, 'Nhập mã').max(50, 'Tối đa 50 ký tự'),
  description: z.string().trim().max(500, 'Tối đa 500 ký tự').optional(),
});
export type AllergenCreateForm = z.infer<typeof allergenCreateSchema>;

/** SCR-44 — FN-ADM-13 */
export const planCreateSchema = z.object({
  planName: z.string().trim().min(1, 'Nhập tên gói').max(100, 'Tối đa 100 ký tự'),
  durationDays: intString('Thời hạn', { min: 1 }),
  priceVnd: intString('Giá', { min: 1 }),
});
export type PlanCreateForm = z.infer<typeof planCreateSchema>;
export const planPriceSchema = z.object({ priceVnd: intString('Giá', { min: 1 }) });
export type PlanPriceForm = z.infer<typeof planPriceSchema>;
export const reconcileSchema = z.object({
  transactionId: intString('Mã giao dịch', { min: 1 }),
  action: z.enum(['COMPENSATE', 'REFUND'], { required_error: 'Chọn loại đối soát' }),
  reason: reasonField,
});
export type ReconcileForm = z.infer<typeof reconcileSchema>;

/** SCR-45 — FN-ADM-14 */
export const venueSyncSchema = z.object({ province: z.string().trim().min(1, 'Nhập tỉnh/thành').max(50, 'Tối đa 50 ký tự') });
export type VenueSyncForm = z.infer<typeof venueSyncSchema>;

/** SCR-41 — FN-CHAT-07 */
export const KNOWLEDGE_SCOPES = ['ALL', 'RECIPE', 'POST', 'VIDEO', 'NUTRITION_DOC', 'DICTIONARY'] as const;
export const reindexSchema = z.object({ scope: z.enum(KNOWLEDGE_SCOPES) });
export type ReindexForm = z.infer<typeof reindexSchema>;

/** SCR-40 / SCR-38 / SCR-41: bộ lọc ngày YYYY-MM-DD, from ≤ to. */
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày dạng YYYY-MM-DD').or(z.literal(''));
export const dateRangeSchema = z
  .object({ from: dateField, to: dateField })
  .refine((v) => !v.from || !v.to || v.from <= v.to, { message: 'Từ ngày phải trước hoặc bằng đến ngày', path: ['to'] });
