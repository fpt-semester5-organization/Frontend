import { describe, expect, it } from 'vitest';
import {
  dateRangeSchema,
  ingredientCreateSchema,
  moderationDecisionSchema,
  planCreateSchema,
  reasonOnlySchema,
  reconcileSchema,
  toUserStatusBody,
  userStatusSchema,
  venueSyncSchema,
} from '../schemas/admin.schemas';
import { cleanParams } from '../lib/api';
import { circuitView } from '../lib/circuit';
import { presetRange, toIsoDate } from '../lib/dates';
import { windowed } from '../lib/paging';
import { formatFailedCriteria } from '../lib/criteria';

const longReason = 'Vi phạm lần 4: spam quảng cáo.';

describe('schema admin', () => {
  it('lý do phải 10–500 ký tự', () => {
    expect(reasonOnlySchema.safeParse({ reason: 'ngắn' }).success).toBe(false);
    expect(reasonOnlySchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
    expect(reasonOnlySchema.safeParse({ reason: longReason }).success).toBe(true);
  });

  it('quyết định kiểm duyệt cần ghi chú 10–500 ký tự', () => {
    expect(moderationDecisionSchema.safeParse({ note: '123', applySanction: false }).success).toBe(false);
    expect(moderationDecisionSchema.safeParse({ note: longReason, applySanction: true }).success).toBe(true);
  });

  it('SUSPEND / RESTRICT_COMMENT bắt buộc số ngày, WARN thì không', () => {
    const base = { reason: longReason };
    const suspend = userStatusSchema.safeParse({ ...base, action: 'SUSPEND', durationDays: '' });
    expect(suspend.success).toBe(false);
    if (!suspend.success) expect(suspend.error.issues[0].path).toEqual(['durationDays']);
    expect(userStatusSchema.safeParse({ ...base, action: 'RESTRICT_COMMENT', durationDays: 'abc' }).success).toBe(false);
    expect(userStatusSchema.safeParse({ ...base, action: 'SUSPEND', durationDays: '0' }).success).toBe(false);
    expect(userStatusSchema.safeParse({ ...base, action: 'WARN', durationDays: '' }).success).toBe(true);
  });

  it('toUserStatusBody chỉ gửi durationDays khi cần', () => {
    expect(toUserStatusBody({ action: 'SUSPEND', durationDays: '3', reason: longReason })).toEqual({
      action: 'SUSPEND',
      durationDays: 3,
      reason: longReason,
    });
    expect(toUserStatusBody({ action: 'BAN', durationDays: '9', reason: longReason }).durationDays).toBeUndefined();
  });

  it('nguyên liệu: calo ≥ 0, quầy và nhóm hợp lệ (MVP không có SEAFOOD)', () => {
    const ok = {
      name: 'Nấm',
      standardUnit: 'g',
      defaultStallType: 'PRODUCE',
      foodGroup: 'PLANT',
      caloriesPer100g: '22',
      isAllium: false,
    };
    expect(ingredientCreateSchema.safeParse(ok).success).toBe(true);
    expect(ingredientCreateSchema.safeParse({ ...ok, caloriesPer100g: '-1' }).success).toBe(false);
    expect(ingredientCreateSchema.safeParse({ ...ok, foodGroup: 'SEAFOOD' }).success).toBe(false);
  });

  it('gói VIP và đối soát', () => {
    expect(planCreateSchema.safeParse({ planName: 'VIP', durationDays: '30', priceVnd: '49000' }).success).toBe(true);
    expect(planCreateSchema.safeParse({ planName: 'VIP', durationDays: '0', priceVnd: '49000' }).success).toBe(false);
    expect(reconcileSchema.safeParse({ transactionId: '3001', action: 'REFUND', reason: longReason }).success).toBe(true);
    expect(reconcileSchema.safeParse({ transactionId: 'x', action: 'REFUND', reason: longReason }).success).toBe(false);
    expect(venueSyncSchema.safeParse({ province: '' }).success).toBe(false);
  });

  it('khoảng ngày: from ≤ to', () => {
    expect(dateRangeSchema.safeParse({ from: '2026-10-02', to: '2026-10-01' }).success).toBe(false);
    expect(dateRangeSchema.safeParse({ from: '2026-10-01', to: '' }).success).toBe(true);
  });
});

describe('tiện ích admin', () => {
  it('cleanParams bỏ giá trị rỗng', () => {
    expect(cleanParams({ a: 1, b: '', c: undefined, d: null, e: false })).toEqual({ a: 1, e: false });
  });
  it('windowed rút gọn dãy trang', () => {
    expect(windowed(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(windowed(1, 2)).toEqual([1, 2]);
  });
  it('circuitView nhận biết trạng thái', () => {
    expect(circuitView('CLOSED').tone).toBe('ok');
    expect(circuitView('open').tone).toBe('bad');
    expect(circuitView(undefined).known).toBe(false);
    expect(circuitView('FOO').text).toContain('FOO');
  });
  it('formatFailedCriteria chấp nhận mảng chuỗi hoặc đối tượng', () => {
    expect(
      formatFailedCriteria({
        failedCriteria: ['Thiếu định lượng', { code: 'VOTES', message: 'Chưa đủ 10 lượt tim' }],
      }),
    ).toEqual(['Thiếu định lượng', 'Chưa đủ 10 lượt tim']);
    expect(formatFailedCriteria(undefined)).toEqual([]);
  });
  it('presetRange', () => {
    const now = new Date(2026, 9, 11);
    expect(presetRange('TODAY', now)).toEqual({ from: '2026-10-11', to: '2026-10-11' });
    expect(presetRange('WEEK', now).from).toBe('2026-10-05');
    expect(presetRange('MONTH', now).from).toBe('2026-10-01');
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
