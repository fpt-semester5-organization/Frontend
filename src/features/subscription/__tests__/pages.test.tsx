import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { renderWithProviders } from '@/test/test-utils';
import * as api from '../api/subscription.api';
import { CheckoutPage } from '../pages/CheckoutPage';
import { MySubscriptionPage } from '../pages/MySubscriptionPage';
import { PaymentResultPage } from '../pages/PaymentResultPage';
import { PaymentReturnPage } from '../pages/PaymentReturnPage';
import { PricingPage } from '../pages/PricingPage';
import { readPendingOrder, savePendingOrder } from '../lib/pendingOrder';
import { refreshVipSessionClaims } from '../lib/sessionClaims';

vi.mock('../api/subscription.api');
vi.mock('../lib/sessionClaims', () => ({ refreshVipSessionClaims: vi.fn().mockResolvedValue(true), decodeJwtClaims: vi.fn() }));

const plans = {
  plans: [
    { planId: 2, planName: 'VIP 3 tháng', durationDays: 90, priceVnd: 129000, isActive: true },
    { planId: 1, planName: 'VIP 1 tháng', durationDays: 30, priceVnd: 49000, isActive: true },
    { planId: 9, planName: 'Gói cũ', durationDays: 7, priceVnd: 1000, isActive: false },
  ],
  benefits: { free: { mealPlansPerWeek: 1, chatPerDay: 20, fridgePhotosPerDay: 10 }, vip: { mealPlansPerWeek: 3, chatPerDay: null, fridgePhotosPerDay: 30 } },
};
const user = { userId: 7, fullName: 'An', email: 'an@x.vn', role: 'MEMBER' as const, isVip: false };

const apiError = (status: number, errorCode: string, message = errorCode) => {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError('x', String(status), config, null, { status, statusText: '', headers: {}, config, data: { statusCode: status, errorCode, message } });
};

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user, accessToken: 't', guestToken: null });
  vi.mocked(api.listPlans).mockResolvedValue(plans);
  vi.clearAllMocks();
  vi.mocked(refreshVipSessionClaims).mockResolvedValue(true);
  vi.mocked(api.listPlans).mockResolvedValue(plans);
  useUiStore.setState({ toasts: [] });
});

