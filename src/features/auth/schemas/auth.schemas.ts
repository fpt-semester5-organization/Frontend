import { z } from 'zod';

/** BR-AUTH-001: ≥ 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt. Cùng ràng buộc với OpenAPI. */
export const passwordRule = z
  .string()
  .min(1, 'Vui lòng nhập mật khẩu')
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(64, 'Mật khẩu tối đa 64 ký tự')
  .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
  .regex(/[a-z]/, 'Cần ít nhất 1 chữ thường')
  .regex(/[0-9]/, 'Cần ít nhất 1 chữ số')
  .regex(/[^A-Za-z0-9]/, 'Cần ít nhất 1 ký tự đặc biệt');

const email = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập email')
  .max(150, 'Email tối đa 150 ký tự')
  .email('Email không đúng định dạng');

const otp = z.string().regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số');

/** SCR-01 — FN-AUTH-08 */
export const loginSchema = z.object({
  email,
  password: z.string().min(8, 'Mật khẩu 8–64 ký tự').max(64, 'Mật khẩu 8–64 ký tự'),
  restoreAccount: z.boolean(),
});
export type LoginForm = z.infer<typeof loginSchema>;

/** SCR-02 — FN-AUTH-04 */
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Họ tên 2–100 ký tự').max(100, 'Họ tên 2–100 ký tự'),
    email,
    password: passwordRule,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
    agreeTerms: z.literal(true, { message: 'Bạn cần đồng ý điều khoản để tiếp tục' }),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu nhập lại không khớp' });
export type RegisterForm = z.infer<typeof registerSchema>;

/** SCR-03 — FN-AUTH-05 */
export const verifyOtpSchema = z.object({
  email,
  otp,
  purpose: z.enum(['EMAIL_VERIFY', 'PASSWORD_RESET']),
});
export type VerifyOtpForm = z.infer<typeof verifyOtpSchema>;

/** SCR-04 — FN-AUTH-11 */
export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

/** SCR-05 — FN-AUTH-12 */
export const resetPasswordSchema = z
  .object({ email, otp, newPassword: passwordRule, confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu') })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu nhập lại không khớp' });
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

/** SCR-06 — FN-AUTH-13 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại').max(64),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu nhập lại không khớp' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

/** Độ mạnh mật khẩu (thanh 4 nấc ở SCR-02/05/06) — chỉ để hiển thị, server mới quyết định. */
export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  const score = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length + (pw.length >= 12 ? 0 : 0);
  const s = (pw.length >= 8 ? score : Math.min(score, 1)) as 0 | 1 | 2 | 3 | 4;
  return { score: s, label: ['Chưa nhập', 'Yếu', 'Trung bình', 'An toàn khá', 'Rất an toàn'][pw ? s : 0] };
}
