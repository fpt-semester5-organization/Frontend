import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { renderWithProviders } from '@/test/test-utils';
import * as api from '../api/subscription.api';
import { CheckoutPage } from '../pages/CheckoutPage';
import { MySubscriptionPage } from '../pages/MySubscriptionPage';
import { PaymentResultPage } from '../pages/PaymentResultPage';
import { PricingPage } from '../pages/PricingPage';
import { savePendingOrder } from '../lib/pendingOrder';

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
  sessionStorage.clear();
  useAuthStore.setState({ user, accessToken: 't', guestToken: null });
  vi.mocked(api.listPlans).mockResolvedValue(plans);
  vi.mocked(api.cancelPendingOrder).mockClear();
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
    expect(JSON.parse(sessionStorage.getItem('vl_pending_order') ?? '{}').transactionId).toBe(3001);
    expect(screen.getByAltText('Mã QR VietQR')).toBeInTheDocument();
  });

  it('hủy phiên: hỏi xác nhận kèm hậu quả, chỉ gọi cancel-pending sau khi xác nhận, rồi về trang chọn gói', async () => {
    vi.mocked(api.cancelPendingOrder).mockResolvedValue({ cancelled: true, message: 'Đã hủy đơn chờ thanh toán thành công.' });
    await openPayPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Hủy phiên thanh toán này' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/mã QR và liên kết thanh toán của đơn không dùng được nữa/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Nếu bạn đã chuyển khoản, đừng hủy/)).toBeInTheDocument();
    expect(api.cancelPendingOrder).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy phiên thanh toán' }));
    expect(await screen.findByText('PRICING')).toBeInTheDocument();
    expect(api.cancelPendingOrder).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('vl_pending_order')).toBeNull();
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
  const tx = (status: string) => ({ isVip: status === 'SUCCESS', plan: plans.plans[1], endsAt: '2026-11-04T23:59:59Z', transactions: [{ transactionId: 3001, gateway: 'MOMO', amountVnd: 49000, status, createdAt: '2026-10-05T10:00:00Z' }] });

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

  it('EXPIRED -> thông báo hết hạn và nút thử lại', async () => {
    vi.mocked(api.getMySubscription).mockResolvedValue(tx('EXPIRED'));
    renderWithProviders(<PaymentResultPage />, '/vip/result?transactionId=3001');
    expect(await screen.findByText(/hết hạn sau 5 phút/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thử lại' })).toHaveAttribute('href', '/vip');
  });
});

describe('MySubscriptionPage (SCR-33)', () => {
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

  it('lỗi tải -> thử lại', async () => {
    vi.mocked(api.getMySubscription).mockRejectedValueOnce(apiError(500, 'ERR_SYS_DATABASE_UNAVAILABLE', 'Lỗi hệ thống'));
    renderWithProviders(<MySubscriptionPage />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
