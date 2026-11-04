import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { MealPlanDetail } from '../MealPlanDetail';

const mockActivePlan = {
  planId: 41,
  planName: 'Thực đơn dinh dưỡng 7 ngày',
  startDate: '2026-11-02',
  endDate: '2026-11-08',
  budgetTier: 'STANDARD',
  customInstructions: 'ít dầu, không cay',
  targetDailyKcal: 2000,
  planStatus: 'ACTIVE',
  generatedByAi: true,
  durationDays: 7,
  slots: [
    {
      slotId: 5001,
      dayOfWeek: 'MON',
      mealType: 'BREAKFAST',
      recipeId: 101,
      recipe: { recipeId: 101, title: 'Yến mạch trái cây', caloriesKcal: 350 },
      isCompleted: false,
    },
    {
      slotId: 5002,
      dayOfWeek: 'MON',
      mealType: 'LUNCH',
      recipeId: 102,
      recipe: { recipeId: 102, title: 'Cơm gạo lứt xào nấm', caloriesKcal: 550 },
      isCompleted: false,
    },
    {
      slotId: 5003,
      dayOfWeek: 'MON',
      mealType: 'DINNER',
      recipeId: 103,
      recipe: { recipeId: 103, title: 'Canh rong biển đậu hũ', caloriesKcal: 400 },
      isCompleted: false,
    },
  ],
  edits: {
    preDeployUsed: 0,
    preDeployLimit: 21,
    postDeployUsed: 0,
    postDeployLimit: 21,
  },
  maxSwapsAllowed: 21,
  swapsRemaining: 21,
};

function signInAsMember() {
  useAuthStore.setState({
    user: { userId: 1024, fullName: 'Nguyễn An', email: 'an.nguyen@gmail.com', role: 'MEMBER', isVip: false },
    accessToken: 'mock-token-1024',
    token: 'mock-token-1024',
    guestToken: null,
    isAuthenticated: true,
    sessionStatus: 'ready',
  });
  useUiStore.setState({ toasts: [] });
}

