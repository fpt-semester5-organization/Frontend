import { z } from 'zod';
import {
  HEIGHT_MAX,
  HEIGHT_MIN,
  MIN_AGE,
  WEIGHT_MAX,
  WEIGHT_MIN,
  ageFrom,
  parseDecimal,
  todayIso,
} from '../lib/healthMetrics';
import type { HealthProfile, HealthProfileBody } from './profile.types';

// Luật validate lấy đúng cột "Validate" của SCR-07, SCR-08, SCR-09 (UI Screen Specification) và Data Dictionary.

export const FULL_NAME_MIN = 2;
export const FULL_NAME_MAX = 100;
/** SCR-07: ^0(3|5|7|8|9)[0-9]{8}$ (số di động Việt Nam 10 chữ số). */
export const PHONE_PATTERN = /^0(3|5|7|8|9)[0-9]{8}$/;
export const NOTE_MAX = 255;
export const REASON_MAX = 255;
/** FN-PROF-05: tối đa 20 dị ứng. */
export const ALLERGENS_MAX = 20;

/** Số có tối đa `decimals` chữ số thập phân (Height_Cm, Current_Weight_Kg là DECIMAL(5,1)). */
const decimalField = (opts: { min: number; max: number; decimals: number; label: string; unit: string; required: boolean }) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === '') {
        if (opts.required) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Vui lòng nhập ${opts.label.toLowerCase()}.` });
        return;
      }
      const number = parseDecimal(value);
      if (number === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${opts.label} phải là số (ví dụ 54,5).` });
        return;
      }
      if (number < opts.min || number > opts.max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${opts.label} phải từ ${opts.min} đến ${opts.max} ${opts.unit}.` });
        return;
      }
      const fraction = value.replace(',', '.').split('.')[1] ?? '';
      if (fraction.length > opts.decimals) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${opts.label} chỉ ghi tối đa ${opts.decimals} chữ số sau dấu phẩy.` });
      }
    });

export const heightField = decimalField({ min: HEIGHT_MIN, max: HEIGHT_MAX, decimals: 1, label: 'Chiều cao', unit: 'cm', required: true });
export const weightField = (decimals = 1) =>
  decimalField({ min: WEIGHT_MIN, max: WEIGHT_MAX, decimals, label: 'Cân nặng', unit: 'kg', required: true });

// --- SCR-07: thông tin cá nhân ---

