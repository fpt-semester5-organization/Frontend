import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { PATHS } from '@/routes/paths';
import { useUiStore } from '@/stores/ui.store';
import { mockApi, type MockResponse } from '@/test/mockApi';
import { renderWithProviders } from '@/test/test-utils';
import { ResetPasswordPage } from './ResetPasswordPage';
import { VerifyOtpPage } from './VerifyOtpPage';

const EMAIL = 'an@x.vn';
const NEW_PASSWORD = 'Veggie@2027';

/** Đúng phản hồi của Backend: gói dữ liệu nằm ở cả `data` lẫn `details`. */
const otpIncorrect = (left: number): MockResponse => ({
  status: 400,
  errorCode: 'ERR_AUTH_OTP_INCORRECT',
  message: `Mã xác thực OTP không chính xác. Bạn còn ${left} lần thử.`,
  data: { remainingAttempts: left },
  details: { remainingAttempts: left },
});
const OTP_EXPIRED: MockResponse = { status: 400, errorCode: 'ERR_AUTH_OTP_EXPIRED', message: 'Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.' };
const OTP_LOCKED: MockResponse = { status: 429, errorCode: 'ERR_AUTH_OTP_LOCKED', message: 'Bạn đã nhập sai mã OTP 5 lần liên tiếp. Chức năng xác thực bị tạm khóa trong vòng 15 phút. Vui lòng thử lại sau.' };

function openPage(state: object = { email: EMAIL, otp: '111111' }, path: string = PATHS.AUTH.RESET_PASSWORD) {
  return renderWithProviders(
    <Routes>
      <Route path={PATHS.AUTH.RESET_PASSWORD} element={<ResetPasswordPage />} />
      <Route path={PATHS.AUTH.VERIFY_OTP} element={<VerifyOtpPage />} />
      <Route path={PATHS.AUTH.LOGIN} element={<h1>Trang đăng nhập</h1>} />
    </Routes>,
    { routerInitialEntries: [{ pathname: path, state }] },
  );
}

const otpBox = () => screen.getByLabelText(/Mã OTP/) as HTMLInputElement;
const passwordBox = () => screen.getByLabelText(/^Mật khẩu mới/) as HTMLInputElement;
const confirmBox = () => screen.getByLabelText(/Nhập lại mật khẩu mới/) as HTMLInputElement;
const submitButton = () => screen.getByRole('button', { name: /Cập nhật mật khẩu mới|Đang cập nhật|Thử lại sau/ });
const resetCalls = (calls: { url: string }[]) => calls.filter((call) => call.url === '/auth/reset-password');

async function fillPasswords() {
  await userEvent.type(passwordBox(), NEW_PASSWORD);
  await userEvent.type(confirmBox(), NEW_PASSWORD);
}

beforeEach(() => useUiStore.setState({ toasts: [] }));

