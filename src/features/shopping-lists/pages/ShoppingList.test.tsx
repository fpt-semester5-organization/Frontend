import { screen, waitFor } from '@testing-library/react';
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

const MOCK_PLAN_DATA = {
  planId: 41,
  planName: 'Thực đơn tuần 19/10',
  startDate: '2026-10-19',
  endDate: '2026-10-25',
  planStatus: 'ACTIVE',
  slots: [
    {
      slotId: 101,
      dayOfWeek: 'MON',
      mealType: 'LUNCH',
      recipe: { recipeId: 1, title: 'Đậu phụ sốt cà', imageUrl: '' },
    },
    {
      slotId: 102,
      dayOfWeek: 'WED',
      mealType: 'LUNCH',
      recipe: { recipeId: 2, title: 'Bí đỏ hầm nước cốt dừa', imageUrl: '' },
    },
    {
      slotId: 103,
      dayOfWeek: 'WED',
      mealType: 'DINNER',
      recipe: { recipeId: 3, title: 'Đậu phụ non sốt nấm', imageUrl: '' },
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
        return { data: MOCK_PLAN_DATA };
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

    // Bấm chọn lọc "Thứ Hai" (MON)
    const monTab = screen.getByRole('tab', { name: /Thứ Hai/i });
    await userEvent.click(monTab);

    // Thứ Hai: Có Cà chua (MON) và Đậu phụ (MON, WED)
    await waitFor(() => {
      expect(screen.getByText('Cà chua')).toBeInTheDocument();
      expect(screen.getByText('Đậu phụ')).toBeInTheDocument();
      expect(screen.queryByText('Bí đỏ')).not.toBeInTheDocument(); // Bí đỏ chỉ dùng vào Thứ Tư (WED)
    });

    // Bấm chọn lọc "Thứ Tư" (WED)
    const wedTab = screen.getByRole('tab', { name: /Thứ Tư/i });
    await userEvent.click(wedTab);

    // Thứ Tư: Có Bí đỏ (WED) và Đậu phụ (MON, WED)
    await waitFor(() => {
      expect(screen.getByText('Bí đỏ')).toBeInTheDocument();
      expect(screen.getByText('Đậu phụ')).toBeInTheDocument();
      expect(screen.queryByText('Cà chua')).not.toBeInTheDocument(); // Cà chua chỉ dùng vào Thứ Hai
    });

    // Bấm chọn lọc "Thứ Ba" (ngày không có món nào)
    const tueTab = screen.getByRole('tab', { name: /Thứ Ba/i });
    await userEvent.click(tueTab);

    // Hiển thị trạng thái không có nguyên liệu cho Thứ Ba
    await waitFor(() => {
      expect(screen.getByText(/Ngày này không cần mua nguyên liệu ở quầy rau củ quả/i)).toBeInTheDocument();
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

    // Tăng lên 2 người bằng nút Stepper [+]
    const btnInc = screen.getByRole('button', { name: 'Tăng 1 người' });
    await userEvent.click(btnInc);

    // Khi nhân 2:
    // Cà chua: 200g * 2 = 400 g
    // Bí đỏ: 500g * 2 = 1.000g -> Tự động đổi sang '1 kg'!
    // Đậu phụ: 300g * 2 = 600 g
    await waitFor(() => {
      expect(screen.getByText('400 g')).toBeInTheDocument();
      expect(screen.getByText('1 kg')).toBeInTheDocument();
      expect(screen.getByText('600 g')).toBeInTheDocument();
    });

    // Tăng tiếp lên 4 người (thêm 2 lần click)
    await userEvent.click(btnInc);
    await userEvent.click(btnInc);

    // Bí đỏ: 500g * 4 = 2.000g -> '2 kg'
    // Cà chua: 200g * 4 = 800 g
    await waitFor(() => {
      expect(screen.getByText('2 kg')).toBeInTheDocument();
      expect(screen.getByText('800 g')).toBeInTheDocument();
    });
  });

  it('3. Hỗ trợ tùy chỉnh khẩu phần ăn theo từng ngày độc lập', async () => {
    renderShoppingListPage();

    expect(await screen.findByText('Cà chua')).toBeInTheDocument();

    // Chuyển sang xem Thứ Hai (MON)
    const monTab = screen.getByRole('tab', { name: /Thứ Hai/i });
    await userEvent.click(monTab);

    // Đang xem Thứ Hai, tăng khẩu phần Thứ Hai lên 2 người
    const btnInc = screen.getByRole('button', { name: 'Tăng 1 người' });
    await userEvent.click(btnInc);

    // Kiểm tra nguyên liệu Thứ Hai:
    // Cà chua (gốc 200g cho 1 người) * 2 = 400 g
    // Đậu phụ (gốc Thứ Hai là 150g cho 1 người) * 2 = 300 g
    await waitFor(() => {
      expect(screen.getByText('400 g')).toBeInTheDocument();
      expect(screen.getByText('300 g')).toBeInTheDocument();
    });

    // Chuyển sang xem Thứ Tư (WED)
    const wedTab = screen.getByRole('tab', { name: /Thứ Tư/i });
    await userEvent.click(wedTab);

    // Khẩu phần Thứ Tư vẫn là 1 người (chưa đổi)
    // Bí đỏ Thứ Tư: 500 g
    // Đậu phụ Thứ Tư: 150 g
    await waitFor(() => {
      expect(screen.getByText('500 g')).toBeInTheDocument();
      expect(screen.getByText('150 g')).toBeInTheDocument();
    });

    // Tăng khẩu phần Thứ Tư lên 4 người (3 lần click)
    await userEvent.click(btnInc);
    await userEvent.click(btnInc);
    await userEvent.click(btnInc);

    // Bí đỏ Thứ Tư: 500g * 4 = 2 kg
    // Đậu phụ Thứ Tư: 150g * 4 = 600 g
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

  it('4. Hiển thị 4 quầy mua sắm và gạch ngang khi mua', async () => {
    renderShoppingListPage();

    expect(await screen.findByRole('heading', { level: 1, name: /Danh sách đi chợ/i })).toBeInTheDocument();

    // 4 quầy nguyên liệu hiển thị trực tiếp
    expect(screen.getByText('Rau củ quả')).toBeInTheDocument();
    expect(screen.getByText('Đậu hạt & đạm thực vật')).toBeInTheDocument();

    // Khi tích vào checkbox mua: có class line-through (gạch ngang)
    const tomatoItem = screen.getByText('Cà chua');
    expect(tomatoItem).not.toHaveClass('line-through');

    // Tích chọn checkbox mua cà chua
    const checkboxes = screen.getAllByRole('checkbox');
    const tomatoCheckbox = checkboxes.find((cb) => cb.getAttribute('aria-label')?.includes('Cà chua')) || checkboxes[1];
    await userEvent.click(tomatoCheckbox);

    await waitFor(() => {
      expect(screen.getByText('Cà chua')).toHaveClass('line-through');
    });
  });

  it('5. Khối khẩu phần ăn tinh gọn: Stepper điều chỉnh số người và nút áp dụng cho cả tuần', async () => {
    renderShoppingListPage();

    expect(await screen.findByRole('heading', { level: 1, name: /Danh sách đi chợ/i })).toBeInTheDocument();

    // Mặc định Cả tuần: tiêu đề là Khẩu phần cả tuần:
    expect(screen.getByText(/Khẩu phần cả tuần:/i)).toBeInTheDocument();
    expect(screen.getByText(/x1 người ăn/i)).toBeInTheDocument();

    // 1. Bấm vào Thứ Hai
    const monTab = screen.getByRole('tab', { name: /Thứ Hai/i });
    await userEvent.click(monTab);

    // Tiêu đề khẩu phần chuyển sang ngày
    expect(await screen.findByText(/Khẩu phần Thứ Hai/i)).toBeInTheDocument();

    // 2. Tăng khẩu phần Thứ Hai lên 2 người bằng Stepper [+]
    const btnInc = screen.getByRole('button', { name: 'Tăng 1 người' });
    await userEvent.click(btnInc);

    expect(screen.getByText(/x2 người ăn/i)).toBeInTheDocument();

    // Nút "Áp dụng cho cả tuần" xuất hiện khi có tùy chỉnh riêng
    const applyAllBtn = screen.getByRole('button', { name: /Áp dụng cho cả tuần/i });
    expect(applyAllBtn).toBeInTheDocument();

    // Bấm áp dụng cho cả tuần
    await userEvent.click(applyAllBtn);

    // Chuyển sang Thứ Tư kiểm tra xem đã được đồng bộ 2 người chưa
    const wedTab = screen.getByRole('tab', { name: /Thứ Tư/i });
    await userEvent.click(wedTab);

    expect(await screen.findByText(/x2 người ăn/i)).toBeInTheDocument();
  });
});
