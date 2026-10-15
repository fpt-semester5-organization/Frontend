import { describe, expect, it } from 'vitest';
import { changePasswordSchema, loginSchema, passwordRule, passwordStrength, registerSchema, resetPasswordSchema } from './auth.schemas';

const strong = 'Veggie@2026';

describe('passwordRule (BR-AUTH-001)', () => {
  it.each([
    ['Ab1!', 'quá ngắn'],
    ['veggie@2026', 'thiếu chữ hoa'],
    ['VEGGIE@2026', 'thiếu chữ thường'],
    ['Veggie@abcd', 'thiếu chữ số'],
    ['Veggie2026a', 'thiếu ký tự đặc biệt'],
  ])('từ chối %s (%s)', (pw) => {
    expect(passwordRule.safeParse(pw).success).toBe(false);
  });
  it('chấp nhận mật khẩu đạt chuẩn', () => expect(passwordRule.safeParse(strong).success).toBe(true));
  it('độ mạnh 4 nấc', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength(strong).score).toBe(4);
  });
});

describe('loginSchema', () => {
  it('hợp lệ', () => expect(loginSchema.safeParse({ email: 'an@x.vn', password: strong }).success).toBe(true));
  it('email sai định dạng', () => expect(loginSchema.safeParse({ email: 'abc', password: strong }).success).toBe(false));
  it('mật khẩu ngoài 8–64 ký tự', () => {
    expect(loginSchema.safeParse({ email: 'an@x.vn', password: '1234567' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'an@x.vn', password: 'a'.repeat(65) }).success).toBe(false);
  });
  it('restoreAccount mặc định false', () => expect(loginSchema.parse({ email: 'an@x.vn', password: strong }).restoreAccount).toBe(false));
});

describe('registerSchema', () => {
  const ok = { fullName: 'Nguyễn An', email: 'an@x.vn', password: strong, confirmPassword: strong, agreeTerms: true as const };
  it('hợp lệ', () => expect(registerSchema.safeParse(ok).success).toBe(true));
  it('họ tên 2–100 ký tự', () => expect(registerSchema.safeParse({ ...ok, fullName: 'A' }).success).toBe(false));
  it('xác nhận mật khẩu phải trùng', () => {
    const r = registerSchema.safeParse({ ...ok, confirmPassword: 'Khac@2026' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(['confirmPassword']);
  });
  it('bắt buộc đồng ý điều khoản', () => expect(registerSchema.safeParse({ ...ok, agreeTerms: false }).success).toBe(false));
  it('email tối đa 150 ký tự', () => expect(registerSchema.safeParse({ ...ok, email: `${'a'.repeat(146)}@x.vn` }).success).toBe(false));
});

describe('resetPasswordSchema', () => {
  const ok = { email: 'an@x.vn', otp: '123456', newPassword: strong, confirmPassword: strong };
  it('hợp lệ', () => expect(resetPasswordSchema.safeParse(ok).success).toBe(true));
  it('OTP phải đủ 6 chữ số', () => {
    expect(resetPasswordSchema.safeParse({ ...ok, otp: '12345' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ ...ok, otp: '12345a' }).success).toBe(false);
  });
  it('mật khẩu mới yếu bị từ chối', () => expect(resetPasswordSchema.safeParse({ ...ok, newPassword: 'abc', confirmPassword: 'abc' }).success).toBe(false));
});

describe('changePasswordSchema', () => {
  it('mật khẩu mới phải khác mật khẩu hiện tại', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: strong, newPassword: strong, confirmPassword: strong }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: 'Cu@2026abc', newPassword: strong, confirmPassword: strong }).success).toBe(true);
  });
});
