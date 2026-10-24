import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderWithProviders } from '@/test/test-utils';
import AdminSubscriptionPlansPage from '../pages/AdminSubscriptionPlansPage';
import AdminVenuesPage from '../pages/AdminVenuesPage';

const PLAN = { planId: 1, planName: 'VIP 1 tháng', durationDays: 30, priceVnd: 49000, isActive: true };

describe('SCR-44 Gói VIP & đối soát', () => {
  it('chưa có gói: trạng thái rỗng có nút thêm gói', async () => {
    mockApi(() => ({ data: [] }));
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    expect(await screen.findByText('Chưa có gói VIP nào')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm gói đầu tiên' })).toBeInTheDocument();
  });

  it('đổi giá: nhắc giá mới chỉ áp dụng cho đơn mới, PUT chỉ gửi priceVnd', async () => {
    const calls = mockApi((req) => (req.method === 'GET' ? { data: [PLAN] } : { message: 'Đã cập nhật gói.', data: { planId: 1, priceVnd: 45000 } }));
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    expect(await screen.findByText('49.000 ₫')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đổi giá VIP 1 tháng' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.clear(within(dialog).getByLabelText(/Giá mới/));
    await userEvent.type(within(dialog).getByLabelText(/Giá mới/), '45000');
    expect(within(dialog).getByText(/chỉ áp dụng cho đơn hàng tạo sau khi lưu/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu giá mới' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toBeDefined());
    expect(calls.find((c) => c.method === 'PUT')).toMatchObject({ url: '/admin/subscription-plans/1', body: { priceVnd: 45000 } });
  });

  it('ẩn gói: hộp xác nhận nêu hậu quả rồi mới PUT isActive=false', async () => {
    const calls = mockApi((req) => (req.method === 'GET' ? { data: [PLAN] } : { message: 'Đã cập nhật gói.', data: { planId: 1, priceVnd: 49000 } }));
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    await userEvent.click(await screen.findByRole('button', { name: 'Ẩn gói VIP 1 tháng' }));
    expect(screen.getByText(/người dùng không mua mới được. Ai đang dùng gói vẫn giữ nguyên hạn VIP/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ẩn gói' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ isActive: false }));
  });

  it('đối soát: xem hậu quả trước, POST sau khi xác nhận; 409 đã đối soát → hộp thoại', async () => {
    let attempt = 0;
    const calls = mockApi((req) => {
      if (req.method === 'GET') return { data: [PLAN] };
      attempt += 1;
      return attempt === 1
        ? { message: 'Đã đối soát.', data: { transactionId: 3001, status: 'SUCCESS', vipEndsAt: '2026-11-04T23:59:59' } }
        : { status: 409, errorCode: 'ERR_PAY_ALREADY_RECONCILED', message: 'Giao dịch đã được đối soát.' };
    });
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    await screen.findByText('VIP 1 tháng');

    const fill = async () => {
      await userEvent.clear(screen.getByLabelText(/Mã giao dịch/));
      await userEvent.type(screen.getByLabelText(/Mã giao dịch/), '3001');
      await userEvent.click(screen.getByRole('radio', { name: /Bù thời hạn VIP/ }));
      await userEvent.clear(screen.getByLabelText(/^Lý do/));
      await userEvent.type(screen.getByLabelText(/^Lý do/), 'Đã trừ tiền MoMo, biên lai 123456');
      await userEvent.click(screen.getByRole('button', { name: /Xem hậu quả & đối soát/ }));
    };

    await fill();
    expect(screen.getByText(/Tài khoản được nâng lên VIP/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Bù thời hạn VIP' }));
    expect(await screen.findByText('Giao dịch #3001 đã đối soát')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')).toMatchObject({
      url: '/admin/payments/3001/reconcile',
      body: { action: 'COMPENSATE', reason: 'Đã trừ tiền MoMo, biên lai 123456' },
    });

    await fill();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Bù thời hạn VIP' }));
    expect(await screen.findByText('Giao dịch đã được đối soát.')).toBeInTheDocument();
  });
});

describe('SCR-45 Quán chay', () => {
  const VENUE = { venueId: 301, name: 'Cơm chay Tâm An', source: 'HAPPYCOW', isActive: true };

  it('ẩn quán: xác nhận nêu hậu quả, PUT {isActive:false}; hiện nhãn nguồn thay vì mã', async () => {
    const calls = mockApi((req) =>
      req.method === 'GET' ? { data: [VENUE], meta: { page: 1, size: 20, total: 1 } } : { message: 'Đã cập nhật.', data: { venueId: 301, isActive: false } }
    );
    renderWithProviders(<AdminVenuesPage />, '/admin/venues?isActive=true');
    const row = (await screen.findByRole('link', { name: 'Cơm chay Tâm An' })).closest('tr')!;
    expect(within(row).getByText('HappyCow')).toBeInTheDocument();
    expect(calls.find((c) => c.url === '/admin/venues')?.params).toMatchObject({ isActive: true, page: 1, size: 20 });

    await userEvent.click(within(row).getByRole('button', { name: 'Ẩn quán Cơm chay Tâm An' }));
    expect(screen.getByText(/biến mất khỏi bản đồ/)).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ẩn quán' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toMatchObject({ url: '/admin/venues/301', body: { isActive: false } }));
  });

  it('đồng bộ: bắt chọn tỉnh, gửi đúng tên tỉnh và hiện mã job', async () => {
    const calls = mockApi((req) =>
      req.method === 'GET'
        ? { data: [], meta: { page: 1, size: 20, total: 0 } }
        : { status: 202, message: 'Đã xếp job đồng bộ.', data: { jobId: 'sync_20261023_01' } }
    );
    renderWithProviders(<AdminVenuesPage />, '/admin/venues');
    expect(await screen.findByText('Chưa có quán nào trong hệ thống')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xếp job đồng bộ' }));
    expect(screen.getByText('Chọn tỉnh/thành cần đồng bộ.')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/Tỉnh\/thành/), 'Hà Nội');
    await userEvent.click(screen.getByRole('button', { name: 'Xếp job đồng bộ' }));
    expect(await screen.findByText('sync_20261023_01')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')).toMatchObject({ url: '/admin/venues/sync', body: { province: 'Hà Nội' } });
  });
});
