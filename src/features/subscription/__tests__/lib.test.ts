import { beforeEach, describe, expect, it } from 'vitest';
import { benefitRows, perThirtyDays } from '../lib/benefits';
import { clearPendingOrder, isQrImageUrl, readPendingOrder, safePayUrl, savePendingOrder, type PendingOrder } from '../lib/pendingOrder';
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
  beforeEach(() => sessionStorage.clear());
  it('lưu/đọc theo người dùng', () => {
    savePendingOrder(order);
    expect(readPendingOrder(7)?.transactionId).toBe(3001);
    expect(readPendingOrder(8)).toBeNull();
    clearPendingOrder();
    expect(readPendingOrder(7)).toBeNull();
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
});

describe('benefits & claims', () => {
  it('chatPerDay null của VIP hiển thị theo BR', () => {
    const rows = benefitRows({ free: { chatPerDay: 20, mealPlansPerWeek: 1, fridgePhotosPerDay: 10 }, vip: { chatPerDay: null, mealPlansPerWeek: 3, fridgePhotosPerDay: 30 } });
    expect(rows.vip[0][1]).toBe('tối đa 200 câu/ngày');
    expect(rows.free[0][1]).toBe('20 câu/ngày');
  });
  it('perThirtyDays', () => expect(perThirtyDays(129000, 90)).toBe(43000));
  it('decodeJwtClaims đọc role + isVip', () => {
    const t = `h.${b64({ role: 'VIP', isVip: true })}.s`;
    expect(decodeJwtClaims(t)).toEqual({ role: 'VIP', isVip: true });
    expect(decodeJwtClaims('rác')).toEqual({});
  });
});