export const profileFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(FULL_NAME_MIN, `Họ tên cần ít nhất ${FULL_NAME_MIN} ký tự.`)
    .max(FULL_NAME_MAX, `Họ tên tối đa ${FULL_NAME_MAX} ký tự.`),
  phoneNumber: z
    .string()
    .trim()
    .refine((value) => value === '' || PHONE_PATTERN.test(value), 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.'),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/** FN-PROF-03: ảnh đại diện JPEG/PNG/WEBP ≤ 5 MB. */
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Kiểm tra ngay trên màn hình trước khi tải ảnh đại diện; trả câu lỗi hoặc null. */
export function validateAvatar(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return 'Ảnh đại diện phải là JPEG, PNG hoặc WEBP.';
  if (file.size > AVATAR_MAX_BYTES) return 'Ảnh đại diện tối đa 5 MB.';
  return null;
}

export const deleteAccountSchema = z.object({
  confirmPassword: z.string().min(1, 'Nhập mật khẩu để xác nhận.'),
  reason: z.string().trim().max(REASON_MAX, `Lý do tối đa ${REASON_MAX} ký tự.`),
});
export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;

// --- SCR-08: hồ sơ sức khỏe ---

export const healthFormSchema = z.object({
  heightCm: heightField,
  weightKg: weightField(1),
  dateOfBirth: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vui lòng nhập ngày sinh.' });
        return;
      }
      const age = ageFrom(value);
      if (age === null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ngày sinh không hợp lệ.' });
      else if (value > todayIso()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ngày sinh không được ở tương lai.' });
      else if (age < MIN_AGE) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Bạn cần đủ ${MIN_AGE} tuổi để lập hồ sơ sức khỏe.` });
    }),
  gender: z.enum(['', 'MALE', 'FEMALE']).refine((value): boolean => value !== '', 'Vui lòng chọn giới tính.'),
  dietarySchoolId: z.string().refine((value) => /^\d+$/.test(value) && Number(value) > 0, 'Vui lòng chọn trường phái ăn chay.'),
  healthGoal: z.enum(['', 'LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE']).refine((value): boolean => value !== '', 'Vui lòng chọn mục tiêu sức khỏe.'),
  targetWeightKg: decimalField({ min: WEIGHT_MIN, max: WEIGHT_MAX, decimals: 1, label: 'Cân nặng mục tiêu', unit: 'kg', required: false }),
  requiresAlliumFree: z.boolean(),
  regionPreference: z.enum(['', 'NORTH', 'CENTRAL', 'SOUTH']),
});
export type HealthFormValues = z.infer<typeof healthFormSchema>;

export const EMPTY_HEALTH_FORM: HealthFormValues = {
  heightCm: '',
  weightKg: '',
  dateOfBirth: '',
  gender: '',
  dietarySchoolId: '',
  healthGoal: '',
  targetWeightKg: '',
  requiresAlliumFree: false,
  regionPreference: '',
};

const decimalText = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

/** Hồ sơ hiện có (GET /users/me → health) → giá trị form. */
export function toHealthFormValues(health: HealthProfile | null): HealthFormValues {
  if (!health) return EMPTY_HEALTH_FORM;
  return {
    heightCm: decimalText(health.heightCm),
    weightKg: decimalText(health.currentWeightKg),
    dateOfBirth: health.dateOfBirth ?? '',
    gender: health.gender ?? '',
    dietarySchoolId: health.dietarySchool?.id ? String(health.dietarySchool.id) : '',
    healthGoal: health.healthGoal ?? '',
    targetWeightKg: decimalText(health.targetWeightKg),
    requiresAlliumFree: health.requiresAlliumFree === true,
    regionPreference: health.regionPreference ?? '',
  };
}

/** Form → thân PUT /users/me/health-profile; trường tùy chọn để trống thì không gửi. */
export function toHealthBody(values: HealthFormValues): HealthProfileBody {
  const targetWeight = parseDecimal(values.targetWeightKg);
  return {
    heightCm: parseDecimal(values.heightCm) as number,
    weightKg: parseDecimal(values.weightKg) as number,
    dateOfBirth: values.dateOfBirth,
    gender: values.gender as HealthProfileBody['gender'],
    dietarySchoolId: Number(values.dietarySchoolId),
    healthGoal: values.healthGoal as HealthProfileBody['healthGoal'],
    ...(targetWeight !== null ? { targetWeightKg: targetWeight } : {}),
    requiresAlliumFree: values.requiresAlliumFree,
    ...(values.regionPreference ? { regionPreference: values.regionPreference } : {}),
  };
}

/** Hồ sơ hiện có → thân PUT đầy đủ, dùng khi SCR-09 chỉ đổi trường phái / kiêng ngũ vị tân. */
export function healthBodyFrom(
  health: HealthProfile,
  patch: Pick<HealthProfileBody, 'dietarySchoolId' | 'requiresAlliumFree'>
): HealthProfileBody {
  return {
    heightCm: health.heightCm,
    weightKg: health.currentWeightKg,
    dateOfBirth: health.dateOfBirth,
    gender: health.gender,
    healthGoal: health.healthGoal,
    ...(health.targetWeightKg !== null ? { targetWeightKg: health.targetWeightKg } : {}),
    ...(health.regionPreference ? { regionPreference: health.regionPreference } : {}),
    ...patch,
  };
}

// --- SCR-08: ghi cân nặng (FN-PROF-06; Weight_Kg là DECIMAL(5,2)) ---

export const weightEntrySchema = z.object({
  weightKg: weightField(2),
  loggedDate: z
    .string()
    .trim()
    .refine((value) => value === '' || ageFrom(value) !== null, 'Ngày không hợp lệ.')
    .refine((value) => value === '' || value <= todayIso(), 'Không ghi cân nặng cho ngày trong tương lai.'),
  note: z.string().trim().max(NOTE_MAX, `Ghi chú tối đa ${NOTE_MAX} ký tự.`),
});
export type WeightEntryValues = z.infer<typeof weightEntrySchema>;

// --- SCR-09: dị ứng (FN-PROF-05) ---

export const allergiesFormSchema = z.object({
  allergens: z
    .array(z.object({ allergenId: z.number().int().positive(), notes: z.string().trim().max(NOTE_MAX, `Ghi chú tối đa ${NOTE_MAX} ký tự.`) }))
    .max(ALLERGENS_MAX, `Chỉ khai báo tối đa ${ALLERGENS_MAX} dị ứng.`),
});
export type AllergiesFormValues = z.infer<typeof allergiesFormSchema>;
