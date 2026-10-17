import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPage } from '@/test/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';
import * as api from '../api/fridge.api';
import * as compressLib from '../lib/compressImage';
import * as sizeLib from '../lib/readImageSize';
import { FridgePage } from '../pages/FridgePage';
import {
  addItemSchema,
  checkImageDimensions,
  checkImageFile,
  editDetectedItemSchema,
  editItemSchema,
} from '../schemas/fridge.schema';

vi.mock('../api/fridge.api');
vi.mock('../lib/readImageSize');
vi.mock('../lib/compressImage');

const testMember = {
  userId: 1,
  fullName: 'Nguyễn Văn A',
  email: 'vana@veggielife.vn',
  role: 'MEMBER' as const,
  isVip: false,
};

const mockFridgeItems = [
  { inventoryId: 1, ingredientId: 10, name: 'Nấm rơm', freshnessStatus: 'NON-FRESH' as const },
  { inventoryId: 2, ingredientId: 11, name: 'Cà rốt', freshnessStatus: 'FRESH' as const },
];

const mockRecipeSuggestions = [
  {
    recipeId: 101,
    title: 'Canh Nấm Rơm Đậu Hũ',
    similarity: 0.85,
    missingIngredients: [{ ingredientId: 20, name: 'Hành hoa' }],
    usesNonFreshItems: true,
  },
];

const createMockFile = (name = 'fridge.jpg', type = 'image/jpeg', size = 2048) =>
  new File([new Uint8Array(size)], name, { type });

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ user: null, accessToken: null, token: null, guestToken: 'test-guest-token' });
  useGuestStore.setState({ quota: null });

  // Mock mặc định cho readImageSize và compressImage
  vi.mocked(sizeLib.readImageSize).mockResolvedValue({ width: 1280, height: 720 });
  vi.mocked(compressLib.compressImage).mockImplementation(async (file) => ({
    file,
    originalSize: file.size,
    compressedSize: file.size,
    wasCompressed: false,
    width: 1280,
    height: 720,
    reductionPercentage: 0,
  }));
});

describe('1. Kiểm tra Schema & Xác thực ảnh (BR-AI-CV-01)', () => {
  it('Chấp nhận JPG, PNG, WEBP và từ chối các định dạng khác', () => {
    expect(checkImageFile(createMockFile('a.jpg', 'image/jpeg'))).toBeNull();
    expect(checkImageFile(createMockFile('a.png', 'image/png'))).toBeNull();
    expect(checkImageFile(createMockFile('a.webp', 'image/webp'))).toBeNull();

    expect(checkImageFile(createMockFile('doc.pdf', 'application/pdf'))).toMatch(
      /Chỉ chấp nhận tệp ảnh JPG, PNG hoặc WEBP/,
    );
  });

  it('Từ chối ảnh vượt quá 10 MB hoặc tệp rỗng', () => {
    expect(checkImageFile(createMockFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024))).toMatch(
      /Ảnh quá lớn \(tối đa 10 MB\)/,
    );
    expect(checkImageFile(createMockFile('empty.jpg', 'image/jpeg', 0))).toMatch(
      /Tệp ảnh rỗng/,
    );
  });

  it('Báo lỗi thân thiện, dễ hiểu khi ảnh quá nhỏ (< 640×480)', () => {
    // Độ phân giải chuẩn: ngang 640x480 hoặc dọc 480x640
    expect(checkImageDimensions(640, 480)).toBeNull();
    expect(checkImageDimensions(480, 640)).toBeNull();
    expect(checkImageDimensions(1920, 1080)).toBeNull();

    // Quá nhỏ
    const err = checkImageDimensions(400, 300);
    expect(err).toMatch(/Ảnh có kích thước quá nhỏ \(400×300 px\)/);
    expect(err).toMatch(/tối thiểu 640×480 pixels/);

    expect(checkImageDimensions(639, 480)).toMatch(/Ảnh có kích thước quá nhỏ/);
    expect(checkImageDimensions(640, 479)).toMatch(/Ảnh có kích thước quá nhỏ/);
  });

  it('Validate schema cho thêm / sửa nguyên liệu và sửa tay', () => {
    expect(addItemSchema.safeParse({ ingredientId: 1, freshnessStatus: 'FRESH' }).success).toBe(true);
    expect(addItemSchema.safeParse({ ingredientId: 0 }).success).toBe(false);

    expect(editItemSchema.safeParse({ freshnessStatus: 'NON-FRESH' }).success).toBe(true);
    expect(editItemSchema.safeParse({ freshnessStatus: 'ROTTEN' }).success).toBe(false);

    expect(editDetectedItemSchema.safeParse({ name: 'Cà rốt bi', freshnessStatus: 'FRESH' }).success).toBe(true);
    expect(editDetectedItemSchema.safeParse({ name: '', freshnessStatus: 'FRESH' }).success).toBe(false);
  });
});