describe('PricingPage (SCR-30)', () => {
  it('hiển thị gói đang bán từ API, sắp theo thời hạn, bỏ gói ngừng bán', async () => {
    renderWithProviders(<PricingPage />);
    const cards = await screen.findAllByRole('article');
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual(['VIP 1 tháng', 'VIP 3 tháng']);
    expect(screen.getByText(/129\.000/)).toBeInTheDocument();
    expect(screen.queryByText('Gói cũ')).not.toBeInTheDocument();
    expect(screen.getByText(/tối đa 200 câu\/ngày/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Chọn gói' })[0]).toHaveAttribute('href', '/vip/checkout/1');
  });

  it('trạng thái lỗi có nút thử lại', async () => {
    vi.mocked(api.listPlans).mockRejectedValueOnce(apiError(500, 'ERR_SYS_DATABASE_UNAVAILABLE', 'Lỗi hệ thống'));
    renderWithProviders(<PricingPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Lỗi hệ thống');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findAllByRole('article')).toHaveLength(2);
  });

  it('trạng thái rỗng khi không có gói đang bán', async () => {
    vi.mocked(api.listPlans).mockResolvedValue({ plans: [], benefits: undefined });
    renderWithProviders(<PricingPage />);
    expect(await screen.findByText('Chưa có gói đang bán')).toBeInTheDocument();
  });
});

describe('CheckoutPage (SCR-31)', () => {
  const renderCheckout = (id = '1') =>
    renderWithProviders(
      <Routes>
        <Route path="/vip/checkout/:planId" element={<CheckoutPage />} />
        <Route path="/vip/result" element={<div>RESULT</div>} />
        <Route path="/vip" element={<div>PRICING</div>} />
      </Routes>,
      `/vip/checkout/${id}`
    );

  const pending = { isVip: false, transactions: [{ transactionId: 3001, gateway: 'VIETQR', amountVnd: 49000, status: 'PENDING', createdAt: new Date().toISOString() }] };
  /** Đang ở bước quét mã: đơn 3001 còn 5 phút, server báo PENDING. */
  const openPayPanel = async () => {
    vi.mocked(api.checkout).mockResolvedValue({ transactionId: 3001, orderCode: 'VL_1', amountVnd: 49000, payUrl: 'https://pay.example/qr.png', expiresAt: new Date(Date.now() + 300_000).toISOString() });
    vi.mocked(api.getMySubscription).mockResolvedValue(pending);
    renderCheckout();
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo mã VietQR' }));
    expect(await screen.findByText('VL_1')).toBeInTheDocument();
  };

  it('gói không tồn tại -> trạng thái không tìm thấy', async () => {
    renderCheckout('99');
    expect(await screen.findByText('Không tìm thấy gói')).toBeInTheDocument();
  });

  it('tạo đơn theo gateway đã chọn và lưu transactionId trước khi chuyển cổng', async () => {
    vi.mocked(api.checkout).mockResolvedValue({ transactionId: 3001, orderCode: 'VL_1', amountVnd: 49000, payUrl: 'https://pay.example/qr.png', expiresAt: new Date(Date.now() + 300_000).toISOString() });
    vi.mocked(api.getMySubscription).mockResolvedValue({ isVip: false, transactions: [{ transactionId: 3001, gateway: 'VIETQR', amountVnd: 49000, status: 'PENDING', createdAt: new Date().toISOString() }] });
    renderCheckout();
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo mã VietQR' }));
    await waitFor(() => expect(api.checkout).toHaveBeenCalledWith({ planId: 1, gateway: 'VIETQR' }));
    expect(await screen.findByText('VL_1')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('vl_pending_order') ?? '{}').transactionId).toBe(3001);
    expect(screen.getByAltText('Mã QR VietQR')).toBeInTheDocument();
  });

  it('Backend trả ảnh QR (không tạo được đơn trên cổng): cảnh báo không có xác nhận tự động, không hứa "dưới 30 giây"', async () => {
    await openPayPanel();
    expect(screen.getByText('Mã QR này không có xác nhận tự động')).toBeInTheDocument();
    expect(screen.queryByText(/thường dưới 30 giây/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mở trang thanh toán VietQR' })).not.toBeInTheDocument();
  });

  it('Backend trả link cổng: mở được trang thanh toán, không cảnh báo', async () => {
    vi.mocked(api.checkout).mockResolvedValue({ transactionId: 3001, orderCode: 'VL_1', amountVnd: 49000, payUrl: 'https://pay.payos.vn/web/abc', expiresAt: new Date(Date.now() + 300_000).toISOString() });
    vi.mocked(api.getMySubscription).mockResolvedValue(pending);
    renderCheckout();
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo mã VietQR' }));
    expect(await screen.findByRole('link', { name: 'Mở trang thanh toán VietQR' })).toHaveAttribute('href', 'https://pay.payos.vn/web/abc');
    expect(screen.queryByText('Mã QR này không có xác nhận tự động')).not.toBeInTheDocument();
    expect(screen.getByText(/thường dưới 30 giây/)).toBeInTheDocument();
  });

  it('đồng hồ đếm ngược không bị đọc lại mỗi giây: chỉ dòng trạng thái là vùng thông báo', async () => {
    await openPayPanel();
    expect(screen.getByRole('timer')).toHaveTextContent(/Hết hạn sau 0[45]:/);
    expect(screen.getByRole('timer').closest('[aria-live]')).toBeNull();
  });

  it('hủy phiên: hỏi xác nhận kèm hậu quả, chỉ gọi cancel-pending sau khi xác nhận, rồi về trang chọn gói', async () => {
    vi.mocked(api.cancelPendingOrder).mockResolvedValue({ cancelled: true, message: 'Đã hủy đơn chờ thanh toán thành công.' });
    await openPayPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Hủy phiên thanh toán này' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Đừng thanh toán bằng mã QR hoặc liên kết của đơn này nữa/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Nếu bạn đã chuyển khoản, đừng hủy/)).toBeInTheDocument();
    expect(api.cancelPendingOrder).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy phiên thanh toán' }));
    expect(await screen.findByText('PRICING')).toBeInTheDocument();
    expect(api.cancelPendingOrder).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('vl_pending_order')).toBeNull();
    expect(useUiStore.getState().toasts.map((t) => t.message)).toContain('Đã hủy phiên thanh toán. Bạn có thể chọn lại gói hoặc cổng thanh toán.');
  });

  it('bấm "Tiếp tục thanh toán" thì đóng hộp thoại, không hủy đơn', async () => {
    await openPayPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Hủy phiên thanh toán này' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tiếp tục thanh toán' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.cancelPendingOrder).not.toHaveBeenCalled();
    expect(screen.getByText('VL_1')).toBeInTheDocument();
  });

  it('không còn đơn chờ để hủy (vừa thanh toán xong, đơn hết hạn) thì sang trang kết quả đọc trạng thái thật', async () => {
    vi.mocked(api.cancelPendingOrder).mockResolvedValue({ cancelled: false, message: 'Không có đơn chờ thanh toán nào cần hủy.' });
    await openPayPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Hủy phiên thanh toán này' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy phiên thanh toán' }));
    expect(await screen.findByText('RESULT')).toBeInTheDocument();
    expect(useUiStore.getState().toasts.map((t) => t.message)).toContain('Không có đơn chờ thanh toán nào cần hủy.');
  });

  it('hủy lỗi thì ở lại trang thanh toán, báo lỗi', async () => {
    vi.mocked(api.cancelPendingOrder).mockRejectedValue(apiError(400, 'ERR_VALIDATION', 'Không hủy được đơn.'));
    await openPayPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Hủy phiên thanh toán này' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy phiên thanh toán' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('VL_1')).toBeInTheDocument();
    expect(useUiStore.getState().toasts.map((t) => t.message)).toContain('Không hủy được đơn.');
  });

  it('409 đang có đơn chờ: "Hủy đơn đang chờ" giải phóng đơn cũ rồi tạo được đơn mới ngay', async () => {
    vi.mocked(api.checkout).mockRejectedValueOnce(apiError(409, 'ERR_PAYMENT_PENDING_EXISTS', 'Đang có đơn chờ thanh toán chưa hết hạn.'));
    vi.mocked(api.cancelPendingOrder).mockResolvedValue({ cancelled: true, message: 'Đã hủy.' });
    vi.mocked(api.getMySubscription).mockResolvedValue(pending);
    renderCheckout();
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo mã VietQR' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Hủy đơn đang chờ' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.cancelPendingOrder).toHaveBeenCalledTimes(1);
    expect(useUiStore.getState().toasts.map((t) => t.message)).toContain('Đã hủy đơn đang chờ. Bạn có thể tạo đơn mới.');

    vi.mocked(api.checkout).mockResolvedValue({ transactionId: 3002, orderCode: 'VL_2', amountVnd: 49000, payUrl: 'https://pay.example/qr2.png', expiresAt: new Date(Date.now() + 300_000).toISOString() });
    await userEvent.click(screen.getByRole('button', { name: 'Tạo mã VietQR' }));
    expect(await screen.findByText('VL_2')).toBeInTheDocument();
  });

  it('409 ERR_PAYMENT_PENDING_EXISTS -> hộp thoại với message của server', async () => {
    vi.mocked(api.checkout).mockRejectedValue(apiError(409, 'ERR_PAYMENT_PENDING_EXISTS', 'Bạn còn đơn chờ thanh toán.'));
    renderCheckout();
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo mã VietQR' }));
    expect(await screen.findByText('Bạn còn đơn chờ thanh toán.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem trạng thái đơn' })).toBeInTheDocument();
  });
});

