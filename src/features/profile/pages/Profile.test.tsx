import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderPage } from '@/test/utils';
import { useAuthStore } from '@/stores/auth.store';
import { me, mockProfileApi, signInAsMember, toastMessages } from '../test/profileFixtures';
import Profile from './Profile';

const writes = (calls: { method: string }[]) => calls.filter((c) => c.method !== 'GET');

const renderProfile = () =>
  renderPage(
    <Routes>
      <Route path="/me" element={<Profile />} />
      <Route path="/" element={<p>Trang chủ</p>} />
    </Routes>,
    { route: '/me' }
  );

beforeAll(() => {
  URL.createObjectURL = () => 'blob:preview';
  URL.revokeObjectURL = () => {};
});
beforeEach(() => signInAsMember());

describe('Profile (SCR-07)', () => {
  it('hiện thông tin tài khoản, chỉ số thể trạng, trường phái và dị ứng', async () => {
    mockProfileApi();
    renderProfile();
    expect(screen.getByRole('status', { name: 'Đang tải hồ sơ' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Nguyễn An' })).toBeInTheDocument();
    const account = within(screen.getByRole('region', { name: 'Thông tin tài khoản' }));
    expect(account.getByText('an.nguyen@gmail.com')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Chỉ số thể trạng' })).getByText('20,8')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Trường phái & dị ứng' })).getByText('Đậu phộng')).toBeInTheDocument();
  });

  it('chưa có hồ sơ sức khỏe thì mời lập hồ sơ', async () => {
    mockProfileApi(undefined, () => me({ health: null, allergens: [] }));
    renderProfile();
    expect(await screen.findByRole('link', { name: 'Lập hồ sơ sức khỏe' })).toHaveAttribute('href', '/me/health');
    expect(screen.getByText('Chưa khai báo dị ứng.')).toBeInTheDocument();
  });

  it('sửa thông tin: số điện thoại sai báo ngay, đúng thì PATCH và cập nhật tên trên header', async () => {
    const calls = mockProfileApi((req) =>
      req.method === 'PATCH' ? { message: 'Cập nhật thông tin thành công.', data: { userId: 1024, fullName: 'Nguyễn Thị An', phoneNumber: '0987654321' } } : undefined
    );
    renderProfile();
    await userEvent.click(await screen.findByRole('button', { name: /Chỉnh sửa/ }));
    const phone = screen.getByLabelText('Số điện thoại');
    await userEvent.clear(phone);
    await userEvent.type(phone, '0123');
    await userEvent.tab();
    expect(screen.getByText('Số điện thoại gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }));
    expect(writes(calls)).toHaveLength(0);

    await userEvent.clear(phone);
    await userEvent.type(phone, '0987654321');
    const name = screen.getByLabelText(/Họ và tên/);
    await userEvent.clear(name);
    await userEvent.type(name, 'Nguyễn Thị An');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }));
    await waitFor(() => expect(writes(calls)[0]).toMatchObject({ method: 'PATCH', url: '/users/me', body: { fullName: 'Nguyễn Thị An', phoneNumber: '0987654321' } }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Nguyễn Thị An' })).toBeInTheDocument();
    expect(useAuthStore.getState().user?.fullName).toBe('Nguyễn Thị An');
    expect(toastMessages()).toContain('Cập nhật thông tin thành công.');
  });

  it('ảnh đại diện sai định dạng báo ngay; ảnh hợp lệ thì tải lên', async () => {
    const calls = mockProfileApi((req) =>
      req.url === '/users/me/avatar' ? { message: 'Cập nhật ảnh đại diện thành công.', data: { avatarUrl: 'https://cdn.example/a.webp' } } : undefined
    );
    renderProfile();
    const input = await screen.findByLabelText('Chọn ảnh đại diện');
    await userEvent.upload(input, new File(['x'], 'cv.pdf', { type: 'application/pdf' }), { applyAccept: false });
    expect(screen.getByText('Ảnh đại diện phải là JPEG, PNG hoặc WEBP.')).toBeInTheDocument();
    expect(writes(calls)).toHaveLength(0);

    await userEvent.upload(input, new File(['png'], 'me.png', { type: 'image/png' }));
    expect(await screen.findByRole('img', { name: 'Ảnh đại diện của Nguyễn An' })).toHaveAttribute('src', 'https://cdn.example/a.webp');
    expect(useAuthStore.getState().user?.avatarUrl).toBe('https://cdn.example/a.webp');
  });

  it('413 khi tải ảnh thì báo tại ô chọn ảnh', async () => {
    mockProfileApi((req) => (req.url === '/users/me/avatar' ? { status: 413, errorCode: 'ERR_MEDIA_FILE_TOO_LARGE', message: 'Tệp > 5 MB.' } : undefined));
    renderProfile();
    await userEvent.upload(await screen.findByLabelText('Chọn ảnh đại diện'), new File(['png'], 'me.png', { type: 'image/png' }));
    expect(await screen.findByText('Tệp > 5 MB.')).toBeInTheDocument();
  });

  it('vô hiệu hóa tài khoản: thiếu hoặc sai mật khẩu báo tại ô; đúng thì về trang chủ và đăng xuất', async () => {
    let attempts = 0;
    const calls = mockProfileApi((req) => {
      if (req.method !== 'DELETE') return undefined;
      attempts++;
      return attempts === 1
        ? { status: 401, errorCode: 'ERR_AUTH_INVALID_CREDENTIALS', message: 'Mật khẩu xác nhận không đúng.' }
        : { message: 'Tài khoản đã được vô hiệu hóa. Bạn có 30 ngày để khôi phục.', data: { restoreDeadline: '2026-11-16T16:59:59Z' } };
    });
    renderProfile();
    await userEvent.click(await screen.findByRole('button', { name: 'Vô hiệu hóa tài khoản' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Vô hiệu hóa' }));
    expect(within(dialog).getByText('Nhập mật khẩu để xác nhận.')).toBeInTheDocument();
    expect(writes(calls)).toHaveLength(0);

    await userEvent.type(within(dialog).getByLabelText(/Mật khẩu/), 'sai');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Vô hiệu hóa' }));
    expect(await within(dialog).findByText('Mật khẩu xác nhận không đúng.')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    await userEvent.clear(within(dialog).getByLabelText(/Mật khẩu/));
    await userEvent.type(within(dialog).getByLabelText(/Mật khẩu/), 'dung-mat-khau');
    await userEvent.type(within(dialog).getByLabelText(/Lý do/), 'Tạm nghỉ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Vô hiệu hóa' }));
    expect(await screen.findByText('Trang chủ')).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
    expect(writes(calls)[1]).toMatchObject({ method: 'DELETE', url: '/users/me', body: { confirmPassword: 'dung-mat-khau', reason: 'Tạm nghỉ' } });
    expect(toastMessages().at(-1)).toMatch(/Hạn khôi phục: 16\/11\/2026/);
  });
});
