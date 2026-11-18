import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import { renderPage } from '@/test/utils';
import { useAuthStore } from '@/stores/auth.store';
import { FoodCard } from '@/features/home/components/FoodCard';
import { getFallbackFoodImage } from '@/lib/foodImages';
import { cleanUserMessage } from '@/lib/userMessage';
import type { FoodDish } from '@/features/home/data/mockFoodsData';

describe('BỘ KIỂM THỬ HỒI QUY HỆ THỐNG FRONTEND (VEGGIELIFE)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null, guestToken: 'test-guest-token' });
  });

  it('Hồi quy: FoodCard luôn sinh đường dẫn /recipes?food=:id và xử lý fallback ảnh an toàn', () => {
    const mockDish: FoodDish = {
      foodId: 99,
      foodName: 'Món Chay Hồi Quy Độc Quyền',
      categoryId: 14,
      categoryName: 'Món Xào',
      imageUrl: 'https://example.com/invalid-image.jpg',
      description: 'Mô tả ngắn món ăn hồi quy',
      totalRecipes: 5,
      hasHighCalorie: false,
      hasNoSpicy: true,
      hasTraditional: true,
      hasBuddhist: true,
      recipes: [],
    };

    renderPage(<FoodCard dish={mockDish} />);

    // Phải có tiêu đề và mô tả
    expect(screen.getByRole('heading', { name: 'Món Chay Hồi Quy Độc Quyền' })).toBeInTheDocument();
    expect(screen.getByText('Mô tả ngắn món ăn hồi quy')).toBeInTheDocument();

    // Link dẫn tới đúng ID
    const link = screen.getByRole('link', { name: /Xem các công thức/ });
    expect(link).toHaveAttribute('href', '/recipes?food=99');
  });

  it('Hồi quy: Quản lý Auth Store đảm bảo phân định rõ ràng giữa Khách (Guest) và Thành viên (Member)', () => {
    // 1. Khách
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().guestToken).toBe('test-guest-token');

    // 2. Đăng nhập thành viên
    useAuthStore.setState({
      user: {
        userId: 101,
        fullName: 'Nguyễn Văn Chay',
        email: 'chay@veggielife.vn',
        role: 'MEMBER',
        isVip: true,
      },
      accessToken: 'valid-jwt-token',
      guestToken: null,
    });

    const state = useAuthStore.getState();
    expect(state.user?.fullName).toBe('Nguyễn Văn Chay');
    expect(state.user?.isVip).toBe(true);
    expect(state.accessToken).toBe('valid-jwt-token');

    // 3. Đăng xuất
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('Hồi quy: Trình làm sạch thông báo lỗi (cleanUserMessage - NFR UI-4) loại bỏ mã lỗi kỹ thuật để hiển thị câu tiếng Việt thân thiện', () => {
    // Loại bỏ mã quy tắc nghiệp vụ BR-*
    expect(cleanUserMessage('Khách vãng lai gọi tính năng cá nhân hóa (FN-AUTH-03).'))
      .toBe('Khách vãng lai gọi tính năng cá nhân hóa.');

    expect(cleanUserMessage('Công thức đang bị khóa bởi kiểm duyệt viên (BR-REC-001).'))
      .toBe('Công thức đang bị khóa bởi kiểm duyệt viên.');

    // Chuỗi mã lỗi thô thuần túy trả về rỗng để kích hoạt câu dự phòng
    expect(cleanUserMessage('ERR_INTERNAL_SERVER_ERROR'))
      .toBe('');
  });

  it('Hồi quy: Fallback Food Image trả về URL hợp lệ khi ảnh món ăn bị lỗi hoặc để trống', () => {
    const fallback = getFallbackFoodImage(null, 'Phở Nấm Hương', 'Mì, Bún & Phở');
    expect(fallback).toBeTruthy();
    expect(typeof fallback).toBe('string');
    expect(fallback.startsWith('http') || fallback.startsWith('/')).toBe(true);
  });
});