describe('ResetPasswordPage (SCR-05)', () => {
  it('mã đúng: gửi đủ dữ liệu, báo thành công và chuyển sang trang đăng nhập', async () => {
    const calls = mockApi(() => ({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' }));
    openPage();
    await fillPasswords();
    await userEvent.click(submitButton());

    expect(await screen.findByRole('heading', { name: 'Trang đăng nhập' })).toBeInTheDocument();
    expect(resetCalls(calls)[0].body).toEqual({ email: EMAIL, otp: '111111', newPassword: NEW_PASSWORD });
    expect(useUiStore.getState().toasts.map((toast) => toast.message)).toContain('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
  });

  it('không khẳng định OTP đã được xác thực trước khi gọi API', () => {
    mockApi(() => undefined);
    openPage();
    expect(screen.queryByText('Đã xác thực OTP')).not.toBeInTheDocument();
    expect(otpBox().value).toBe('111111');
  });

  it('mã sai: hiện lỗi của server dưới ô OTP, xóa mã cũ và giữ nguyên mật khẩu đã nhập', async () => {
    mockApi(() => otpIncorrect(4));
    openPage();
    await fillPasswords();
    await userEvent.click(submitButton());

    expect(await screen.findByText('Mã xác thực OTP không chính xác. Bạn còn 4 lần thử.')).toBeInTheDocument();
    expect(otpBox().value).toBe('');
    expect(passwordBox().value).toBe(NEW_PASSWORD);
    expect(confirmBox().value).toBe(NEW_PASSWORD);
  });

  it('bấm liên tục khi mã sai chỉ mất một lượt thử cho tới khi nhập mã mới', async () => {
    const calls = mockApi(() => otpIncorrect(4));
    openPage();
    await fillPasswords();
    await userEvent.click(submitButton());
    await screen.findByText(/Bạn còn 4 lần thử/);

    for (let i = 0; i < 5; i += 1) await userEvent.click(submitButton());

    expect(resetCalls(calls)).toHaveLength(1);
    expect(submitButton()).toBeDisabled();
    expect(screen.getByText(/Bạn còn 4 lần thử/)).toBeInTheDocument();
  });

  it('nhập mã mới sau khi sai thì gửi đúng mã mới và thành công, không phải nhập lại mật khẩu', async () => {
    const calls = mockApi((req) => ((req.body as { otp: string }).otp === '222222' ? { message: 'OK' } : otpIncorrect(4)));
    openPage();
    await fillPasswords();
    await userEvent.click(submitButton());
    await screen.findByText(/Bạn còn 4 lần thử/);

    await userEvent.type(otpBox(), '222222');
    await userEvent.click(submitButton());

    expect(await screen.findByRole('heading', { name: 'Trang đăng nhập' })).toBeInTheDocument();
    expect(resetCalls(calls).map((call) => (call as unknown as { body: { otp: string } }).body.otp)).toEqual(['111111', '222222']);
  });

  it('bị khóa OTP: báo lý do, khóa nút và không gọi API thêm', async () => {
    const calls = mockApi(() => OTP_LOCKED);
    openPage();
    await fillPasswords();
    await userEvent.click(submitButton());

    expect(await screen.findByText(/tạm khóa trong vòng 15 phút/)).toBeInTheDocument();
    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(submitButton().textContent).toMatch(/Thử lại sau 1[45]:\d\d/);
    await userEvent.click(submitButton());
    expect(resetCalls(calls)).toHaveLength(1);
  });

  it('mã hết hạn: báo lỗi dưới ô OTP và trang nhập mã cho phép gửi lại ngay', async () => {
    mockApi(() => OTP_EXPIRED);
    openPage({ email: EMAIL, otp: '111111', otpExpiresAt: Date.now() + 200_000 });
    await fillPasswords();
    await userEvent.click(submitButton());
    expect(await screen.findByText(/đã hết hạn/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'Gửi lại mã OTP' }));

    expect(await screen.findByText('Mã đã hết hạn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi lại mã' })).toBeEnabled();
  });

  it('lỗi không liên quan đến OTP vẫn hiện ngay trên nút và giữ nguyên mã đã nhập', async () => {
    mockApi(() => ({ status: 400, errorCode: 'ERR_AUTH_WEAK_PASSWORD', message: 'Mật khẩu không được chứa khoảng trắng.' }));
    openPage();
    await fillPasswords();
    await userEvent.click(submitButton());

    expect(await screen.findByText('Mật khẩu không được chứa khoảng trắng.')).toBeInTheDocument();
    expect(otpBox().value).toBe('111111');
  });

  it('thiếu email hoặc mã thì quay về bước trước, không hiện biểu mẫu', () => {
    mockApi(() => undefined);
    openPage({});
    expect(screen.queryByLabelText(/^Mật khẩu mới/)).not.toBeInTheDocument();
  });
});

describe('VerifyOtpPage luồng đặt lại mật khẩu (SCR-03)', () => {
  const openOtpStep = (extra: object = {}) => openPage({ email: EMAIL, purpose: 'PASSWORD_RESET', ...extra }, PATHS.AUTH.VERIFY_OTP);
  const typeCode = async (code: string) => {
    await userEvent.click(screen.getByLabelText('Chữ số thứ 1'));
    await userEvent.keyboard(code);
  };

  it('không báo "Mã OTP hợp lệ" khi chưa có kết quả từ server và chuyển mã sang bước đặt mật khẩu', async () => {
    const calls = mockApi(() => undefined);
    openOtpStep();
    await typeCode('123456');
    await userEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }));

    expect(await screen.findByRole('button', { name: /Cập nhật mật khẩu mới/ })).toBeInTheDocument();
    expect(otpBox().value).toBe('123456');
    expect(calls).toHaveLength(0);
    expect(useUiStore.getState().toasts.map((toast) => toast.message).join(' ')).not.toMatch(/hợp lệ/);
  });

  it('quay lại từ bước đặt mật khẩu: giữ số lượt còn lại và trạng thái khóa', () => {
    mockApi(() => undefined);
    openOtpStep({ attemptsLeft: 2, otpExpiresAt: Date.now() + 120_000 });
    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.getByText(/Mã hết hạn sau 0[12]:/)).toBeInTheDocument();
  });

  it('đang bị khóa khi quay lại: khóa ô nhập và hiện thời gian chờ', () => {
    mockApi(() => undefined);
    openOtpStep({ lockedUntil: Date.now() + 600_000 });
    expect(screen.getByText(/thử lại sau (10:00|09:\d\d)/)).toBeInTheDocument();
    expect(screen.getByLabelText('Chữ số thứ 1')).toBeDisabled();
  });

  it('gửi lại mã thành công: trả số lượt thử về 5/5 vì mã mới được đếm lại từ đầu', async () => {
    mockApi(() => ({ message: 'OK' }));
    openOtpStep({ attemptsLeft: 2, otpExpiresAt: Date.now() + 100_000 });
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lại mã' }));

    expect(await screen.findByText('5/5')).toBeInTheDocument();
    expect(screen.getByText(/Mã hết hạn sau 0[45]:/)).toBeInTheDocument();
  });
});
