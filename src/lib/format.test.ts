import { describe, expect, it } from 'vitest';
import { formatDateTime, parseServerDate } from './format';
import { formatServerDateTime } from './serverDate';

describe('formatDateTime', () => {
  it('chuỗi có Z đổi sang giờ Việt Nam', () => {
    expect(formatDateTime('2026-11-03T10:26:14.031Z')).toBe('03/11/2026 17:26');
  });

  it('chuỗi thiếu múi giờ được coi là UTC, không phụ thuộc giờ máy', () => {
    expect(formatDateTime('2026-11-03T10:26:14.031')).toBe('03/11/2026 17:26');
    expect(formatDateTime('2026-11-03T10:26:14.0312345')).toBe('03/11/2026 17:26');
    expect(formatDateTime('2026-11-03T10:26')).toBe('03/11/2026 17:26');
  });

  it('giữ nguyên múi giờ đã có', () => {
    expect(formatDateTime('2026-11-03T10:26:14+07:00')).toBe('03/11/2026 10:26');
    expect(formatDateTime('2026-11-03T10:26:14-05:00')).toBe('03/11/2026 22:26');
  });

  it('nhận Date; giá trị rỗng hoặc sai thì trả chuỗi rỗng', () => {
    expect(formatDateTime(new Date('2026-11-03T10:26:14Z'))).toBe('03/11/2026 17:26');
    expect(formatDateTime(new Date('khong-phai-ngay'))).toBe('');
    expect(formatDateTime('khong-phai-ngay')).toBe('');
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
  });

  it('formatServerDateTime và parseServerDate cho cùng kết quả', () => {
    expect(formatServerDateTime('2026-11-03T10:26:14')).toBe(formatDateTime('2026-11-03T10:26:14Z'));
    expect(parseServerDate('2026-11-03T10:26:14')?.toISOString()).toBe('2026-11-03T10:26:14.000Z');
    expect(parseServerDate(null)).toBeNull();
  });
});