describe('MealPlanDetail - Ghi Chú AI Áp Dụng Tại Món Ăn & Nút Hủy Thực Đơn (SWP391-232)', () => {
  beforeEach(() => {
    signInAsMember();
  });

  it('xóa bỏ banner to phía trên và hiển thị ghi chú trực tiếp tại món ăn được AI áp dụng', async () => {
    mockApi((req) => {
      if (req.url === '/meal-plans/41' && req.method === 'GET') {
        return { data: mockActivePlan };
      }
      if (req.url.includes('/nutrition')) {
        return { data: { days: [] } };
      }
      return undefined;
    });

    renderPage(
      <Routes>
        <Route path="/meal-plans/:id" element={<MealPlanDetail />} />
      </Routes>,
      { route: '/meal-plans/41' }
    );

    // 1. Chờ trang tải xong (thấy nút đi chợ)
    expect(await screen.findByRole('button', { name: /đi chợ/i })).toBeInTheDocument();

    // 2. Banner lớn phía trên ĐÃ ĐƯỢC XÓA BỎ HOÀN TOÀN
    expect(screen.queryByRole('region', { name: /Đối chiếu ghi chú dinh dưỡng AI/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Ghi chú dinh dưỡng cá nhân đã gửi AI/i)).not.toBeInTheDocument();

    // 3. Yêu cầu của người dùng được dời về hiển thị tại đúng món ăn với tiền tố "AI đã áp dụng yêu cầu của bạn:"
    expect(await screen.findByText(/AI đã áp dụng yêu cầu của bạn:/i)).toBeInTheDocument();
    expect(screen.getByText(/ít dầu, không cay/i)).toBeInTheDocument();
  });

  it('KHÔNG hiển thị note AI áp dụng khi thực đơn không kèm ghi chú dinh dưỡng tự do', async () => {
    mockApi((req) => {
      if (req.url === '/meal-plans/42' && req.method === 'GET') {
        return { data: { ...mockActivePlan, planId: 42, customInstructions: null } };
      }
      if (req.url.includes('/nutrition')) {
        return { data: { days: [] } };
      }
      return undefined;
    });

    renderPage(
      <Routes>
        <Route path="/meal-plans/:id" element={<MealPlanDetail />} />
      </Routes>,
      { route: '/meal-plans/42' }
    );

    // Chờ trang tải xong (thấy nút đi chợ)
    expect(await screen.findByRole('button', { name: /đi chợ/i })).toBeInTheDocument();

    // Kiểm tra Banner to và note AI áp dụng HOÀN TOÀN KHÔNG HIỆN DIỆN
    expect(screen.queryByRole('region', { name: /Đối chiếu ghi chú dinh dưỡng AI/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Ghi chú dinh dưỡng cá nhân đã gửi AI/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI đã áp dụng yêu cầu của bạn:/i)).not.toBeInTheDocument();
  });

  it('hiển thị nút Hủy thực đơn và mở Modal xác nhận kèm cảnh báo không hoàn lại Quota tuần', async () => {
    const user = userEvent.setup();
    let currentStatus = 'ACTIVE';

    mockApi((req) => {
      if (req.url === '/meal-plans/41' && req.method === 'GET') {
        return { data: { ...mockActivePlan, planStatus: currentStatus } };
      }
      if (req.url === '/meal-plans/41/cancel' && req.method === 'PUT') {
        currentStatus = 'CANCELLED';
        return {
          message: 'Đã hủy thực đơn thành công.',
          data: { ...mockActivePlan, planStatus: 'CANCELLED' },
        };
      }
      if (req.url.includes('/nutrition')) {
        return { data: { days: [] } };
      }
      return undefined;
    });

    renderPage(
      <Routes>
        <Route path="/meal-plans/:id" element={<MealPlanDetail />} />
      </Routes>,
      { route: '/meal-plans/41' }
    );

    // Chờ trang tải xong
    expect(await screen.findByRole('button', { name: /Hủy thực đơn/i })).toBeInTheDocument();

    // 1. Kiểm tra sự hiện diện của nút "Hủy thực đơn"
    const cancelBtn = screen.getByRole('button', { name: /Hủy thực đơn/i });
    expect(cancelBtn).toBeInTheDocument();

    // 2. Bấm vào nút Hủy thực đơn
    await user.click(cancelBtn);

    // 3. Modal xác nhận hủy mở ra
    expect(await screen.findByRole('dialog', { name: /Hủy thực đơn này\?/i })).toBeInTheDocument();

    // 4. Kiểm tra cảnh báo quan trọng: KHÔNG hoàn lại Quota tuần
    expect(screen.getByText(/Lưu ý quan trọng về hạn mức:/i)).toBeInTheDocument();
    expect(screen.getByText(/KHÔNG được hoàn lại/i)).toBeInTheDocument();

    // 5. Kiểm tra nút hành động trong modal
    expect(screen.getByRole('button', { name: /Giữ lại thực đơn/i })).toBeInTheDocument();
    const confirmCancelBtn = screen.getByRole('button', { name: /Xác nhận hủy thực đơn/i });
    expect(confirmCancelBtn).toBeInTheDocument();

    // 6. Bấm "Xác nhận hủy thực đơn"
    await user.click(confirmCancelBtn);

    // 7. Chờ API xử lý xong: modal đóng lại, trạng thái chuyển sang "Đã hủy"
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Hủy thực đơn này\?/i })).not.toBeInTheDocument();
    });

    // Trạng thái thực đơn hiển thị huy hiệu "Đã hủy" (xuất hiện cả ở badge và thông báo)
    const cancelledTexts = await screen.findAllByText('Đã hủy');
    expect(cancelledTexts.length).toBeGreaterThanOrEqual(1);

    // Khối thông báo thực đơn đã bị hủy xuất hiện
    expect(screen.getByText(/Thực đơn này đã bị hủy/i)).toBeInTheDocument();

    // Nút "Hủy thực đơn" không còn hiển thị
    expect(screen.queryByRole('button', { name: /Hủy thực đơn/i })).not.toBeInTheDocument();
  });
});
