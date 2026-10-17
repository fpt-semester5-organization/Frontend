import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderPage } from '@/test/utils';
import { useAuthStore } from '@/stores/auth.store';
import { mockProfileApi, signInAsMember, toastMessages } from '../test/profileFixtures';
import { DeactivateAccountCard } from './DeactivateAccountCard';

const writes = (calls: { method: string }[]) => calls.filter((c) => c.method !== 'GET');

// Luồng đầy đủ khi Backend có DELETE /users/me (FN-PROF-07); trên trang /me thẻ đang bị khóa.
const renderCard = () =>
  renderPage(
    <Routes>
      <Route path="/me" element={<DeactivateAccountCard available />} />
      <Route path="/" element={<p>Trang chủ</p>} />
    </Routes>,
    { route: '/me' }
  );

beforeEach(() => signInAsMember());

describe('DeactivateAccountCard (FN-PROF-07)', () => {
  it('thiếu hoặc sai mật khẩu báo tại ô; đúng thì về trang chủ và đăng xuất', async () => {
    let attempts = 0;
    const calls = mockProfileApi((req) => {
      if (req.method !== 'DELETE') return undefined;
      attempts++;
      return attempts === 1
        ? { status: 401, errorCode: 'ERR_AUTH_INVALID_CREDENTIALS', message: 'Mật khẩu xác nhận không đúng.' }
        : { message: 'Tài khoản đã được vô hiệu hóa. Bạn có 30 ngày để khôi phục.', data: { restoreDeadline: '2026-11-16T16:59:59Z' } };
    });
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'Vô hiệu hóa tài khoản' }));
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
