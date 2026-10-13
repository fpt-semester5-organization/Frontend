import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';
import { apiError, renderPage } from '@/features/shared/test-utils';
import * as api from '../api/scanner.api';
import { allergenWarningText, verdictMeta } from '../lib/verdict';
import { BarcodeScanPage } from '../pages/BarcodeScanPage';
import { ScanHistoryPage } from '../pages/ScanHistoryPage';
import { barcodeSchema } from '../schemas/barcode.schema';

vi.mock('../api/scanner.api');
vi.mock('../hooks/useBarcodeCamera', () => ({ useBarcodeCamera: () => ({ videoRef: { current: null }, error: null }) }));

const result = {
  barcode: '8934567890123',
  productName: 'Bánh quy yến mạch',
  brand: 'Oatmeal Bakery',
  veganVerdict: 'RED' as const,
  verdictText: 'Chứa phụ gia có nguồn gốc động vật',
  detectedAdditives: [{ code: 'E120', name: 'Carmine', veganStatus: 'NON_VEGAN' as const }],
  personalAllergyCheck: true,
  allergenWarnings: ['Sữa'],
  quota: { used: 2, limit: 3, remaining: 1 },
};

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ user: null, accessToken: null, guestToken: 'g' });
  useGuestStore.setState({ quota: null });
});

describe('barcodeSchema', () => {
  it('chấp nhận 8–14 chữ số, từ chối ký tự khác', () => {
    expect(barcodeSchema.safeParse({ barcode: '12345678' }).success).toBe(true);
    expect(barcodeSchema.safeParse({ barcode: '12345678901234' }).success).toBe(true);
    expect(barcodeSchema.safeParse({ barcode: '1234567' }).success).toBe(false);
    expect(barcodeSchema.safeParse({ barcode: '123456789012345' }).success).toBe(false);
    expect(barcodeSchema.safeParse({ barcode: '12345abc9' }).success).toBe(false);
  });
});

describe('verdict helpers', () => {
  it('ánh xạ Xanh/Vàng/Đỏ và chuẩn hóa cảnh báo dị ứng', () => {
    expect(verdictMeta('GREEN').label).toBe('Thuần chay');
    expect(verdictMeta('RED').label).toBe('Không thuần chay');
    expect(allergenWarningText('Sữa')).toBe('Sữa');
    expect(allergenWarningText({ allergenName: 'Đậu phộng' })).toBe('Đậu phộng');
  });
});