describe('PaymentResultPage (SCR-32)', () => {
  const tx = (status: string, createdAt = new Date().toISOString()) => ({ isVip: status === 'SUCCESS', plan: plans.plans[1], endsAt: '2026-11-04T23:59:59Z', transactions: [{ transactionId: 3001, gateway: 'VIETQR', amountVnd: 49000, status, createdAt }] });
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  const FIVE_MINUTES = 300_000;
  const storedOrder = { transactionId: 3001, orderCode: 'VL_1', amountVnd: 49000, payUrl: 'https://p', planId: 1, planName: 'VIP 1 tháng', gateway: 'VIETQR' as const, userId: 7 };

  it('bỏ qua status trên URL: PENDING từ server -> chờ xác nhận dù URL ghi SUCCESS', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue(tx('PENDING'));
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001&status=SUCCESS&resultCode=0');
    expect(await screen.findByRole('status', { name: '' })).toHaveTextContent('Chờ thanh toán');
    expect(screen.queryByText('VIP đã được kích hoạt.')).not.toBeInTheDocument();
  });

  it('SUCCESS từ server -> hiển thị hạn VIP và đồng bộ phiên', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue(tx('SUCCESS'));
    const { refreshVipSessionClaims } = await import('../lib/sessionClaims');
    savePendingOrder({ transactionId: 3001, orderCode: 'VL_1', amountVnd: 49000, payUrl: 'https://p', expiresAt: '2026-10-05T10:05:00Z', planId: 1, planName: 'VIP 1 tháng', gateway: 'MOMO', userId: 7 });
    renderWithProviders(<PaymentResultPage />, '/vip/result');
    expect(await screen.findByText('VIP đã được kích hoạt.')).toBeInTheDocument();
    expect(screen.getByText('Hiệu lực đến')).toBeInTheDocument();
    await waitFor(() => expect(refreshVipSessionClaims).toHaveBeenCalledTimes(1));
  });

  it('SUCCESS -> nêu rõ đã nâng VIP và các quyền lợi vừa mở khóa', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue(tx('SUCCESS'));
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001');
    expect(await screen.findByRole('status', { name: '' })).toHaveTextContent('Thanh toán thành công');
    const benefits = screen.getByRole('region', { name: 'Quyền lợi VIP đã mở khóa' });
    expect(within(benefits).getByText('tối đa 200 câu/ngày')).toBeInTheDocument();
    expect(within(benefits).getByText('Xuất PDF thực đơn và danh sách đi chợ')).toBeInTheDocument();
    expect(screen.queryByText(/Chưa cập nhật được tài khoản/)).not.toBeInTheDocument();
  });

  it('làm mới phiên thất bại -> báo rõ và thử lại được, không báo sai là chưa thanh toán', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue(tx('SUCCESS'));
    vi.mocked(refreshVipSessionClaims).mockResolvedValueOnce(false);
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001');
    expect(await screen.findByText('Chưa cập nhật được tài khoản trên thiết bị này')).toBeInTheDocument();
    expect(screen.getByText('VIP đã được kích hoạt.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.queryByText('Chưa cập nhật được tài khoản trên thiết bị này')).not.toBeInTheDocument());
    expect(refreshVipSessionClaims).toHaveBeenCalledTimes(2);
  });

  it('giao dịch chưa thành công thì không đồng bộ VIP', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue(tx('FAILED'));
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001');
    expect(await screen.findByText('Giao dịch không thành công.')).toBeInTheDocument();
    expect(refreshVipSessionClaims).not.toHaveBeenCalled();
  });

  it('hết giờ khi đang mở trang mà server vẫn báo PENDING: tự đổi sang hết hạn, không cần tải lại', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue(tx('PENDING', ago(FIVE_MINUTES - 1500)));
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001');
    expect(await screen.findByRole('status', { name: '' })).toHaveTextContent('Chờ thanh toán');
    await waitFor(() => expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Đơn hàng đã hết hạn'), { timeout: 4000 });
    expect(screen.getByText(/hết hạn sau 5 phút/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thử lại' })).toHaveAttribute('href', '/vip');
  });

  it('danh sách từ server chưa có đơn (cache cũ) mà đơn đã lưu đã quá hạn: vẫn báo hết hạn', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue({ isVip: false, transactions: [] });
    savePendingOrder({ ...storedOrder, expiresAt: ago(1000) });
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001');
    expect(await screen.findByRole('status', { name: '' })).toHaveTextContent('Đơn hàng đã hết hạn');
    expect(screen.queryByText(/Chưa thấy giao dịch nào/)).not.toBeInTheDocument();
  });

  it('danh sách từ server chưa có đơn vừa tạo (cache cũ): vẫn hiện đơn đang chờ, không báo chưa thấy giao dịch', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue({ isVip: false, transactions: [] });
    savePendingOrder({ ...storedOrder, expiresAt: new Date(Date.now() + 120_000).toISOString() });
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001');
    expect(await screen.findByRole('status', { name: '' })).toHaveTextContent('Chờ thanh toán');
    expect(screen.queryByText(/Chưa thấy giao dịch nào/)).not.toBeInTheDocument();
    expect(screen.getByText('#3001')).toBeInTheDocument();
    expect(screen.getByText('VIP 1 tháng')).toBeInTheDocument();
  });

  it('cổng xác nhận trễ sau khi đơn đã hiển thị hết hạn: tiếp tục kiểm tra và chuyển sang thành công', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValueOnce(tx('EXPIRED', ago(FIVE_MINUTES + 60_000))).mockResolvedValue(tx('SUCCESS', ago(FIVE_MINUTES + 60_000)));
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001');
    expect(await screen.findByRole('status', { name: '' })).toHaveTextContent('Đơn hàng đã hết hạn');
    expect(screen.getByText(/hãy giữ trang này ít phút/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Thanh toán thành công'), { timeout: 5000 });
    await waitFor(() => expect(refreshVipSessionClaims).toHaveBeenCalledTimes(1));
  });

  it('đơn còn hạn: có đường quay lại mã thanh toán kèm thời gian còn lại', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue(tx('PENDING'));
    savePendingOrder({ ...storedOrder, expiresAt: new Date(Date.now() + 120_000).toISOString() });
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001');
    expect(await screen.findByRole('link', { name: /Quay lại mã thanh toán \(còn 0[12]:/ })).toHaveAttribute('href', '/vip/checkout/1');
  });

  it('đơn thất bại không lấy nhầm tên gói đang dùng của tài khoản', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue(tx('FAILED'));
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001');
    await screen.findByText('Giao dịch không thành công.');
    expect(screen.queryByText('VIP 1 tháng')).not.toBeInTheDocument();
  });

  it('EXPIRED -> thông báo hết hạn và nút thử lại', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue(tx('EXPIRED'));
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001');
    expect(await screen.findByText(/hết hạn sau 5 phút/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thử lại' })).toHaveAttribute('href', '/vip');
  });
});

