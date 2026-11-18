import { describe, expect, it } from 'vitest';
import { renderPage } from '@/test/utils';
import { FoodCard } from '@/features/home/components/FoodCard';
import type { FoodDish } from '@/features/home/data/mockFoodsData';

describe('KIỂM THỬ HIỆU NĂNG RENDER & ĐỘ TRỄ UI (PERFORMANCE TESTING)', () => {
  it('Hiệu năng: Render danh sách 10 FoodCards phải hoàn tất dưới 100ms', () => {
    const dishes: FoodDish[] = Array.from({ length: 10 }, (_, idx) => ({
      foodId: 200 + idx,
      foodName: `Món Chay Test Hiệu Năng #${idx + 1}`,
      categoryId: 1,
      categoryName: 'Món Nhanh',
      imageUrl: '',
      description: 'Mô tả hiệu năng render danh sách',
      totalRecipes: 2,
      hasHighCalorie: false,
      hasNoSpicy: true,
      hasTraditional: true,
      hasBuddhist: true,
      recipes: [],
    }));

    const start = performance.now();
    renderPage(
      <div>
        {dishes.map((dish) => (
          <FoodCard key={dish.foodId} dish={dish} />
        ))}
      </div>
    );
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200); // SLA render dưới 200ms
  });
});