describe('2. Tự động thu nhỏ ảnh lớn trước khi gửi', () => {
  it('Khi ảnh có dung lượng lớn, compressImage trả về file nén', async () => {
    const largeFile = createMockFile('large.jpg', 'image/jpeg', 5 * 1024 * 1024);
    const compressedFile = createMockFile('large_compressed.jpg', 'image/jpeg', 500 * 1024);

    vi.mocked(compressLib.compressImage).mockResolvedValueOnce({
      file: compressedFile,
      originalSize: largeFile.size,
      compressedSize: compressedFile.size,
      wasCompressed: true,
      width: 1920,
      height: 1080,
      reductionPercentage: 90,
    });

    renderPage(<FridgePage />);
    const fileInput = screen.getByLabelText('Chọn ảnh tủ lạnh');
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(compressLib.compressImage).toHaveBeenCalledWith(largeFile, expect.any(Object));
    });

    // Thông báo nén ảnh xuất hiện thân thiện
    expect(await screen.findByText(/Tự động nén ảnh: 5.0 MB → 500 KB/)).toBeInTheDocument();
  });
});

describe('3. Báo lỗi thân thiện khi ảnh quá nhỏ', () => {
  it('Chặn ngay phía client khi ảnh nhỏ hơn 640×480 và hiện câu dễ hiểu', async () => {
    vi.mocked(sizeLib.readImageSize).mockResolvedValueOnce({ width: 320, height: 240 });

    renderPage(<FridgePage />);
    const fileInput = screen.getByLabelText('Chọn ảnh tủ lạnh');
    fireEvent.change(fileInput, { target: { files: [createMockFile('tiny.jpg')] } });

    expect(await screen.findByText(/Ảnh có kích thước quá nhỏ \(320×240 px\)/)).toBeInTheDocument();
    expect(screen.getByText(/tối thiểu 640×480 pixels/)).toBeInTheDocument();

    // Không gọi API nhận diện
    expect(api.createDetection).not.toHaveBeenCalled();
  });

  it('Hiện thông điệp dễ hiểu khi server trả lỗi 422 ERR_FRIDGE_IMAGE_TOO_SMALL', async () => {
    const { AxiosError } = await import('axios');
    const response = {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: {} as import('axios').InternalAxiosRequestConfig,
      data: {
        statusCode: 422,
        errorCode: 'ERR_FRIDGE_IMAGE_TOO_SMALL',
        message: 'Độ phân giải ảnh nhỏ hơn mức tối thiểu 640×480 pixels (BR-AI-CV-01).',
      },
    };
    const axiosError = new AxiosError('Ảnh quá nhỏ', '422', undefined, undefined, response as unknown as import('axios').AxiosResponse);

    vi.mocked(api.createDetection).mockRejectedValueOnce(axiosError);

    renderPage(<FridgePage />);
    const fileInput = screen.getByLabelText('Chọn ảnh tủ lạnh');
    fireEvent.change(fileInput, { target: { files: [createMockFile('fridge.jpg')] } });

    const analyzeBtn = await screen.findByRole('button', { name: /Nhận diện nguyên liệu/ });
    await waitFor(() => expect(analyzeBtn).toBeEnabled());
    await userEvent.click(analyzeBtn);

    expect(
      await screen.findByText(/Độ phân giải ảnh chưa đạt chuẩn tối thiểu 640×480 pixels/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Mẹo: Hãy chụp thẳng góc/)).toBeInTheDocument();
  });
});