describe('PaymentReturnPage (cổng thanh toán chuyển về)', () => {
  const order = { transactionId: 3001, orderCode: 'VL_1793516377203', amountVnd: 49000, payUrl: 'https://p', expiresAt: '2026-10-05T10:05:00Z', planId: 1, planName: 'VIP 1 tháng', gateway: 'VIETQR' as const, userId: 7 };
  const Where = () => {
    const { pathname, search } = useLocation();
    return <div data-testid="where">{pathname + search}</div>;
  };
  const renderReturn = (url: string, outcome: 'return' | 'cancel') =>
    renderWithProviders(
      <Routes>
        <Route path="/payment/*" element={<PaymentReturnPage outcome={outcome} />} />
        <Route path="/vip/*" element={<Where />} />
      </Routes>,
      url
    );

  it('quay về sau khi trả tiền: sang trang kết quả, bỏ tham số của cổng, không tin status=PAID', async () => {
    savePendingOrder(order);
    renderReturn('/payment/success?code=00&id=abc&cancel=false&status=PAID&orderCode=1793516377203', 'return');
    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/vip\/result\?transactionId=3001$/);
    expect(api.cancelPendingOrder).not.toHaveBeenCalled();
    expect(refreshVipSessionClaims).not.toHaveBeenCalled();
  });

  it('tab mới không có đơn đã lưu: vẫn sang trang kết quả, trang đó đọc giao dịch mới nhất từ server', async () => {
    renderReturn('/payment/callback?orderId=1&resultCode=0', 'return');
    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/vip\/result$/);
  });

  it('cổng báo hủy đúng đơn đang chờ: giải phóng đơn rồi về trang chọn gói', async () => {
    vi.mocked(api.cancelPendingOrder).mockResolvedValue({ cancelled: true, message: 'Đã hủy.' });
    savePendingOrder(order);
    renderReturn('/payment/cancel?code=00&cancel=true&status=CANCELLED&orderCode=1793516377203', 'cancel');
    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/vip$/);
    expect(api.cancelPendingOrder).toHaveBeenCalledTimes(1);
    expect(readPendingOrder(7)).toBeNull();
    expect(useUiStore.getState().toasts.map((t) => t.message)).toContain('Bạn đã hủy thanh toán. Có thể chọn lại gói hoặc cổng thanh toán.');
  });

  it('link hủy lạ (mã đơn không khớp hoặc không có đơn đã lưu) không hủy được đơn của người dùng', async () => {
    savePendingOrder(order);
    renderReturn('/payment/cancel?cancel=true&orderCode=999', 'cancel');
    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/vip\/result\?transactionId=3001$/);
    expect(api.cancelPendingOrder).not.toHaveBeenCalled();
    expect(readPendingOrder(7)?.transactionId).toBe(3001);
  });

  it('đơn đã không còn chờ khi hủy (vừa thanh toán xong): sang trang kết quả', async () => {
    vi.mocked(api.cancelPendingOrder).mockResolvedValue({ cancelled: false, message: 'Không có đơn chờ.' });
    savePendingOrder(order);
    renderReturn('/payment/cancel?orderCode=1793516377203', 'cancel');
    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/vip\/result\?transactionId=3001$/);
  });
});

