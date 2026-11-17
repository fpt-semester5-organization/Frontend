import { beforeEach, describe, expect, it } from 'vitest';
import { VIP_EXCLUSIVE_FEATURES, benefitRows, mergePlanQuotas, paidDurationDays, parsePlanQuotas, perThirtyDays, quotaRows } from '../lib/benefits';
import { clearPendingOrder, displayStatus, formatCountdown, isQrImageUrl, isSameOrder, payosCheckoutUrl, readPendingOrder, safePayUrl, savePendingOrder, secondsLeft, type PendingOrder } from '../lib/pendingOrder';
import { decodeJwtClaims } from '../lib/sessionClaims';
import { checkoutSchema, parsePlanId } from '../schemas/checkout.schemas';

const order: PendingOrder = { transactionId: 3001, orderCode: 'VL_1', amountVnd: 49000, payUrl: 'https://pay.example/x', expiresAt: '2026-10-05T10:05:00Z', planId: 1, planName: 'VIP 1 tháng', gateway: 'MOMO', userId: 7 };
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

describe('checkout schema', () => {
  it('planId nguyên dương, gateway MOMO|VIETQR', () => {
    expect(checkoutSchema.safeParse({ planId: 1, gateway: 'MOMO' }).success).toBe(true);
    expect(checkoutSchema.safeParse({ planId: 0, gateway: 'MOMO' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ planId: 1.5, gateway: 'MOMO' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ planId: 1, gateway: 'PAYPAL' }).success).toBe(false);
  });
  it('parsePlanId', () => {
    expect(parsePlanId('12')).toBe(12);
    expect(parsePlanId('vip-30')).toBeUndefined();
    expect(parsePlanId('0')).toBeUndefined();
    expect(parsePlanId(undefined)).toBeUndefined();
  });
});

describe('pendingOrder', () => {
  beforeEach(() => localStorage.clear());
  it('lưu/đọc theo người dùng', () => {
    savePendingOrder(order);
    expect(readPendingOrder(7)?.transactionId).toBe(3001);
    expect(readPendingOrder(8)).toBeNull();
    clearPendingOrder();
    expect(readPendingOrder(7)).toBeNull();
  });
  it('đơn PENDING quá 5 phút hiển thị Hết hạn dù server chưa cập nhật; trạng thái khác luôn theo server', () => {
    const createdAt = '2026-11-02T10:00:00Z';
    const at = (time: string) => new Date(time).getTime();
    expect(displayStatus({ status: 'PENDING', createdAt }, at('2026-11-02T10:04:59Z'))).toBe('PENDING');
    expect(displayStatus({ status: 'PENDING', createdAt }, at('2026-11-02T10:05:00Z'))).toBe('EXPIRED');
    expect(displayStatus({ status: 'SUCCESS', createdAt }, at('2026-11-02T10:30:00Z'))).toBe('SUCCESS');
    expect(displayStatus({ status: 'CANCELLED', createdAt }, at('2026-11-02T10:30:00Z'))).toBe('CANCELLED');
  });
  it('createdAt không có múi giờ được coi là UTC; không đọc được thì giữ PENDING', () => {
    const at = (time: string) => new Date(time).getTime();
    expect(displayStatus({ status: 'PENDING', createdAt: '2026-11-02T10:00:00.1234567' }, at('2026-11-02T10:04:00Z'))).toBe('PENDING');
    expect(displayStatus({ status: 'PENDING', createdAt: '2026-11-02T10:00:00.1234567' }, at('2026-11-02T10:06:00Z'))).toBe('EXPIRED');
    expect(displayStatus({ status: 'PENDING', createdAt: 'khong-phai-ngay' }, at('2026-11-02T10:06:00Z'))).toBe('PENDING');
  });
  it('đếm ngược theo expiresAt, không âm', () => {
    const now = new Date('2026-11-02T10:00:00Z').getTime();
    expect(secondsLeft('2026-11-02T10:01:05Z', now)).toBe(65);
    expect(secondsLeft('2026-11-02T09:59:00Z', now)).toBe(0);
    expect(formatCountdown(65)).toBe('01:05');
  });
  it('khớp mã đơn của cổng: PayOS trả phần số của orderCode', () => {
    expect(isSameOrder({ ...order, orderCode: 'VL_1793516377203' }, '1793516377203')).toBe(true);
    expect(isSameOrder({ ...order, orderCode: 'VL_1793516377203' }, 'VL_1793516377203')).toBe(true);
    expect(isSameOrder({ ...order, orderCode: 'VL_1793516377203' }, '999')).toBe(false);
    expect(isSameOrder(order, null)).toBe(false);
    expect(isSameOrder(order, '')).toBe(false);
  });
  it('chỉ chấp nhận http(s) cho payUrl', () => {
    expect(safePayUrl('https://test-payment.momo.vn/pay?x=1')).toBe('https://test-payment.momo.vn/pay?x=1');
    expect(safePayUrl('javascript:alert(1)')).toBeNull();
    expect(safePayUrl('')).toBeNull();
  });
  it('nhận diện URL ảnh QR', () => {
    expect(isQrImageUrl('https://x.vn/qr.png')).toBe(true);
    expect(isQrImageUrl('data:image/png;base64,AAA')).toBe(true);
    expect(isQrImageUrl('https://x.vn/pay')).toBe(false);
  });
  it('chỉ nhúng trang thanh toán đúng host PayOS', () => {
    expect(payosCheckoutUrl('https://pay.payos.vn/web/33d6c5fb')).toBe('https://pay.payos.vn/web/33d6c5fb');
    expect(payosCheckoutUrl('https://pay.payos.vn/web/33d6c5fb/')).toBe('https://pay.payos.vn/web/33d6c5fb/');
    expect(payosCheckoutUrl('https://next.pay.payos.vn/web/33d6c5fb')).toBe('https://next.pay.payos.vn/web/33d6c5fb');
    expect(payosCheckoutUrl('http://pay.payos.vn/web/33d6c5fb')).toBeNull();
    expect(payosCheckoutUrl('https://pay.payos.vn.evil.test/web/33d6c5fb')).toBeNull();
    expect(payosCheckoutUrl('https://pay.payos.vn/other/33d6c5fb')).toBeNull();
    expect(payosCheckoutUrl('https://img.vietqr.io/image/MB-1-compact2.png')).toBeNull();
    expect(payosCheckoutUrl('javascript:alert(1)')).toBeNull();
    expect(payosCheckoutUrl(null)).toBeNull();
  });
});

