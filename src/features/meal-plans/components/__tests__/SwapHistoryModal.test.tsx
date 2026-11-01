import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderPage } from '@/test/utils';
import { SwapHistoryModal } from '../SwapHistoryModal';
import { MealSlotCard } from '../MealSlotCard';
import type { MealSlot, MealSlotSwapHistoryItem } from '../../types/mealPlan.types';

const mockHistoryData: MealSlotSwapHistoryItem[] = [
  {
    historyId: 1,
    slotId: 5001,
    oldRecipeId: 201,
    oldRecipeTitle: 'Cơm gạo lứt đậu phụ sốt cà',
    oldRecipeImageUrl: 'https://images.unsplash.com/photo-old',
    oldRecipeCalories: 520,
    newRecipeId: 202,
    newRecipeTitle: 'Bún xào rau củ',
    newRecipeImageUrl: 'https://images.unsplash.com/photo-new',
    newRecipeCalories: 480,
    swapReason: 'TASTE_PREFERENCE',
    caloriesDelta: -40,
    swappedAt: '2026-10-30T14:35:00.000Z',
  },
  {
    historyId: 2,
    slotId: 5001,
    oldRecipeId: 205,
    oldRecipeTitle: 'Cơm nấm kho tiêu',
    oldRecipeImageUrl: null,
    oldRecipeCalories: 500,
    newRecipeId: 201,
    newRecipeTitle: 'Cơm gạo lứt đậu phụ sốt cà',
    newRecipeImageUrl: null,
    newRecipeCalories: 520,
    swapReason: 'MISSING_INGREDIENT',
    caloriesDelta: 20,
    swappedAt: '2026-10-29T10:15:00.000Z',
  },
];

const mockSlot: MealSlot = {
  slotId: 5001,
  dayOfWeek: 'MON',
  mealType: 'LUNCH',
  isCompleted: false,
  swapCount: 2,
  swapHistories: mockHistoryData,
  recipe: {
    recipeId: 202,
    title: 'Bún xào rau củ',
    caloriesKcal: 480,
    imageUrl: 'https://images.unsplash.com/photo-new',
  },
};

describe('SwapHistoryModal & MealSlotCard Swap Badge [TASK-T2]', () => {
  it('hiển thị đầy đủ thông tin món cũ, món mới, lý do và calo đối chứng trong SwapHistoryModal', () => {
    const handleClose = vi.fn();
    renderPage(
      <SwapHistoryModal
        slot={mockSlot}
        dayLabel="Thứ Hai"
        planId={41}
        onClose={handleClose}
      />
    );

    // Tiêu đề modal và phụ đề
    expect(screen.getByText('Chi tiết món trước đó & Lịch sử đổi')).toBeInTheDocument();
    expect(screen.getByText(/Bữa trưa · Thứ Hai/)).toBeInTheDocument();

    // Món trước đó và món mới
    expect(screen.getAllByText('Cơm gạo lứt đậu phụ sốt cà').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bún xào rau củ').length).toBeGreaterThanOrEqual(1);

    // Thông tin calo & chênh lệch
    expect(screen.getAllByText(/520 kcal/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/480 kcal/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Món mới giảm 40 kcal so với món trước/)).toBeInTheDocument();

    // Lý do đã chọn (Ánh xạ chuẩn tiếng Việt từ TASTE_PREFERENCE -> Không hợp khẩu vị)
    expect(screen.getByText('Không hợp khẩu vị')).toBeInTheDocument();

    // Huy hiệu tổng số lần đổi
    expect(screen.getByText('Đã đổi 2 lần')).toBeInTheDocument();

    // Dòng thời gian các lần đổi trước
    expect(screen.getByText('Toàn bộ các lần đổi trước (2 lần)')).toBeInTheDocument();
    expect(screen.getByText('Cơm nấm kho tiêu')).toBeInTheDocument();
  });

  it('hiển thị cảnh báo lỗi thân thiện và không bị crash khi API lỗi', async () => {
    const errorSlot: MealSlot = {
      slotId: 99999,
      dayOfWeek: 'MON',
      mealType: 'BREAKFAST',
      isCompleted: false,
      swapCount: 0,
      swapHistories: [],
      recipe: {
        recipeId: 101,
        title: 'Cháo yến mạch',
        caloriesKcal: 320,
        imageUrl: null,
      },
    };

    renderPage(
      <SwapHistoryModal
        slot={errorSlot}
        dayLabel="Thứ Hai"
        planId={41}
        onClose={vi.fn()}
      />
    );

    // Không bị crash, hiển thị thông báo lỗi thân thiện và nút thử lại
    await waitFor(() => {
      expect(screen.getByText(/Không thể tải lịch sử đổi món lúc này/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    });
  });

  it('xử lý an toàn khi không có lịch sử đổi món (empty state)', () => {
    const emptySlot: MealSlot = {
      slotId: 0, // id 0 không trigger query, dùng trực tiếp mảng rỗng
      dayOfWeek: 'MON',
      mealType: 'BREAKFAST',
      isCompleted: false,
      swapCount: 0,
      swapHistories: [],
      recipe: {
        recipeId: 101,
        title: 'Cháo yến mạch',
        caloriesKcal: 320,
        imageUrl: null,
      },
    };

    renderPage(
      <SwapHistoryModal
        slot={emptySlot}
        dayLabel="Thứ Hai"
        planId={41}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Chưa có bản ghi đổi món')).toBeInTheDocument();
  });

  it('gắn huy hiệu "Đã đổi 1 lần" trên MealSlotCard khi có swapCount = 1 và gọi onOpenHistory khi click', async () => {
    const user = userEvent.setup();
    const handleOpenHistory = vi.fn();

    const singleSwappedSlot: MealSlot = {
      ...mockSlot,
      swapCount: 1,
    };

    renderPage(
      <MealSlotCard
        slot={singleSwappedSlot}
        showKcal={true}
        canComplete={true}
        canSwap={true}
        completing={false}
        swapCount={1}
        onToggleComplete={vi.fn()}
        onSwap={vi.fn()}
        onOpenHistory={handleOpenHistory}
      />
    );

    // Huy hiệu "Đã đổi 1 lần" xuất hiện
    const badge = screen.getByRole('button', { name: /xem lại món trước đó/i });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Đã đổi 1 lần');

    // Click vào huy hiệu kích hoạt mở modal
    await user.click(badge);
    expect(handleOpenHistory).toHaveBeenCalledTimes(1);
  });

  it('ẩn huy hiệu đổi món trên MealSlotCard khi swapCount = 0', () => {
    const unswappedSlot: MealSlot = {
      ...mockSlot,
      swapCount: 0,
      swapHistories: [],
    };

    renderPage(
      <MealSlotCard
        slot={unswappedSlot}
        showKcal={true}
        canComplete={true}
        canSwap={true}
        completing={false}
        swapCount={0}
        onToggleComplete={vi.fn()}
        onSwap={vi.fn()}
      />
    );

    expect(screen.queryByText(/Đã đổi/)).not.toBeInTheDocument();
  });
});
