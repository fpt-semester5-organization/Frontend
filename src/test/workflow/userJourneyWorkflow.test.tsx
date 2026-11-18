import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPage } from '@/test/utils';
import { FoodCard } from '@/features/home/components/FoodCard';
import type { FoodDish } from '@/features/home/data/mockFoodsData';

describe('KIỂM THỬ LUỒNG NGHIỆP VỤ NGƯỜI DÙNG FRONTEND (WORKFLOW TESTING)', () => {
  it('Workflow: Người dùng duyệt món ăn -> Hiển thị danh mục & liên kết công thức đầy đủ', () => {
    const testDish: FoodDish = {
      foodId: 105,
      foodName: 'Cơm Chiên Dương Châu Chay',
      categoryId: 3,
      categoryName: 'Cơm & Xôi',
      imageUrl: '/images/com-chien.jpg',
      description: 'Cơm chiên hạt vàng ươm cùng cà rốt, bắp ngọt, đậu cô ve',
      totalRecipes: 3,
      hasHighCalorie: true,
      hasNoSpicy: true,
      hasTraditional: true,
      hasBuddhist: true,
      recipes: [],
    };

    renderPage(<FoodCard dish={testDish} />);

    // Kiểm tra thông tin hiển thị chuẩn
    expect(screen.getByRole('heading', { name: 'Cơm Chiên Dương Châu Chay' })).toBeInTheDocument();
    expect(screen.getByText('Cơm & Xôi')).toBeInTheDocument();

    // Liên kết chuyển tiếp trang công thức
    const ctaLink = screen.getByRole('link', { name: /Xem các công thức/ });
    expect(ctaLink).toHaveAttribute('href', '/recipes?food=105');
  });
});