describe('MySubscriptionPage (SCR-33)', () => {
  it('server báo đã là VIP mà phiên còn là Thành viên: tự làm mới JWT một lần', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue({ isVip: true, plan: plans.plans[0], endsAt: '2026-11-04T23:59:59Z', transactions: [] });
    renderWithProviders(<MySubscriptionPage />);
    await screen.findByText('VIP 3 tháng');
    await waitFor(() => expect(refreshVipSessionClaims).toHaveBeenCalledTimes(1));
  });

  it('trạng thái server khớp phiên: không làm mới JWT', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue({ isVip: false, plan: null, transactions: [] });
    renderWithProviders(<MySubscriptionPage />);
    await screen.findByText('Chưa có giao dịch');
    expect(refreshVipSessionClaims).not.toHaveBeenCalled();
  });

  it('VIP: hạn mức VIP + lịch sử giao dịch từ API', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue({ isVip: true, plan: plans.plans[0], endsAt: '2026-11-04T23:59:59Z', transactions: [{ transactionId: 3001, gateway: 'MOMO', amountVnd: 49000, status: 'SUCCESS', createdAt: '2026-10-05T10:00:00Z' }] });
    renderWithProviders(<MySubscriptionPage />);
    expect(await screen.findByText('VIP 3 tháng')).toBeInTheDocument();
    expect(screen.getByText('#3001')).toBeInTheDocument();
    expect(screen.getByText('tối đa 200 câu/ngày')).toBeInTheDocument();
    expect(screen.getByText('Thành công')).toBeInTheDocument();
  });

  it('Free chưa có giao dịch: hạn mức Free + trạng thái rỗng', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue({ isVip: false, plan: null, transactions: [] });
    renderWithProviders(<MySubscriptionPage />);
    expect(await screen.findByText('Chưa có giao dịch')).toBeInTheDocument();
    expect(screen.getByText('20 câu/ngày')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nâng cấp VIP' })).toBeInTheDocument();
  });

  it('đơn PENDING quá 5 phút hiển thị Hết hạn trong lịch sử, không còn nút tiếp tục', async () => {
    const createdAt = new Date(Date.now() - 360_000).toISOString();
    vi.mocked(api.getMySubscription).mockResolvedValue({ isVip: false, plan: null, transactions: [{ transactionId: 3001, gateway: 'VIETQR', amountVnd: 49000, status: 'PENDING', createdAt }] });
    savePendingOrder({ transactionId: 3001, orderCode: 'VL_1', amountVnd: 49000, payUrl: 'https://p', expiresAt: new Date(Date.now() - 60_000).toISOString(), planId: 1, planName: 'VIP 1 tháng', gateway: 'VIETQR', userId: 7 });
    renderWithProviders(<MySubscriptionPage />);
    expect(await screen.findByText('Hết hạn')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tiếp tục thanh toán' })).not.toBeInTheDocument();
  });

  it('đơn còn hạn: hiện Chờ thanh toán và đường quay lại mã', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue({ isVip: false, plan: null, transactions: [{ transactionId: 3001, gateway: 'VIETQR', amountVnd: 49000, status: 'PENDING', createdAt: new Date().toISOString() }] });
    savePendingOrder({ transactionId: 3001, orderCode: 'VL_1', amountVnd: 49000, payUrl: 'https://p', expiresAt: new Date(Date.now() + 200_000).toISOString(), planId: 1, planName: 'VIP 1 tháng', gateway: 'VIETQR', userId: 7 });
    renderWithProviders(<MySubscriptionPage />);
    expect(await screen.findByText('Chờ thanh toán')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tiếp tục thanh toán' })).toHaveAttribute('href', '/vip/checkout/1');
  });

  it('danh sách chưa có đơn vừa tạo (cache cũ): vẫn có đường quay lại mã thanh toán', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue({ isVip: false, plan: null, transactions: [] });
    savePendingOrder({ transactionId: 3001, orderCode: 'VL_1', amountVnd: 49000, payUrl: 'https://p', expiresAt: new Date(Date.now() + 200_000).toISOString(), planId: 1, planName: 'VIP 1 tháng', gateway: 'VIETQR', userId: 7 });
    renderWithProviders(<MySubscriptionPage />);
    expect(await screen.findByRole('link', { name: 'Tiếp tục thanh toán' })).toHaveAttribute('href', '/vip/checkout/1');
  });

  it('server báo đơn đã kết thúc: không còn nút tiếp tục dù đơn đã lưu chưa hết giờ', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue({ isVip: false, plan: null, transactions: [{ transactionId: 3001, gateway: 'VIETQR', amountVnd: 49000, status: 'CANCELLED', createdAt: new Date().toISOString() }] });
    savePendingOrder({ transactionId: 3001, orderCode: 'VL_1', amountVnd: 49000, payUrl: 'https://p', expiresAt: new Date(Date.now() + 200_000).toISOString(), planId: 1, planName: 'VIP 1 tháng', gateway: 'VIETQR', userId: 7 });
    renderWithProviders(<MySubscriptionPage />);
    expect(await screen.findByText('Đã hủy')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tiếp tục thanh toán' })).not.toBeInTheDocument();
  });

  it('lỗi tải -> thử lại', async () => {
    vi.mocked(api.getMySubscription).mockRejectedValueOnce(apiError(500, 'ERR_SYS_DATABASE_UNAVAILABLE', 'Lỗi hệ thống'));
    renderWithProviders(<MySubscriptionPage />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