describe('benefits & claims', () => {
  it('chatPerDay null của VIP hiển thị theo BR', () => {
    const rows = benefitRows({ free: { chatPerDay: 20, mealPlansPerWeek: 1, fridgePhotosPerDay: 10 }, vip: { chatPerDay: null, mealPlansPerWeek: 3, fridgePhotosPerDay: 30 } });
    expect(rows.vip[0][1]).toBe('tối đa 200 câu/ngày');
    expect(rows.free[0][1]).toBe('20 câu/ngày');
  });
  it('perThirtyDays', () => expect(perThirtyDays(129000, 90)).toBe(43000));
  it('paidDurationDays: số ngày đã mua lấy từ ngày hiệu lực của giao dịch', () => {
    // Backend làm tròn hạn tới 23:59:59 UTC
    expect(paidDurationDays('2026-11-03T10:00:00', '2026-12-03T23:59:59')).toBe(30);
    expect(paidDurationDays('2026-11-17T00:00:30Z', '2027-02-15T23:59:59Z')).toBe(90);
    // Dữ liệu cũ chưa làm tròn: hạn = bắt đầu + số ngày
    expect(paidDurationDays('2026-10-05T10:00:00Z', '2026-11-04T10:00:00Z')).toBe(30);
    expect(paidDurationDays(null, '2026-11-04T10:00:00Z')).toBeNull();
    expect(paidDurationDays('2026-11-04T10:00:00Z', '2026-11-04T09:00:00Z')).toBeNull();
  });
  it('parsePlanQuotas đọc hạn mức như Backend: camelCase trước, snake_case sau, không phân biệt hoa thường', () => {
    expect(parsePlanQuotas('{"chatLimitDaily":200,"mealPlanLimitWeekly":3,"fridgeScanLimitDaily":30,"adFree":true}')).toEqual({ chatLimitDaily: 200, mealPlanLimitWeekly: 3, fridgeScanLimitDaily: 30 });
    expect(parsePlanQuotas('{"chat_limit_daily":150,"MEALPLANLIMITWEEKLY":4}')).toEqual({ chatLimitDaily: 150, mealPlanLimitWeekly: 4, fridgeScanLimitDaily: undefined });
    // Backend chỉ nhận số nguyên: giá trị khác bị bỏ qua (dùng cấu hình chung)
    expect(parsePlanQuotas('{"chatLimitDaily":"200","fridgeScanLimitDaily":2.5}')).toEqual({ chatLimitDaily: undefined, mealPlanLimitWeekly: undefined, fridgeScanLimitDaily: undefined });
    expect(parsePlanQuotas('khong-phai-json')).toBeNull();
    expect(parsePlanQuotas('[1,2]')).toBeNull();
    expect(parsePlanQuotas(null)).toBeNull();
  });
  it('mergePlanQuotas ghi đè 3 hạn mức, bỏ khóa trùng nghĩa, giữ cờ đặc quyền và mô tả', () => {
    const merged = JSON.parse(mergePlanQuotas('{"chat_limit_daily":100,"ChatLimitDaily":120,"adFree":true,"description":"V1"}', { chatLimitDaily: 300, mealPlanLimitWeekly: 5, fridgeScanLimitDaily: 50 }));
    expect(merged).toEqual({ chatLimitDaily: 300, mealPlanLimitWeekly: 5, fridgeScanLimitDaily: 50, adFree: true, description: 'V1' });
    expect(JSON.parse(mergePlanQuotas('hỏng', { chatLimitDaily: 1, mealPlanLimitWeekly: 2, fridgeScanLimitDaily: 3 }))).toEqual({ chatLimitDaily: 1, mealPlanLimitWeekly: 2, fridgeScanLimitDaily: 3 });
  });
  it('quotaRows chỉ có dòng cho hạn mức có giá trị; nhãn ngắn cho chỗ hẹp', () => {
    expect(quotaRows({ chatLimitDaily: 300, mealPlanLimitWeekly: 5, fridgeScanLimitDaily: 50 })).toEqual([
      ['Số lần người dùng được hỏi Trợ lý AI', '300 câu/ngày'],
      ['Số lần được tạo Thực đơn tuần', '5 lần/tuần'],
      ['Số lần được dùng tính năng Quét tủ lạnh', '50 ảnh/ngày'],
    ]);
    expect(quotaRows({ fridgeScanLimitDaily: 50 }, { short: true })).toEqual([['Quét tủ lạnh', '50 ảnh/ngày']]);
  });
  it('không quảng cáo xuất PDF thực đơn: Backend chưa có API này', () => {
    expect(VIP_EXCLUSIVE_FEATURES.join(' ')).not.toMatch(/PDF/);
  });
  it('decodeJwtClaims đọc role + isVip', () => {
    const t = `h.${b64({ role: 'VIP', isVip: true })}.s`;
    expect(decodeJwtClaims(t)).toEqual({ role: 'VIP', isVip: true });
    expect(decodeJwtClaims('rác')).toEqual({});
  });
});
