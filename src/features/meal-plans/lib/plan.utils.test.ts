import { describe, expect, it } from 'vitest';
import { scaledSwapLimit } from './plan.utils';

describe('scaledSwapLimit (giống MealPlanService.CalculateScaledLimit của Backend)', () => {
  it('thực đơn 7 ngày giữ nguyên mức Admin cấu hình', () => {
    expect(scaledSwapLimit(21, 7)).toBe(21);
    expect(scaledSwapLimit(14, 7)).toBe(14);
  });

  it('quy đổi theo số ngày rồi làm tròn lên', () => {
    expect(scaledSwapLimit(21, 1)).toBe(3);
    expect(scaledSwapLimit(21, 3)).toBe(9);
    expect(scaledSwapLimit(21, 14)).toBe(42);
    expect(scaledSwapLimit(10, 3)).toBe(5); // 4,29 -> 5
  });

  it('tối thiểu 1 lượt; số ngày bị kẹp trong khoảng 1–30 như Backend', () => {
    expect(scaledSwapLimit(1, 1)).toBe(1);
    expect(scaledSwapLimit(21, 0)).toBe(3);
    expect(scaledSwapLimit(21, 45)).toBe(90);
  });
});
