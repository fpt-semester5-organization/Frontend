import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderWithProviders } from '@/test/test-utils';
import AdminSubscriptionPlansPage from '../pages/AdminSubscriptionPlansPage';

const PLAN = {
  planId: 1,
  planName: 'VIP 1 tháng',
  durationDays: 30,
  priceVnd: 49000,
  isActive: true,
};

describe('SCR-44 Gói VIP & Cấu hình quản trị', () => {
  it('chưa có gói: trạng thái rỗng có nút thêm gói đầu tiên', async () => {
    mockApi(() => ({ data: [] }));
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    expect(await screen.findByText('Chưa có gói VIP nào')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm gói đầu tiên' })).toBeInTheDocument();
  });

  it('hiển thị mặc định dạng thẻ (Card View) với đầy đủ thông số và các nút thao tác', async () => {
    mockApi(() => ({ data: [PLAN] }));
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    expect(await screen.findByText('VIP 1 tháng')).toBeInTheDocument();
    expect(screen.getByText('30 ngày')).toBeInTheDocument();
    expect(screen.getByText('49.000 ₫')).toBeInTheDocument();
    expect(screen.getByText(/≈ 49.000 ₫ \/ 30 ngày/)).toBeInTheDocument();
    expect(screen.getByText('Chọn gói')).toBeInTheDocument();

    // Các nút thao tác quản trị
    expect(screen.getByRole('button', { name: 'Sửa VIP 1 tháng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đổi giá VIP 1 tháng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ẩn gói VIP 1 tháng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa VIP 1 tháng' })).toBeInTheDocument();
  });

  it('chuyển đổi linh hoạt giữa dạng thẻ (Card) và dạng bảng (Table)', async () => {
    mockApi(() => ({ data: [PLAN] }));
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    expect(await screen.findByText('VIP 1 tháng')).toBeInTheDocument();

    // Chuyển sang dạng bảng chi tiết
    await userEvent.click(screen.getByRole('button', { name: 'Xem dạng bảng' }));
    expect(screen.getByRole('region', { name: 'Danh sách gói VIP' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();

    // Chuyển lại sang dạng thẻ người dùng
    await userEvent.click(screen.getByRole('button', { name: 'Xem dạng thẻ' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('VIP 1 tháng')).toBeInTheDocument();
  });

  it('đổi giá nhanh: nhắc giá mới chỉ áp dụng cho đơn mới, PUT priceVnd', async () => {
    const calls = mockApi((req) =>
      req.method === 'GET'
        ? { data: [PLAN] }
        : { message: 'Đã cập nhật giá gói.', data: { planId: 1, priceVnd: 45000 } }
    );
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    expect(await screen.findByText('VIP 1 tháng')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Đổi giá VIP 1 tháng' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.clear(within(dialog).getByLabelText(/Giá mới/));
    await userEvent.type(within(dialog).getByLabelText(/Giá mới/), '45000');
    expect(within(dialog).getByText(/chỉ áp dụng cho đơn hàng tạo sau khi lưu/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu giá mới' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toBeDefined());
    expect(calls.find((c) => c.method === 'PUT')).toMatchObject({
      url: '/admin/subscription-plans/1',
      body: { priceVnd: 45000 },
    });
  });

  it('sửa toàn diện gói VIP: chỉnh sửa tên, thời hạn, giá và trạng thái kèm live preview', async () => {
    const calls = mockApi((req) =>
      req.method === 'GET'
        ? { data: [PLAN] }
        : { message: 'Đã cập nhật gói.', data: { planId: 1, priceVnd: 59000 } }
    );
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    expect(await screen.findByText('VIP 1 tháng')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sửa VIP 1 tháng' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Hình dạng gói khi hiển thị cho người dùng/)).toBeInTheDocument();

    await userEvent.clear(within(dialog).getByRole('textbox', { name: /^Tên gói/ }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Tên gói/ }), 'Gói VIP 1 Tháng Nâng Cao');
    await userEvent.clear(within(dialog).getByRole('spinbutton', { name: /^Thời hạn/ }));
    await userEvent.type(within(dialog).getByRole('spinbutton', { name: /^Thời hạn/ }), '45');
    await userEvent.clear(within(dialog).getByRole('spinbutton', { name: /^Giá bán/ }));
    await userEvent.type(within(dialog).getByRole('spinbutton', { name: /^Giá bán/ }), '59000');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toBeDefined());
    expect(calls.find((c) => c.method === 'PUT')).toMatchObject({
      url: '/admin/subscription-plans/1',
      body: {
        planName: 'Gói VIP 1 Tháng Nâng Cao',
        durationDays: 45,
        priceVnd: 59000,
        isActive: true,
      },
    });
  });

  it('ẩn gói: hộp xác nhận nêu rõ hậu quả rồi mới PUT isActive=false', async () => {
    const calls = mockApi((req) =>
      req.method === 'GET'
        ? { data: [PLAN] }
        : { message: 'Đã cập nhật gói.', data: { planId: 1, priceVnd: 49000 } }
    );
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    await userEvent.click(await screen.findByRole('button', { name: 'Ẩn gói VIP 1 tháng' }));
    expect(
      screen.getByText(/người dùng không mua mới được. Ai đang dùng gói vẫn giữ nguyên hạn VIP/)
    ).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ẩn gói' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ isActive: false }));
  });

  it('xóa gói VIP: mở modal xác nhận rồi gọi DELETE', async () => {
    const calls = mockApi((req) =>
      req.method === 'GET'
        ? { data: [PLAN] }
        : { message: 'Đã xóa gói VIP thành công.' }
    );
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    expect(await screen.findByText('VIP 1 tháng')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Xóa VIP 1 tháng' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Bạn có chắc chắn muốn xóa gói/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Lưu ý: Nếu gói này đã có giao dịch phát sinh/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận xóa' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'DELETE')).toBeDefined());
    expect(calls.find((c) => c.method === 'DELETE')).toMatchObject({
      url: '/admin/subscription-plans/1',
    });
  });

  it('tạo mới gói VIP: nhập form có Live Preview và gửi POST', async () => {
    const calls = mockApi((req) =>
      req.method === 'GET'
        ? { data: [PLAN] }
        : { message: 'Đã tạo gói.', data: { planId: 2 } }
    );
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');
    expect(await screen.findByText('VIP 1 tháng')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Thêm gói/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Hình dạng gói khi hiển thị cho người dùng/)).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText(/Tên gói/), 'Gói VIP 3 Tháng Mới');
    await userEvent.clear(within(dialog).getByLabelText(/Thời hạn/));
    await userEvent.type(within(dialog).getByLabelText(/Thời hạn/), '90');
    await userEvent.clear(within(dialog).getByLabelText(/Giá bán/));
    await userEvent.type(within(dialog).getByLabelText(/Giá bán/), '129000');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo gói' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')).toBeDefined());
    expect(calls.find((c) => c.method === 'POST')).toMatchObject({
      url: '/admin/subscription-plans',
      body: {
        planName: 'Gói VIP 3 Tháng Mới',
        durationDays: 90,
        priceVnd: 129000,
      },
    });
  });

  it('đã loại bỏ phần Đối soát giao dịch và dùng chuẩn từ Cấu hình gói VIP (không dùng gói thuê bao)', async () => {
    mockApi(() => ({ data: [PLAN] }));
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');

    // Đã đổi sang "Cấu hình gói VIP"
    expect(await screen.findByRole('heading', { level: 2, name: 'Cấu hình gói VIP' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Cấu hình gói VIP/ })).toBeInTheDocument();

    // Không còn từ "thuê bao"
    expect(screen.queryByText(/gói thuê bao/i)).not.toBeInTheDocument();

    // Không còn phần "Đối soát giao dịch"
    expect(screen.queryByText('Đối soát giao dịch')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xem hậu quả & đối soát/ })).not.toBeInTheDocument();
  });

  it('cho phép đổi vị trí các thẻ gói VIP bằng nút di chuyển và kéo thả', async () => {
    const PLAN2 = { planId: 2, planName: 'VIP 3 tháng', durationDays: 90, priceVnd: 129000, isActive: true };
    mockApi(() => ({ data: [PLAN, PLAN2] }));
    renderWithProviders(<AdminSubscriptionPlansPage />, '/admin/subscription-plans');

    expect(await screen.findByText('VIP 1 tháng')).toBeInTheDocument();
    expect(screen.getByText('VIP 3 tháng')).toBeInTheDocument();

    // Thẻ đầu tiên có nút chuyển sang phải
    const moveRightBtn = screen.getByRole('button', { name: 'Chuyển VIP 1 tháng sang phải' });
    expect(moveRightBtn).toBeInTheDocument();

    // Bấm đổi vị trí
    await userEvent.click(moveRightBtn);

    // Xuất hiện nút "Đặt lại thứ tự"
    expect(screen.getByRole('button', { name: 'Đặt lại thứ tự' })).toBeInTheDocument();

    // Khôi phục lại thứ tự ban đầu
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại thứ tự' }));
    expect(screen.queryByRole('button', { name: 'Đặt lại thứ tự' })).not.toBeInTheDocument();
  });
});
