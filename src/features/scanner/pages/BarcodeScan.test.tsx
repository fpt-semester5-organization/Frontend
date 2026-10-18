import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import BarcodeScan from './BarcodeScan';

const MOCK_SCAN_RESULT = {
  barcode: '8934563138165',
  productName: 'Mì Hảo Hảo Tôm Chua Cay',
  brand: 'Acecook',
  imageUrl: 'https://images.openfoodfacts.org/images/products/893/456/313/8165/front_vi.38.400.jpg',
  veganVerdict: 'RED',
  verdictText: 'Chứa phụ gia hoặc thành phần có nguồn gốc động vật.',
  detectedAdditives: [
    { code: 'E621', name: 'Mononatri glutamat', veganStatus: 'VEGAN' },
    { code: 'E120', name: 'Carmine (chiết xuất từ rệp son)', veganStatus: 'NON_VEGAN' },
  ],
  personalAllergyCheck: true,
  allergenWarnings: ['Tôm (Crustaceans)', 'Đậu nành'],
  quota: { used: 1, limit: 3, remaining: 2 },
};

describe('BarcodeScan (SCR-15 / FN-BAR-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('khi chuyển sang tab nhập tay: nhập mã hợp lệ sẽ gọi GET /products/barcode/{barcode} và hiển thị kết quả', async () => {
    const user = userEvent.setup();
    const calls = mockApi((req) => {
      if (req.url === '/products/barcode/8934563138165') {
        return { data: MOCK_SCAN_RESULT };
      }
      return undefined;
    });

    renderPage(<BarcodeScan />);

    // Chuyển sang tab Nhập mã tay
    const manualTab = screen.getByRole('tab', { name: /Nhập mã tay/i });
    await user.click(manualTab);

    const input = screen.getByLabelText(/Mã vạch/i);
    await user.type(input, '8934563138165');

    const submitBtn = screen.getByRole('button', { name: /Kiểm tra/i });
    await user.click(submitBtn);

    // Kiểm tra kết quả hiển thị
    expect(await screen.findByText('Mì Hảo Hảo Tôm Chua Cay')).toBeInTheDocument();
    expect(screen.getByText('Acecook ·')).toBeInTheDocument();
    expect(screen.getByText(/Không thuần chay/i)).toBeInTheDocument();
    expect(screen.getByText('E120')).toBeInTheDocument();
    expect(screen.getByTestId('product-image-frame')).toBeInTheDocument();

    // Kiểm tra API call đúng format và method
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      method: 'GET',
      url: '/products/barcode/8934563138165',
      params: { method: 'MANUAL_INPUT' },
    });
  });

  it('validate regex ^\\d{8,14}$: nhập chữ hoặc ít hơn 8 ký tự sẽ chặn và báo lỗi, không gọi API', async () => {
    const user = userEvent.setup();
    const calls = mockApi(() => undefined);

    renderPage(<BarcodeScan />);

    const manualTab = screen.getByRole('tab', { name: /Nhập mã tay/i });
    await user.click(manualTab);

    const input = screen.getByLabelText(/Mã vạch/i);
    await user.type(input, '12345');

    const submitBtn = screen.getByRole('button', { name: /Kiểm tra/i });
    await user.click(submitBtn);

    // Không gọi API do validate phía client
    expect(calls).toHaveLength(0);
  });

  it('chặn quét trùng liên tiếp cùng một mã (debounce) khi kết quả đã hiển thị', async () => {
    const user = userEvent.setup();
    const calls = mockApi((req) => {
      if (req.url === '/products/barcode/8934563138165') {
        return { data: MOCK_SCAN_RESULT };
      }
      return undefined;
    });

    renderPage(<BarcodeScan />);

    const manualTab = screen.getByRole('tab', { name: /Nhập mã tay/i });
    await user.click(manualTab);

    const input = screen.getByLabelText(/Mã vạch/i);
    await user.type(input, '8934563138165');

    const submitBtn = screen.getByRole('button', { name: /Kiểm tra/i });
    await user.click(submitBtn);

    expect(await screen.findByText('Mì Hảo Hảo Tôm Chua Cay')).toBeInTheDocument();
    expect(calls).toHaveLength(1);

    // Bấm kiểm tra lại cùng mã đó khi đã có kết quả
    await user.click(submitBtn);
    expect(calls).toHaveLength(1); // Vẫn chỉ có 1 call, không bị gọi lại tốn quota
  });

  it('xử lý 404 ERR_PRODUCT_NOT_FOUND: hiển thị trạng thái "Không tìm thấy sản phẩm" và nút quét lại', async () => {
    const user = userEvent.setup();
    mockApi((req) => {
      if (req.url === '/products/barcode/8934563999999') {
        return {
          status: 404,
          errorCode: 'ERR_PRODUCT_NOT_FOUND',
          message: 'Không tìm thấy thông tin sản phẩm trên hệ thống hoặc Open Food Facts.',
        };
      }
      return undefined;
    });

    renderPage(<BarcodeScan />);

    const manualTab = screen.getByRole('tab', { name: /Nhập mã tay/i });
    await user.click(manualTab);

    const input = screen.getByLabelText(/Mã vạch/i);
    await user.type(input, '8934563999999');

    const submitBtn = screen.getByRole('button', { name: /Kiểm tra/i });
    await user.click(submitBtn);

    expect(await screen.findByText('Không tìm thấy sản phẩm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quét sản phẩm khác/i })).toBeInTheDocument();
  });

  it('xử lý 403 ERR_QUOTA_BARCODE_EXCEEDED: hiển thị thông báo hết lượt và nút Đăng ký miễn phí', async () => {
    const user = userEvent.setup();
    mockApi((req) => {
      if (req.url === '/products/barcode/8934563138165') {
        return {
          status: 403,
          errorCode: 'ERR_QUOTA_BARCODE_EXCEEDED',
          message: 'Bạn đã sử dụng hết 03 lượt quét mã vạch cho khách hôm nay.',
        };
      }
      return undefined;
    });

    renderPage(<BarcodeScan />);

    const manualTab = screen.getByRole('tab', { name: /Nhập mã tay/i });
    await user.click(manualTab);

    const input = screen.getByLabelText(/Mã vạch/i);
    await user.type(input, '8934563138165');

    const submitBtn = screen.getByRole('button', { name: /Kiểm tra/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/Bạn đã dùng hết/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đăng ký miễn phí/i })).toBeInTheDocument();
  });

  it('xử lý 503 ERR_EXT_OPENFOODFACTS_FAILED / ERR_AI_CIRCUIT_OPEN: hiển thị banner "Dịch vụ tạm gián đoạn" và nút Thử lại', async () => {
    const user = userEvent.setup();
    mockApi((req) => {
      if (req.url === '/products/barcode/8934563138165') {
        return {
          status: 503,
          errorCode: 'ERR_EXT_OPENFOODFACTS_FAILED',
          message: 'Dịch vụ tra cứu mã vạch Open Food Facts tạm thời gián đoạn. Vui lòng thử lại sau.',
        };
      }
      return undefined;
    });

    renderPage(<BarcodeScan />);

    const manualTab = screen.getByRole('tab', { name: /Nhập mã tay/i });
    await user.click(manualTab);

    const input = screen.getByLabelText(/Mã vạch/i);
    await user.type(input, '8934563138165');

    const submitBtn = screen.getByRole('button', { name: /Kiểm tra/i });
    await user.click(submitBtn);

    expect(await screen.findByText('Dịch vụ tạm gián đoạn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
  });
});
