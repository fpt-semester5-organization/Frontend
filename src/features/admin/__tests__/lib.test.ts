import { describe, expect, it } from 'vitest';
import { parseServerDate } from '@/lib/serverDate';
import { ALL_FEATURES, OTHER_FEATURE, budgetLevel, buildCostMatrix, featureColor, niceTicks } from '../lib/llmops';
import { blockedReason, recommendSanction, sanctionConsequences, type SanctionTarget } from '../lib/sanctions';

const member = (patch: Partial<SanctionTarget> = {}): SanctionTarget => ({
  userId: 42,
  email: 'an@x.vn',
  role: 'MEMBER',
  accountStatus: 'ACTIVE',
  countViolationReports: 0,
  ...patch,
});

describe('Thang kỷ luật BR-ADM-USR-002', () => {
  it.each([
    [0, null, undefined],
    [1, 'WARN', undefined],
    [3, 'WARN', undefined],
    [4, 'SUSPEND', 3],
    [6, 'SUSPEND', 3],
    [7, 'SUSPEND', 10],
    [9, 'SUSPEND', 10],
    [10, 'SUSPEND', 30],
    [12, 'SUSPEND', 30],
    [13, 'BAN', undefined],
    [40, 'BAN', undefined],
  ])('%i vi phạm → %s %s ngày', (count, action, days) => {
    const result = recommendSanction(count);
    expect(result?.action ?? null).toBe(action);
    expect(result?.durationDays).toBe(days);
  });
});

describe('Mức không được chọn (trùng 409 của Backend + BR-ADM-USR-001/003)', () => {
  it('không mở lại tài khoản đang hoạt động, không cấm lại tài khoản đã cấm', () => {
    expect(blockedReason('REACTIVATE', member())).toMatch(/đang hoạt động/);
    expect(blockedReason('BAN', member({ accountStatus: 'BANNED' }))).toMatch(/đã bị cấm/);
    expect(blockedReason('REACTIVATE', member({ accountStatus: 'BANNED' }))).toBeNull();
  });

  it('Admin không tự xử phạt mình; tài khoản đã ẩn danh không thao tác được', () => {
    expect(blockedReason('SUSPEND', member(), 42)).toMatch(/chính mình/);
    expect(blockedReason('SUSPEND', member(), 1)).toBeNull();
    expect(blockedReason('REACTIVATE', member({ accountStatus: 'ANONYMIZED_DELETED' }))).toMatch(/ẩn danh/);
  });
});

describe('Hậu quả trước khi xác nhận', () => {
  const now = new Date('2026-10-23T03:00:00Z');

  it('tạm khóa: hạn = bây giờ + số ngày, đăng xuất mọi thiết bị, gửi email', () => {
    const result = sanctionConsequences('SUSPEND', member(), 3, now);
    expect(result.nextStatus).toBe('SUSPENDED');
    expect(result.lockedUntil?.toISOString()).toBe('2026-10-26T03:00:00.000Z');
    expect(result.effects.join(' ')).toMatch(/26\/10\/2026 10:00/);
    expect(result.effects.join(' ')).toMatch(/Đăng xuất khỏi mọi thiết bị/);
    expect(result.effects.join(' ')).toMatch(/an@x\.vn/);
  });

  it('cảnh cáo giữ nguyên trạng thái; tài khoản chưa kích hoạt thì Backend chuyển sang hoạt động', () => {
    expect(sanctionConsequences('WARN', member(), undefined, now).nextStatus).toBe('ACTIVE');
    const pending = sanctionConsequences('WARN', member({ accountStatus: 'PENDING_ACTIVATION' }), undefined, now);
    expect(pending.nextStatus).toBe('ACTIVE');
    expect(pending.effects.join(' ')).toMatch(/chưa kích hoạt sẽ được chuyển/);
  });

  it('hạn chế bình luận báo rõ hệ thống hiện chặn cả đăng nhập', () => {
    const result = sanctionConsequences('RESTRICT_COMMENT', member(), 7, now);
    expect(result.nextStatus).toBe('QUARANTINED');
    expect(result.effects.some((e) => e.startsWith('Lưu ý') && /chặn đăng nhập/.test(e))).toBe(true);
  });

  it('cấm vĩnh viễn không có hạn, mở lại xóa hạn khóa', () => {
    expect(sanctionConsequences('BAN', member(), undefined, now)).toMatchObject({ nextStatus: 'BANNED', lockedUntil: null });
    expect(sanctionConsequences('REACTIVATE', member({ accountStatus: 'SUSPENDED' }), undefined, now)).toMatchObject({
      nextStatus: 'ACTIVE',
      lockedUntil: null,
    });
  });
});

