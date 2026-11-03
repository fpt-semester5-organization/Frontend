import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderWithProviders } from '@/test/test-utils';
import AdminSubscriptionPlansPage from '../pages/AdminSubscriptionPlansPage';

const MOCK_SETTING = {
  settingKey: 'MEAL_SWAP_LIMIT_DRAFT',
  settingValue: '21',
  defaultValue: '21',
  dataType: 'INT',
  category: 'MEAL_PLAN',
  description: 'Hạn mức đổi món khi dự thảo',
  updatedAt: '2026-11-03T10:00:00Z',
};

const MOCK_TX = {
  transactionId: 5001,
  partnerTransactionCode: 'MM5001',
  userId: 202,
  userFullName: 'Hoàng Thị Hoa',
  userEmail: 'hoanghoa@example.com',
  planId: 1,
  planName: 'Gói VIP 1 Tháng',
  planDurationDays: 30,
  gatewayProvider: 'MOMO',
  amountVnd: 49000,
  transactionStatus: 'PENDING',
  createdAt: '2026-11-03T10:00:00Z',
  startsAt: '2026-11-03T10:00:00Z',
  endsAt: '2026-12-03T10:00:00Z',
  canApprove: true,
  canReconcile: true,
};

describe('Phân hệ Gói VIP, Đối soát & Cấu hình chỉ số hệ thống (SCR-44 / FN-ADM-20)', () => {
  it('chuyển đổi tab: hiển thị Chỉ số hệ thống khi bấm tab', async () => {
    mockApi((req) => {
      if (req.url.includes('/admin/subscription-plans')) return { data: [] };
      if (req.url.includes('/admin/settings')) return { data: [MOCK_SETTING] };
      return { data: [] };
    });

    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');

    // Chuyển sang Tab Chỉ số hệ thống
    const tabBtn = screen.getByRole('tab', { name: /Chỉ số hệ thống/ });
    expect(tabBtn).toBeInTheDocument();
    await userEvent.click(tabBtn);

    // Kiểm tra render nhóm thực đơn và setting
    expect(await screen.findByText('Hạn mức Thực đơn & Đổi món')).toBeInTheDocument();
    expect(screen.getByLabelText(/Đổi món khi Dự thảo/)).toHaveValue(21);
  });

  it('cập nhật chỉ số hệ thống: gửi PUT /admin/settings/{key}', async () => {
    const calls = mockApi((req) => {
      if (req.url.includes('/admin/subscription-plans')) return { data: [] };
      if (req.url.includes('/admin/settings') && req.method === 'GET') return { data: [MOCK_SETTING] };
      if (req.method === 'PUT') return { message: 'Đã cập nhật cấu hình hệ thống.', data: { ...MOCK_SETTING, settingValue: '25' } };
      return { data: [] };
    });

    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans?tab=settings');

    const input = await screen.findByLabelText(/Đổi món khi Dự thảo/);
    await userEvent.clear(input);
    await userEvent.type(input, '25');

    const saveBtn = screen.getByRole('button', { name: /Lưu/ });
    await userEvent.click(saveBtn);

    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toBeDefined());
    const putCall = calls.find((c) => c.method === 'PUT');
    expect(putCall?.url).toContain('/admin/settings/MEAL_SWAP_LIMIT_DRAFT');
    expect(putCall?.body).toEqual({ settingValue: '25' });
  });

  it('tab giao dịch: hiển thị danh sách đơn dạng lịch sử thuần túy (không có nút duyệt hay đối soát)', async () => {
    mockApi((req) => {
      if (req.url.includes('/admin/subscription-plans')) return { data: [] };
      if (req.url.includes('/admin/payments')) {
        return {
          data: [MOCK_TX],
          meta: { page: 1, size: 15, total: 1 },
        };
      }
      return { data: [] };
    });

    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans?tab=transactions');

    expect(await screen.findByText('Hoàng Thị Hoa')).toBeInTheDocument();
    expect(screen.getByText('#5001')).toBeInTheDocument();
    expect(screen.getByText('49.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('MOMO')).toBeInTheDocument();
    expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument();

    // Đảm bảo không có cột hoặc nút Duyệt / Đối soát
    expect(screen.queryByRole('button', { name: /Duyệt/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đối soát/ })).not.toBeInTheDocument();
  });

  it('tài liệu pháp lý: bấm Xem sẽ mở modal xem trước PDF trên màn hình', async () => {
    const MOCK_LEGAL_SETTING = {
      settingKey: 'LEGAL_TERMS_OF_SERVICE_URL',
      settingValue: 'https://res.cloudinary.com/demo/image/upload/terms_of_service.pdf',
      defaultValue: 'https://res.cloudinary.com/demo/image/upload/terms_of_service.pdf',
      dataType: 'STRING',
      category: 'GENERAL',
      description: 'Điều khoản dịch vụ',
      updatedAt: '2026-11-03T10:00:00Z',
    };

    mockApi((req) => {
      if (req.url.includes('/admin/subscription-plans')) return { data: [] };
      if (req.url.includes('/admin/settings')) return { data: [MOCK_LEGAL_SETTING] };
      return { data: [] };
    });

    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans?tab=settings');

    expect(await screen.findByText('Tài liệu Pháp lý & Chính sách')).toBeInTheDocument();
    expect(screen.getByText('Điều khoản dịch vụ & Quy chuẩn cộng đồng')).toBeInTheDocument();

    const viewBtn = screen.getByRole('button', { name: /Xem/ });
    await userEvent.click(viewBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('terms_of_service.pdf').length).toBeGreaterThan(0);
    expect(screen.getByTitle(/Tài liệu: Điều khoản dịch vụ/)).toBeInTheDocument();
  });
});
