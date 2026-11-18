import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { createTestQueryClient } from '@/test/test-utils';
import { useResetSetting, useUpdateSetting } from '../hooks/useAdminSettings';

/** Chạy hook với QueryClient riêng; `invalidated()` trả các khóa đã được làm mới dưới dạng chuỗi để so sánh dễ đọc. */
function setup<T>(useHook: () => T) {
  const queryClient = createTestQueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const { result } = renderHook(useHook, { wrapper });
  const invalidated = () => invalidate.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));
  return { result, invalidated };
}

describe('Chỉ số hệ thống: làm mới dữ liệu sau khi lưu', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lưu một mục (VIP): tải lại thẻ gói của Admin và trang Gói VIP vì mọi gói dùng chung hạn mức này', async () => {
    mockApi(() => ({ data: { settingKey: 'CHAT_LIMIT_DAILY_VIP', settingValue: '250' } }));
    const { result, invalidated } = setup(() => useUpdateSetting());
    act(() => result.current.mutate({ key: 'CHAT_LIMIT_DAILY_VIP', body: { settingValue: '250' } }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidated()).toEqual(
      expect.arrayContaining([
        JSON.stringify(['admin', 'subscription-plans']),
        JSON.stringify(['subscription', 'plans']),
        JSON.stringify(['system', 'settings', 'public']),
      ])
    );
  });

  it('khôi phục mặc định một mục (VIP) cũng tải lại các gói', async () => {
    mockApi(() => ({ data: { settingKey: 'FRIDGE_SCAN_LIMIT_DAILY_VIP', settingValue: '30' } }));
    const { result, invalidated } = setup(() => useResetSetting());
    act(() => result.current.mutate('FRIDGE_SCAN_LIMIT_DAILY_VIP'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidated()).toContain(JSON.stringify(['admin', 'subscription-plans']));
  });

  it('mục không phải (VIP) chỉ tải lại chỉ số và cấu hình công khai, không động tới gói', async () => {
    mockApi(() => ({ data: { settingKey: 'CHAT_LIMIT_DAILY_FREE', settingValue: '25' } }));
    const { result, invalidated } = setup(() => useUpdateSetting());
    act(() => result.current.mutate({ key: 'CHAT_LIMIT_DAILY_FREE', body: { settingValue: '25' } }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidated()).toContain(JSON.stringify(['system', 'settings', 'public']));
    expect(invalidated()).not.toContain(JSON.stringify(['admin', 'subscription-plans']));
    expect(invalidated()).not.toContain(JSON.stringify(['subscription', 'plans']));
  });
});