describe('Gom series chi phí LLMOps', () => {
  it('cộng đúng điểm trùng (ngày, tính năng), ngày tăng dần, tính năng theo thứ tự cố định', () => {
    const matrix = buildCostMatrix([
      { date: '2026-10-06', feature: 'MEAL_PLAN_GEN', tokens: 500, costUsd: 0.5 },
      { date: '2026-10-05', feature: 'AI_CHAT', tokens: 1000, costUsd: 1.25 },
      { date: '2026-10-05', feature: 'AI_CHAT', tokens: 200, costUsd: 0.25 },
      { date: '2026-10-05', feature: 'MEAL_PLAN_GEN', tokens: 300, costUsd: 2 },
    ]);
    expect(matrix.dates).toEqual(['2026-10-05', '2026-10-06']);
    expect(matrix.features).toEqual(['AI_CHAT', 'MEAL_PLAN_GEN']);
    expect(matrix.cells['2026-10-05'].AI_CHAT).toEqual({ costUsd: 1.5, tokens: 1200 });
    expect(matrix.dayTotals['2026-10-05']).toEqual({ costUsd: 3.5, tokens: 1500 });
    expect(matrix.total).toEqual({ costUsd: 4, tokens: 2000 });
    expect(matrix.maxDayCost).toBe(3.5);
  });

  it('tính năng lạ gộp "Khác" (không sinh màu mới); thiếu feature (groupBy=DAY) là "Tất cả"', () => {
    const matrix = buildCostMatrix([
      { date: '2026-10-05', feature: 'NEW_THING', tokens: 1, costUsd: 1 },
      { date: '2026-10-05', feature: null, tokens: 1, costUsd: 1 },
    ]);
    expect(matrix.features).toEqual([ALL_FEATURES, OTHER_FEATURE]);
    expect(featureColor('AI_CHAT')).not.toBe(featureColor('MEAL_PLAN_GEN'));
    expect(featureColor('NEW_THING')).toBe(featureColor(OTHER_FEATURE));
  });

  it('ngưỡng ngân sách BR-ADM-AI-001: 80% cảnh báo, 100% hạ tải', () => {
    expect(budgetLevel(79.9)).toBe('ok');
    expect(budgetLevel(80)).toBe('warning');
    expect(budgetLevel(99.99)).toBe('warning');
    expect(budgetLevel(100)).toBe('throttled');
  });

  it('trục y có mốc tròn và phủ giá trị lớn nhất', () => {
    expect(niceTicks(12.4)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(0.37).at(-1)).toBeGreaterThanOrEqual(0.37);
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});

describe('parseServerDate', () => {
  it('chuỗi không có múi giờ coi là UTC; có Z hoặc offset giữ nguyên', () => {
    expect(parseServerDate('2026-10-26T10:00:00')?.toISOString()).toBe('2026-10-26T10:00:00.000Z');
    expect(parseServerDate('2026-10-26T10:00:00.123')?.toISOString()).toBe('2026-10-26T10:00:00.123Z');
    expect(parseServerDate('2026-10-26T10:00:00+07:00')?.toISOString()).toBe('2026-10-26T03:00:00.000Z');
    expect(parseServerDate(null)).toBeNull();
    expect(parseServerDate('rác')).toBeNull();
  });
});