describe('BarcodeScanPage (SCR-15)', () => {
  it('mã sai định dạng: báo lỗi dưới ô, không gọi API', async () => {
    renderPage(<BarcodeScanPage />);
    await userEvent.type(screen.getByLabelText('Mã vạch'), '123');
    await userEvent.click(screen.getByRole('button', { name: /Phân Tích Ngay/ }));
    expect(await screen.findByText(/8–14 chữ số/)).toBeInTheDocument();
    expect(api.getProductByBarcode).not.toHaveBeenCalled();
  });

  it('Khách tra cứu thành công: gọi MANUAL_INPUT, hiện kết luận + phụ gia và cập nhật lượt còn lại', async () => {
    vi.mocked(api.getProductByBarcode).mockResolvedValue(result);
    renderPage(<BarcodeScanPage />);
    await userEvent.type(screen.getByLabelText('Mã vạch'), '8934567890123');
    await userEvent.click(screen.getByRole('button', { name: /Phân Tích Ngay/ }));
    expect(await screen.findByText('Bánh quy yến mạch')).toBeInTheDocument();
    expect(api.getProductByBarcode).toHaveBeenCalledWith('8934567890123', 'MANUAL_INPUT');
    expect(screen.getByText('Không thuần chay')).toBeInTheDocument();
    expect(screen.getByText(/E120 - Carmine/)).toBeInTheDocument();
    expect(screen.getByText(/Đăng nhập để đối chiếu/)).toBeInTheDocument();
    await waitFor(() => expect(useGuestStore.getState().quota?.barcodeDaily.remaining).toBe(1));
    expect(screen.getByText(/Còn/)).toHaveTextContent('1/3');
  });

  it('ERR_PRODUCT_NOT_FOUND: hiện trạng thái không tìm thấy, nói rõ không trừ lượt', async () => {
    vi.mocked(api.getProductByBarcode).mockRejectedValue(apiError(404, 'ERR_PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm'));
    renderPage(<BarcodeScanPage />);
    await userEvent.type(screen.getByLabelText('Mã vạch'), '8934567890123');
    await userEvent.click(screen.getByRole('button', { name: /Phân Tích Ngay/ }));
    expect(await screen.findByText('Không tìm thấy sản phẩm')).toBeInTheDocument();
    expect(screen.getByText(/không bị tính vào hạn mức/)).toBeInTheDocument();
  });

  it('503 Open Food Facts: hiện cảnh báo dịch vụ gián đoạn kèm nút thử lại', async () => {
    vi.mocked(api.getProductByBarcode).mockRejectedValue(apiError(503, 'ERR_EXT_OPENFOODFACTS_FAILED', 'Open Food Facts không phản hồi.'));
    renderPage(<BarcodeScanPage />);
    await userEvent.type(screen.getByLabelText('Mã vạch'), '8934567890123');
    await userEvent.click(screen.getByRole('button', { name: /Phân Tích Ngay/ }));
    expect(await screen.findByText('Dịch vụ tạm gián đoạn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('Thành viên: hiện cảnh báo dị ứng cá nhân và danh sách quét gần đây', async () => {
    useAuthStore.setState({ user: { userId: 1, fullName: 'An', email: 'a@x.vn', role: 'MEMBER', isVip: false }, accessToken: 't' });
    vi.mocked(api.listMyScans).mockResolvedValue({ items: [{ scanId: 1, barcode: '8934567890123', productName: 'Sữa hạt', veganVerdict: 'GREEN', isAllergenTriggered: false, scannedAt: '2026-10-05T10:00:00Z' }], meta: { page: 1, size: 3, total: 9 } });
    vi.mocked(api.getProductByBarcode).mockResolvedValue({ ...result, quota: null });
    renderPage(<BarcodeScanPage />);
    expect(await screen.findByText('Sữa hạt')).toBeInTheDocument();
    expect(screen.getByText(/Xem tất cả 9 mục/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Mã vạch'), '8934567890123');
    await userEvent.click(screen.getByRole('button', { name: /Phân Tích Ngay/ }));
    expect(await screen.findByText('Phát hiện: Sữa')).toBeInTheDocument();
  });
});

describe('ScanHistoryPage (SCR-16)', () => {
  beforeEach(() => useAuthStore.setState({ user: { userId: 1, fullName: 'An', email: 'a@x.vn', role: 'MEMBER', isVip: false }, accessToken: 't' }));

  it('hiện lịch sử từ API và lọc theo kết luận gửi tham số verdict', async () => {
    vi.mocked(api.listMyScans).mockResolvedValue({ items: [{ scanId: 5, barcode: '8935001234567', productName: 'Bánh quy ngũ cốc', veganVerdict: 'YELLOW', isAllergenTriggered: true, scannedAt: '2026-10-05T10:00:00Z' }], meta: { page: 1, size: 20, total: 1 } });
    renderPage(<ScanHistoryPage />);
    expect(await screen.findByText('Bánh quy ngũ cốc')).toBeInTheDocument();
    expect(screen.getByText('Có chất dị ứng')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Không thuần chay' }));
    await waitFor(() => expect(api.listMyScans).toHaveBeenLastCalledWith(expect.objectContaining({ verdict: 'RED', page: 1 })));
  });

  it('rỗng và lỗi có trạng thái riêng', async () => {
    vi.mocked(api.listMyScans).mockResolvedValueOnce({ items: [], meta: { page: 1, size: 20, total: 0 } });
    const { unmount } = renderPage(<ScanHistoryPage />);
    expect(await screen.findByText('Chưa có lịch sử quét')).toBeInTheDocument();
    unmount();
    vi.mocked(api.listMyScans).mockRejectedValue(apiError(500, 'ERR_SYS_DATABASE_UNAVAILABLE', 'Không kết nối được SQL Server.'));
    renderPage(<ScanHistoryPage />);
    expect(await screen.findByText('Đã có lỗi xảy ra')).toBeInTheDocument();
  });
});
