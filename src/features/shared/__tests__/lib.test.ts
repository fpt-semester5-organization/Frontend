import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGuestStore } from '@/stores/guest.store';
import { addDays, isMonday, nextMonday, parseLocalIsoDate, toLocalIsoDate } from '../lib/dates';
import { mergeGuestQuota } from '../lib/guestQuota';
import { isQuotaCode, toProblem } from '../lib/problem';
import { apiError } from '../test-utils';

describe('toProblem', () => {
  it('đọc errorCode + message + details từ envelope lỗi', () => {
    const e = apiError(400, 'ERR_VALIDATION', 'Sai dữ liệu');
    (e.response!.data as { details?: unknown }).details = [{ field: 'barcode', message: 'Sai định dạng' }];
    const p = toProblem(e);
    expect(p.status).toBe(400);
    expect(p.code).toBe('ERR_VALIDATION');
    expect(p.message).toBe('Sai dữ liệu');
    expect(p.fields).toEqual({ barcode: 'Sai định dạng' });
  });
  it('503 không có message: dùng thông báo AI gián đoạn, đánh dấu upstream', () => {
    const e = apiError(503, '', '');
    const p = toProblem(e);
    expect(p.upstream).toBe(true);
    expect(p.message).toMatch(/AI tạm thời không khả dụng/);
  });
  it('ECONNABORTED là timeout, không có response là offline', () => {
    const config = { headers: {} } as InternalAxiosRequestConfig;
    expect(toProblem(new AxiosError('t', 'ECONNABORTED', config)).timeout).toBe(true);
    expect(toProblem(new AxiosError('n', 'ERR_NETWORK', config)).offline).toBe(true);
  });
  it('nhận diện mã hạn mức', () => {
    expect(isQuotaCode('ERR_QUOTA_AI_EXCEEDED')).toBe(true);
    expect(isQuotaCode('ERR_VIP_REQUIRED')).toBe(true);
    expect(isQuotaCode('ERR_VALIDATION')).toBe(false);
  });
});

describe('mergeGuestQuota', () => {
  beforeEach(() => useGuestStore.setState({ quota: null }));
  it('gộp từng bộ đếm, giữ phần còn lại; bỏ qua nếu không phải Khách', () => {
    mergeGuestQuota({ ai: { limit: 3, used: 1, remaining: 2 } }, true);
    mergeGuestQuota({ barcodeDaily: { limit: 3, used: 3, remaining: 0 } }, true);
    const q = useGuestStore.getState().quota!;
    expect(q.ai.remaining).toBe(2);
    expect(q.barcodeDaily.remaining).toBe(0);
    mergeGuestQuota({ ai: { limit: 3, used: 3, remaining: 0 } }, false);
    expect(useGuestStore.getState().quota!.ai.remaining).toBe(2);
  });
});

describe('dates', () => {
  it('định dạng theo giờ địa phương, không lệch UTC', () => {
    expect(toLocalIsoDate(new Date(2026, 9, 12, 0, 30))).toBe('2026-10-12');
  });
  it('nextMonday trả Thứ Hai gần nhất', () => {
    const sun = new Date(2026, 9, 11); // Chủ nhật
    expect(toLocalIsoDate(nextMonday(sun))).toBe('2026-10-12');
    const mon = new Date(2026, 9, 12);
    expect(toLocalIsoDate(nextMonday(mon))).toBe('2026-10-12');
    expect(toLocalIsoDate(nextMonday(mon, false))).toBe('2026-10-19');
    expect(isMonday(nextMonday(new Date(2026, 9, 14)))).toBe(true);
  });
  it('parseLocalIsoDate từ chối ngày không tồn tại', () => {
    expect(parseLocalIsoDate('2026-02-30')).toBeNull();
    expect(parseLocalIsoDate('abc')).toBeNull();
    expect(toLocalIsoDate(addDays(parseLocalIsoDate('2026-10-12')!, 6))).toBe('2026-10-18');
  });
});
