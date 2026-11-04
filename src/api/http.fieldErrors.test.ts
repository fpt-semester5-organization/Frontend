import { describe, expect, it } from 'vitest';
import { apiFieldErrors } from './http';

const errorWith = (details: unknown) => ({ response: { data: { details } } });

describe('apiFieldErrors', () => {
  it('chuyển mảng details thành lỗi theo trường', () => {
    expect(apiFieldErrors(errorWith([{ field: 'email', message: 'Email sai' }]))).toEqual({ email: 'Email sai' });
  });

  it('details dạng gói dữ liệu của Backend không phải lỗi theo trường và không làm văng lỗi', () => {
    expect(apiFieldErrors(errorWith({ remainingAttempts: 4 }))).toEqual({});
  });

  it('không có details', () => {
    expect(apiFieldErrors(errorWith(null))).toEqual({});
    expect(apiFieldErrors(undefined)).toEqual({});
  });
});
