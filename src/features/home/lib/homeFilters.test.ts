import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, hasActiveFilters, parseFilters, serializeFilters, toRecipeParams } from './homeFilters';

describe('parseFilters', () => {
  it('URL trống cho bộ lọc mặc định', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
  });

  it('đọc đủ các tham số hợp lệ', () => {
    const f = parseFilters(new URLSearchParams('q=  đậu hũ &school=1&quick=1&type=VIDEO&sort=NEWEST'));
    expect(f).toEqual({ keyword: 'đậu hũ', dietarySchoolId: 1, quick: true, contentType: 'VIDEO', sort: 'NEWEST' });
  });

  it('bỏ qua giá trị sai thay vì gửi lên server', () => {
    const f = parseFilters(new URLSearchParams('school=-3&quick=yes&type=PODCAST&sort=RANDOM'));
    expect(f).toEqual(DEFAULT_FILTERS);
  });

  it('cắt từ khóa còn tối đa 100 ký tự (FN-POST-01)', () => {
    expect(parseFilters(new URLSearchParams(`q=${'a'.repeat(150)}`)).keyword).toHaveLength(100);
  });
});

describe('serializeFilters', () => {
  it('chỉ ghi giá trị khác mặc định', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('');
    expect(serializeFilters({ ...DEFAULT_FILTERS, keyword: 'nấm', quick: true }).toString()).toBe('q=n%E1%BA%A5m&quick=1');
  });

  it('đọc lại được đúng bộ lọc đã ghi', () => {
    const f = { keyword: 'canh', dietarySchoolId: 5, quick: true, contentType: 'RECIPE' as const, sort: 'NEWEST' as const };
    expect(parseFilters(serializeFilters(f))).toEqual(f);
  });
});

describe('toRecipeParams', () => {
  it('“Dưới 20 phút” thành maxCookTime = 20 và bỏ trường rỗng', () => {
    expect(toRecipeParams({ ...DEFAULT_FILTERS, quick: true })).toEqual({
      maxCookTime: 20,
      contentType: 'ALL',
      sort: 'POPULAR',
      size: 9,
    });
  });
});

describe('hasActiveFilters', () => {
  it('chỉ sắp xếp thì không tính là đang lọc', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'NEWEST' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, contentType: 'VIDEO' })).toBe(true);
  });
});
