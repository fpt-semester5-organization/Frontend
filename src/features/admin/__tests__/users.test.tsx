import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { mockApi, type MockRequest } from '@/test/mockApi';
import { renderWithProviders } from '@/test/test-utils';
import AdminUserDetailPage from '../pages/AdminUserDetailPage';
import AdminUsersPage from '../pages/AdminUsersPage';

const listUser = {
  userId: 42,
  email: 'an.nguyen@gmail.com',
  fullName: 'Nguyễn An',
  role: 'MEMBER',
  accountStatus: 'ACTIVE',
  createdAt: '2026-09-01T00:00:00',
  dietarySchoolId: 1,
  dietarySchoolName: 'Thuần chay',
  lockedUntil: null,
  countViolationReports: 5,
};

const contents = {
  userId: 42,
  accountStatus: 'ACTIVE',
  lockedUntil: null,
  countViolationReports: 5,
  violationSummary: { resolved: 5, dismissed: 1 },
  items: [{ type: 'COMMENT', id: 301, title: 'Bình luận spam quảng cáo', status: 'QUARANTINED_HIDDEN', createdAt: '2026-10-05T10:00:00' }],
};

beforeEach(() => {
  useAuthStore.setState({
    user: { userId: 1, fullName: 'Admin', email: 'admin@veggielife.vn', role: 'ADMIN', isVip: false },
    accessToken: 't',
    guestToken: null,
  });
});

const renderDetail = () =>
  renderWithProviders(
    <Routes>
      <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
    </Routes>,
    { routerInitialEntries: [{ pathname: '/admin/users/42', state: { user: listUser } }] }
  );

describe('SCR-39 Danh sách người dùng', () => {
  it('gửi bộ lọc lên GET /admin/users và hiện nhãn trạng thái, không hiện mã thô', async () => {
    const calls = mockApi((req) => {
      if (req.url === '/admin/users') return { data: [listUser], meta: { page: 1, size: 20, total: 1 } };
      if (req.url === '/dietary-schools') return { data: [] };
      return undefined;
    });
    renderWithProviders(<AdminUsersPage />, '/admin/users?accountStatus=ACTIVE&keyword=an');

    const row = (await screen.findByText('Nguyễn An', { selector: 'p' })).closest('tr')!;
    expect(within(row).getByText('Hoạt động')).toBeInTheDocument();
    expect(within(row).queryByText('ACTIVE')).not.toBeInTheDocument();
    expect(within(row).getByText('Thuần chay')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: /Chi tiết/ })).toHaveAttribute('href', '/admin/users/42');
    expect(calls.find((c) => c.url === '/admin/users')?.params).toEqual({ keyword: 'an', accountStatus: 'ACTIVE', page: 1, size: 20 });
  });

  it('không có kết quả theo bộ lọc: trạng thái rỗng có nút xóa bộ lọc', async () => {
    mockApi((req) => (req.url === '/admin/users' ? { data: [], meta: { page: 1, size: 20, total: 0 } } : { data: [] }));
    renderWithProviders(<AdminUsersPage />, '/admin/users?role=ADMIN');
    expect(await screen.findByText('Không có người dùng phù hợp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa bộ lọc' })).toBeInTheDocument();
  });
});

describe('SCR-39 Chi tiết người dùng & xử phạt', () => {
  it('hiện nội dung, thống kê vi phạm và mức đề xuất theo thang kỷ luật', async () => {
    mockApi((req) => (req.url === '/admin/users/42/contents' ? { data: contents, meta: { page: 1, size: 20, total: 1 } } : undefined));
    renderDetail();
    expect(await screen.findByText('Bình luận spam quảng cáo')).toBeInTheDocument();
    expect(screen.getByText('Bị ẩn do vi phạm')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nguyễn An' })).toBeInTheDocument();
    expect(screen.getByText(/vi phạm lần 4–6: tạm khóa 03 ngày/i)).toBeInTheDocument();
  });

  it('hiện hậu quả trước khi xác nhận; chỉ gửi PUT sau khi bấm xác nhận', async () => {
    const calls: MockRequest[] = mockApi((req) => {
      if (req.url === '/admin/users/42/contents') return { data: contents, meta: { page: 1, size: 20, total: 1 } };
      if (req.method === 'PUT' && req.url === '/admin/users/42/status')
        return { message: 'Đã cập nhật trạng thái.', data: { userId: 42, accountStatus: 'SUSPENDED', lockedUntil: '2026-10-26T10:00:00', violationCount: 5 } };
      return undefined;
    });
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: /Xử lý tài khoản/ }));

    const dialog = screen.getByRole('dialog');
    // Mặc định chọn đúng mức đề xuất: 5 vi phạm → tạm khóa 3 ngày
    expect(within(dialog).getByRole('radio', { name: 'Tạm khóa tài khoản' })).toBeChecked();
    expect(within(dialog).getByLabelText(/Số ngày áp dụng/)).toHaveValue(3);
    await userEvent.type(within(dialog).getByLabelText(/Lý do/), 'Spam quảng cáo nhiều lần trong bình luận');
    await userEvent.click(within(dialog).getByRole('button', { name: /Xem hậu quả/ }));

    expect(within(dialog).getByText('Hoạt động → Tạm khóa')).toBeInTheDocument();
    expect(within(dialog).getByText(/Đăng xuất khỏi mọi thiết bị/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Gửi email thông báo tạm khóa tới an\.nguyen@gmail\.com/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận tạm khóa tài khoản 3 ngày' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
      action: 'SUSPEND',
      reason: 'Spam quảng cáo nhiều lần trong bình luận',
      durationDays: 3,
    });
  });

  it('lý do dưới 10 ký tự bị chặn ngay tại form', async () => {
    mockApi((req) => (req.url === '/admin/users/42/contents' ? { data: contents } : undefined));
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: /Xử lý tài khoản/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Lý do/), 'ngắn');
    await userEvent.click(within(dialog).getByRole('button', { name: /Xem hậu quả/ }));
    expect(await within(dialog).findByText('Lý do cần ít nhất 10 ký tự')).toBeInTheDocument();
  });

  it('409 ERR_ADM_LAST_ADMIN: hộp thoại với message của server', async () => {
    mockApi((req) => {
      if (req.url === '/admin/users/42/contents') return { data: contents };
      if (req.method === 'PUT')
        return { status: 409, errorCode: 'ERR_ADM_LAST_ADMIN', message: 'Không thể kỷ luật Administrator duy nhất còn hoạt động.' };
      return undefined;
    });
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: /Xử lý tài khoản/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Cảnh cáo' }));
    await userEvent.type(screen.getByLabelText(/Lý do/), 'Nhắc nhở lần đầu về nội dung');
    await userEvent.click(screen.getByRole('button', { name: /Xem hậu quả/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận cảnh cáo' }));
    expect(await screen.findByText('Không thể kỷ luật Administrator duy nhất còn hoạt động.')).toBeInTheDocument();
  });

  it('ERR_ADM_NOT_FOUND: trạng thái "Không tìm thấy người dùng"', async () => {
    mockApi(() => ({ status: 404, errorCode: 'ERR_ADM_NOT_FOUND', message: 'Không tìm thấy người dùng có mã ID #42.' }));
    renderDetail();
    expect(await screen.findByText('Không tìm thấy người dùng')).toBeInTheDocument();
  });
});
