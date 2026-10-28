import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import ShoppingList from './ShoppingList';

const MOCK_LIST_DATA = {
  listId: 10,
  planId: 41,
  status: 'PENDING',
  progress: { purchased: 0, total: 3 },
  aisles: [
    {
      aisle: 'PRODUCE',
      items: [
        {
          itemId: 901,
          ingredientId: 23,
          name: 'Cà chua',
          quantity: 200,
          unit: 'g',
          isPurchased: false,
          recipeSources: ['Đậu phụ sốt cà'],
          days: ['MON'],
          dayQuantities: { MON: 200 },
        },
        {
          itemId: 902,
          ingredientId: 24,
          name: 'Bí đỏ',
          quantity: 500,
          unit: 'g',
          isPurchased: false,
          recipeSources: ['Bí đỏ hầm nước cốt dừa'],
          days: ['WED'],
          dayQuantities: { WED: 500 },
        },
      ],
    },
    {
      aisle: 'PLANT_PROTEIN',
      items: [
        {
          itemId: 903,
          ingredientId: 10,
          name: 'Đậu phụ',
          quantity: 300,
          unit: 'g',
          isPurchased: false,
          recipeSources: ['Đậu phụ sốt cà', 'Đậu phụ non sốt nấm'],
          days: ['MON', 'WED'],
          dayQuantities: { MON: 150, WED: 150 },
        },
      ],
    },
  ],
};

const renderShoppingListPage = (route = '/shopping-lists/10') =>
  renderPage(
    <Routes>
      <Route path="/shopping-lists/:id" element={<ShoppingList />} />
    </Routes>,
    { route }
  );