describe('4. Màn hình tủ lạnh ảo: Hiển thị độ tươi, hạn mức còn lại và sửa tay', () => {
  it('Khách: hiển thị hạn mức AI còn lại, không gọi API kho thành viên', () => {
    useGuestStore.setState({ quota: { ai: { limit: 3, used: 1, remaining: 2 }, barcodeDaily: { limit: 3, used: 0, remaining: 3 }, mapSearch: { limit: 3, used: 0, remaining: 3 } } });

    renderPage(<FridgePage />);

    expect(screen.getByText(/Lượt AI dùng thử: Còn/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Kho tủ lạnh ảo dành cho thành viên')).toBeInTheDocument();
    expect(api.listFridgeItems).not.toHaveBeenCalled();
  });

  it('Thành viên: hiển thị hạn mức ảnh hôm nay, danh sách nguyên liệu và độ tươi FRESH / NON-FRESH', async () => {
    useAuthStore.setState({ user: testMember, accessToken: 'token-123' });
    vi.mocked(api.listFridgeItems).mockResolvedValue(mockFridgeItems);
    vi.mocked(api.listRecipeSuggestions).mockResolvedValue(mockRecipeSuggestions);

    renderPage(<FridgePage />);

    expect(await screen.findByText('Nấm rơm')).toBeInTheDocument();
    expect(screen.getByText('Cà rốt')).toBeInTheDocument();

    // Độ tươi hiển thị rõ ràng (trên badge và filter)
    expect(screen.getByText(/NON-FRESH · Cần dùng sớm/)).toBeInTheDocument();
    expect(screen.getAllByText(/FRESH · Còn tươi/).length).toBeGreaterThanOrEqual(1);

    // Gợi ý món giải cứu
    expect(await screen.findByText('Canh Nấm Rơm Đậu Hũ')).toBeInTheDocument();
    expect(screen.getByText('85% khớp')).toBeInTheDocument();
  });

  it('Nhận diện thành công: hiện danh sách nguyên liệu và cho phép sửa tay', async () => {
    vi.mocked(api.createDetection).mockResolvedValueOnce({
      saved: false,
      detected: [
        { name: 'Cà chua', freshnessStatus: 'FRESH' },
        { name: 'Hành tây', freshnessStatus: 'NON-FRESH' },
      ],
      quota: { used: 1, limit: 3, remaining: 2 },
      warnings: ['Ảnh hơi thiếu sáng'],
    });

    renderPage(<FridgePage />);
    const fileInput = screen.getByLabelText('Chọn ảnh tủ lạnh');
    fireEvent.change(fileInput, { target: { files: [createMockFile('test.jpg')] } });

    const analyzeBtn = await screen.findByRole('button', { name: /Nhận diện nguyên liệu/ });
    await waitFor(() => expect(analyzeBtn).toBeEnabled());
    await userEvent.click(analyzeBtn);

    expect(await screen.findByText('Đã nhận diện 2 nguyên liệu')).toBeInTheDocument();
    expect(screen.getByText('Cà chua')).toBeInTheDocument();
    expect(screen.getByText('Hành tây')).toBeInTheDocument();
    expect(screen.getByText('Ảnh hơi thiếu sáng')).toBeInTheDocument();

    // Bấm nút "Sửa tay" cho nguyên liệu đầu tiên
    const editBtns = screen.getAllByRole('button', { name: /Sửa tay/ });
    expect(editBtns.length).toBeGreaterThan(0);
    await userEvent.click(editBtns[0]);

    // Modal sửa tay mở ra
    expect(await screen.findByText('Sửa tay nguyên liệu AI nhận diện')).toBeInTheDocument();

    const nameInput = screen.getByLabelText('Tên nguyên liệu');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Cà chua bi tươi');

    const updateBtn = screen.getByRole('button', { name: 'Cập nhật' });
    await userEvent.click(updateBtn);

    // Danh sách được cập nhật với tên mới
    expect(await screen.findByText('Cà chua bi tươi')).toBeInTheDocument();
  });
});
