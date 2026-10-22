import { describe, expect, it } from 'vitest';
import { readReturnUrl } from './useAuth';

const loc = (search: string, state: unknown = null) => ({ search, state });

describe('readReturnUrl (UI-5: quay lại trang trước sau khi đăng nhập)', () => {
  it('đọc ?returnUrl= do guard và SignupPromptModal gắn vào URL', () => {
    expect(readReturnUrl(loc('?returnUrl=%2Fme'))).toBe('/me');
    expect(readReturnUrl(loc('?returnUrl=%2Fcommunity%3Ftype%3DPOST'))).toBe('/community?type=POST');
  });

  it('ưu tiên returnUrl trong state (Đăng ký → OTP chuyển tiếp qua state)', () => {
    expect(readReturnUrl(loc('?returnUrl=%2Fme', { returnUrl: '/meal-plans' }))).toBe('/meal-plans');
  });

  it('bỏ qua địa chỉ ngoài trang và trang xác thực', () => {
    expect(readReturnUrl(loc('?returnUrl=https%3A%2F%2Fevil.example'))).toBeUndefined();
    expect(readReturnUrl(loc('?returnUrl=%2F%2Fevil.example'))).toBeUndefined();
    expect(readReturnUrl(loc('?returnUrl=%2F%5Cevil.example'))).toBeUndefined();
    expect(readReturnUrl(loc('?returnUrl=%2Fauth%2Flogin'))).toBeUndefined();
    expect(readReturnUrl(loc(''))).toBeUndefined();
  });
});