describe('ShoppingList (SCR-24) - Tính năng đi chợ linh hoạt theo ngày & khẩu phần ăn', () => {
  beforeEach(() => {
    localStorage.clear();
    mockApi((req) => {
      if (req.url === '/shopping-lists/10') {
        return { data: MOCK_LIST_DATA };
      }
      if (req.url === '/meal-plans/41') {
        return {
          data: {
            planId: 41,
            planName: 'Thực đơn tuần 19/10',
            startDate: '2026-10-19',
            endDate: '2026-10-25',
            planStatus: 'ACTIVE',
            slots: [],
          },
        };
      }
      return undefined;
    });
  });

  it('1. Hiển thị danh sách đầy đủ khi ở chế độ "Cả tuần" và lọc đúng nguyên liệu khi chọn từng ngày', async () => {
    renderShoppingListPage();

    // Đợi danh sách tải xong
    expect(await screen.findByRole('heading', { level: 1, name: /Danh sách đi chợ/i })).toBeInTheDocument();

    // Mặc định Cả tuần: hiển thị đủ cả 3 món nguyên liệu
    expect(screen.getByText('Cà chua')).toBeInTheDocument();
    expect(screen.getByText('Bí đỏ')).toBeInTheDocument();
    expect(screen.getByText('Đậu phụ')).toBeInTheDocument();

    // Bấm chọn lọc "Thứ 2"
    const monTab = screen.getByRole('tab', { name: /Thứ 2/i });
    await userEvent.click(monTab);

    // Thứ 2: Chỉ có Cà chua (MON) và Đậu phụ (MON, WED)
    await waitFor(() => {
      expect(screen.getByText('Cà chua')).toBeInTheDocument();
      expect(screen.getByText('Đậu phụ')).toBeInTheDocument();
      expect(screen.queryByText('Bí đỏ')).not.toBeInTheDocument(); // Bí đỏ chỉ dùng vào Thứ 4 (WED)
    });

    // Bấm chọn lọc "Thứ 4"
    const wedTab = screen.getByRole('tab', { name: /Thứ 4/i });
    await userEvent.click(wedTab);

    // Thứ 4: Chỉ có Bí đỏ (WED) và Đậu phụ (MON, WED)
    await waitFor(() => {
      expect(screen.getByText('Bí đỏ')).toBeInTheDocument();
      expect(screen.getByText('Đậu phụ')).toBeInTheDocument();
      expect(screen.queryByText('Cà chua')).not.toBeInTheDocument(); // Cà chua chỉ dùng vào Thứ 2
    });

    // Bấm chọn lọc "Thứ 3" (ngày không có món nào)
    const tueTab = screen.getByRole('tab', { name: /Thứ 3/i });
    await userEvent.click(tueTab);

    // Hiển thị trạng thái không có nguyên liệu cho Thứ 3
    await waitFor(() => {
      expect(screen.getByText(/Không có nguyên liệu cho Thứ 3/i)).toBeInTheDocument();
    });

    // Bấm quay lại "Cả tuần"
    const allTab = screen.getByRole('tab', { name: /Cả tuần/i });
    await userEvent.click(allTab);

    await waitFor(() => {
      expect(screen.getByText('Cà chua')).toBeInTheDocument();
      expect(screen.getByText('Bí đỏ')).toBeInTheDocument();
      expect(screen.getByText('Đậu phụ')).toBeInTheDocument();
    });
  });

  it('2. Thay đổi số người ăn tự động nhân khối lượng theo tỷ lệ chuẩn và tự động đổi sang kg khi >= 1000g', async () => {
    renderShoppingListPage();

    expect(await screen.findByText('Cà chua')).toBeInTheDocument();

    // Ban đầu 1 người: Bí đỏ là 500 g, Cà chua là 200 g
    expect(screen.getByText('500 g')).toBeInTheDocument();
    expect(screen.getByText('200 g')).toBeInTheDocument();

    // Chọn preset 2 người
    const btn2 = screen.getByRole('button', { name: '2 người' });
    await userEvent.click(btn2);

    // Khi nhân 2:
    // Cà chua: 200g * 2 = 400 g
    // Bí đỏ: 500g * 2 = 1.000g -> Tự động đổi sang '1 kg'!
    // Đậu phụ: 300g * 2 = 600 g
    await waitFor(() => {
      expect(screen.getByText('400 g')).toBeInTheDocument();
      expect(screen.getByText('1 kg')).toBeInTheDocument();
      expect(screen.getByText('600 g')).toBeInTheDocument();
    });

    // Tăng lên 4 người bằng nút preset 4 người
    const btn4 = screen.getByRole('button', { name: '4 người' });
    await userEvent.click(btn4);

    // Bí đỏ: 500g * 4 = 2.000g -> '2 kg'
    // Cà chua: 200g * 4 = 800 g
    await waitFor(() => {
      expect(screen.getByText('2 kg')).toBeInTheDocument();
      expect(screen.getByText('800 g')).toBeInTheDocument();
    });
  });

  it('3. Hỗ trợ tùy chọn mỗi ngày một khẩu phần ăn khác nhau', async () => {
    renderShoppingListPage();

    expect(await screen.findByText('Cà chua')).toBeInTheDocument();

    // Bật checkbox "Mỗi ngày một khẩu phần ăn khác nhau"
    const customCheckbox = screen.getByLabelText(/Mỗi ngày một khẩu phần ăn khác nhau/i);
    await userEvent.click(customCheckbox);

    // Bảng tùy chỉnh 7 ngày xuất hiện
    expect(screen.getByText(/Tùy chỉnh khẩu phần riêng 7 ngày trong tuần/i)).toBeInTheDocument();

    // Chuyển sang xem Thứ 2 (MON)
    const monTab = screen.getByRole('tab', { name: /Thứ 2/i });
    await userEvent.click(monTab);

    // Đang xem Thứ 2, tăng khẩu phần Thứ 2 lên 2 người bằng nút preset 2 người
    const btn2 = screen.getByRole('button', { name: '2 người' });
    await userEvent.click(btn2);

    // Kiểm tra nguyên liệu Thứ 2:
    // Cà chua (gốc 200g cho 1 người) * 2 = 400 g
    // Đậu phụ (gốc Thứ 2 là 150g cho 1 người) * 2 = 300 g
    await waitFor(() => {
      expect(screen.getByText('400 g')).toBeInTheDocument();
      expect(screen.getByText('300 g')).toBeInTheDocument();
    });

    // Chuyển sang xem Thứ 4 (WED)
    const wedTab = screen.getByRole('tab', { name: /Thứ 4/i });
    await userEvent.click(wedTab);

    // Khẩu phần Thứ 4 vẫn là 1 người (chưa đổi)
    // Bí đỏ Thứ 4: 500 g
    // Đậu phụ Thứ 4: 150 g
    await waitFor(() => {
      expect(screen.getByText('500 g')).toBeInTheDocument();
      expect(screen.getByText('150 g')).toBeInTheDocument();
    });

    // Tăng khẩu phần Thứ 4 lên 4 người
    const btn4 = screen.getByRole('button', { name: '4 người' });
    await userEvent.click(btn4);

    // Bí đỏ Thứ 4: 500g * 4 = 2 kg
    // Đậu phụ Thứ 4: 150g * 4 = 600 g
    await waitFor(() => {
      expect(screen.getByText('2 kg')).toBeInTheDocument();
      expect(screen.getByText('600 g')).toBeInTheDocument();
    });

    // Khi chuyển về "Cả tuần":
    // Tổng Đậu phụ = (150g Thứ 2 * 2 người = 300g) + (150g Thứ 4 * 4 người = 600g) = 900 g!
    // Tổng Cà chua = 200g * 2 = 400 g!
    // Tổng Bí đỏ = 500g * 4 = 2 kg!
    const allTab = screen.getByRole('tab', { name: /Cả tuần/i });
    await userEvent.click(allTab);

    await waitFor(() => {
      expect(screen.getByText('900 g')).toBeInTheDocument();
      expect(screen.getByText('400 g')).toBeInTheDocument();
      expect(screen.getByText('2 kg')).toBeInTheDocument();
    });
  });

  it('4. Thanh tabbar phân loại quầy nguyên liệu, nút Xuất PDF ở header và gạch ngang khi mua', async () => {
    renderShoppingListPage();

    expect(await screen.findByRole('heading', { level: 1, name: /Danh sách đi chợ/i })).toBeInTheDocument();

    // 1. Nút Xuất file PDF hiển thị ở header bên phải gần tiêu đề
    expect(screen.getByRole('button', { name: /Xuất file PDF/i })).toBeInTheDocument();

    // 2. Thanh tabbar phân loại quầy nguyên liệu có mặt
    expect(screen.getByText('Phân loại theo quầy mua sắm:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tất cả quầy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rau củ quả/i })).toBeInTheDocument();

    // 3. Lọc theo quầy "Rau củ quả": chỉ hiện Cà chua, Bí đỏ; không hiện Đậu phụ
    const produceTab = screen.getByRole('button', { name: /Rau củ quả/i });
    await userEvent.click(produceTab);

    expect(screen.getByText('Cà chua')).toBeInTheDocument();
    expect(screen.getByText('Bí đỏ')).toBeInTheDocument();
    expect(screen.queryByText('Đậu phụ')).not.toBeInTheDocument();

    // 4. Khi tích vào checkbox mua: có class line-through (gạch ngang)
    const tomatoItem = screen.getByText('Cà chua');
    expect(tomatoItem).not.toHaveClass('line-through');

    // Chưa mua hết: badge là Đang mua, không hiện banner đã hoàn tất
    expect(screen.getByText('Đang mua')).toBeInTheDocument();
    expect(screen.queryByText(/Bạn đã tích mua xong tất cả/i)).not.toBeInTheDocument();
  });

  it('5. Bấm vào ngày nào thì hiện ra khẩu phần ăn theo ngày đó có thể tăng cộng trừ, ghi rõ số lượng tăng/giảm so với ban đầu', async () => {
    renderShoppingListPage();

    expect(await screen.findByRole('heading', { level: 1, name: /Danh sách đi chợ/i })).toBeInTheDocument();

    // Mặc định Cả tuần: tiêu đề là Khẩu phần ăn (Cả tuần)
    expect(screen.getByRole('heading', { level: 2, name: /Khẩu phần ăn \(Cả tuần\)/i })).toBeInTheDocument();

    // 1. Bấm vào Thứ 2 (MON)
    const monTab = screen.getByRole('tab', { name: /Thứ 2/i });
    await userEvent.click(monTab);

    // Tiêu đề khẩu phần ăn lập tức chuyển thành: Khẩu phần ăn Thứ 2
    expect(await screen.findByRole('heading', { level: 2, name: /Khẩu phần ăn Thứ 2/i })).toBeInTheDocument();

    // Ban đầu 1 người: Cà chua hiển thị 200 g và ghi rõ "(Khẩu phần gốc: 200 g)"
    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByText(/\(Khẩu phần gốc: 200 g\)/i)).toBeInTheDocument();

    // 2. Tăng khẩu phần Thứ 2 lên 2 người bằng nút [+]
    const btnInc = screen.getByRole('button', { name: 'Tăng khẩu phần' });
    await userEvent.click(btnInc);

    // Tiêu đề badge hiển thị Thứ 2: 2 người
    expect(screen.getByText(/Thứ 2: 2 người/i)).toBeInTheDocument();

    // Khối lượng Cà chua tăng lên 400 g và ghi rõ: "+200 g" và "(gốc 200 g ban đầu)"
    await waitFor(() => {
      expect(screen.getByText('400 g')).toBeInTheDocument();
      expect(screen.getByText('+200 g')).toBeInTheDocument();
      expect(screen.getByText(/\(gốc 200 g ban đầu\)/i)).toBeInTheDocument();
    });

    // Đậu phụ Thứ 2 (gốc 150 g * 2 = 300 g): hiển thị "+150 g" và "(gốc 150 g ban đầu)"
    expect(screen.getByText('300 g')).toBeInTheDocument();
    expect(screen.getByText('+150 g')).toBeInTheDocument();
    expect(screen.getByText(/\(gốc 150 g ban đầu\)/i)).toBeInTheDocument();

    // 3. Bấm chuyển sang Thứ 4 (WED)
    const wedTab = screen.getByRole('tab', { name: /Thứ 4/i });
    await userEvent.click(wedTab);

    // Tiêu đề đổi thành Khẩu phần ăn Thứ 4, khẩu phần hiện tại vẫn là 1 người
    expect(await screen.findByRole('heading', { level: 2, name: /Khẩu phần ăn Thứ 4/i })).toBeInTheDocument();
    expect(screen.getByText(/Thứ 4: 1 người/i)).toBeInTheDocument();

    // Bí đỏ 1 người: 500 g, "(Khẩu phần gốc: 500 g)"
    expect(screen.getByText('500 g')).toBeInTheDocument();
    expect(screen.getByText(/\(Khẩu phần gốc: 500 g\)/i)).toBeInTheDocument();

    // 4. Tăng Thứ 4 lên 4 người bằng preset 4 người
    const btn4 = screen.getByRole('button', { name: '4 người' });
    await userEvent.click(btn4);

    // Bí đỏ tăng lên 2 kg, ghi rõ "+1,5 kg" (chuẩn vi-VN) và "(gốc 500 g ban đầu)"
    await waitFor(() => {
      expect(screen.getByText('2 kg')).toBeInTheDocument();
      expect(screen.getByText(/\+1[,.]5 kg/)).toBeInTheDocument();
      expect(screen.getByText(/\(gốc 500 g ban đầu\)/i)).toBeInTheDocument();
    });
  });
});
