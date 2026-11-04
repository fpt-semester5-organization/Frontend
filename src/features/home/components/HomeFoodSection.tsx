import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useCategories, useFoods, useRecipeList } from '@/features/recipes/hooks/useRecipes';
import { MOCK_FOOD_DISHES, type FoodDish } from '../data/mockFoodsData';
import { FoodCard } from './FoodCard';

type SortOption = 'NEWEST' | 'POPULAR';
type SpecialFilter = 'ALL' | 'HIGH_CALORIE' | 'NO_SPICY' | 'BUDDHIST';

const DEFAULT_FOOD_IMAGES: Record<string, string> = {
  'Bún bò Huế chay': 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=85',
  'Phở chay Hà Nội': 'https://images.unsplash.com/photo-1576097449798-7c7f90e1248a?auto=format&fit=crop&w=800&q=85',
  'Bún riêu cua chay': 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=85',
  'Cơm tấm sườn bì chả chay': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=85',
  'Đậu hũ kho nấm rơm': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=85',
  'Lẩu nấm dưỡng sinh thảo mộc': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=85',
  'Canh nấm đậu phụ cà chua': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=85',
  'Canh chua nấm rau cải': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=85',
  'Nấm rơm xào đậu hũ': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=85',
  'Gỏi cuốn chay ngũ sắc': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=85',
  'Chả giò chay rong biển': 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=85',
};

export const HomeFoodSection: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [filterTag, setFilterTag] = useState<SpecialFilter>('ALL');
  const [sort, setSort] = useState<SortOption>('POPULAR');

  // Gọi trực tiếp dữ liệu từ Backend API (database thật)
  // API giới hạn tối đa 100 món/trang; số công thức và cờ lọc lấy từ API nên không phụ thuộc số công thức tải về
  const foodsQuery = useFoods({ q: keyword || draftKeyword, size: 100 });
  const recipesQuery = useRecipeList({ size: 20 });
  const categoriesQuery = useCategories();

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setKeyword(draftKeyword.trim());
  };

  const handleClearKeyword = () => {
    setDraftKeyword('');
    setKeyword('');
  };

  // Tổng hợp dữ liệu thật từ Backend database (fallback dữ liệu mock nếu chưa kết nối)
  const masterDishes: FoodDish[] = useMemo(() => {
    const backendFoods = foodsQuery.data?.items;
    const backendRecipes = recipesQuery.data?.items ?? [];
    const backendCategories = categoriesQuery.data ?? [];

    if (backendFoods && backendFoods.length > 0) {
      return backendFoods.map((f) => {
        const cat = backendCategories.find((c) => c.categoryId === f.categoryId);
        const relatedRecipes = backendRecipes.filter((r) => r.foodId === f.foodId);

        const hasHighCalorie = relatedRecipes.some(
          (r) => r.caloriesKcal >= 550 || r.title.toLowerCase().includes('gầy') || r.title.toLowerCase().includes('calo')
        );
        const hasNoSpicy = relatedRecipes.some(
          (r) => r.title.toLowerCase().includes('không cay') || r.title.toLowerCase().includes('thanh')
        );
        const hasTraditional = relatedRecipes.some(
          (r) => r.title.toLowerCase().includes('truyền thống') || r.title.toLowerCase().includes('cố đô') || r.title.toLowerCase().includes('nguyên bản')
        );
        const hasBuddhist = relatedRecipes.some(
          (r) => r.dietarySchool === 'BUDDHIST' || r.dietarySchool === 'OVO' || r.title.toLowerCase().includes('ngũ vị tân')
        );

        // Ảnh món ăn: ảnh công thức của món do API /foods trả về (ảnh sách), sau đó mới tới công thức đã tải
        const imageUrl =
          f.imageUrl ||
          relatedRecipes.find((r) => r.imageUrl)?.imageUrl ||
          DEFAULT_FOOD_IMAGES[f.foodName] ||
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=85';

        // Lấy mô tả từ công thức đầu tiên hoặc mô tả mặc định
        const description =
          `Món ${f.foodName} chay thanh đạm, thơm ngon, bổ dưỡng từ rau củ quả tươi.`;

        return {
          foodId: f.foodId,
          foodName: f.foodName,
          categoryId: f.categoryId,
          categoryName: cat?.categoryName || 'Món chay bổ dưỡng',
          imageUrl,
          description,
          totalRecipes: f.recipeCount ?? Math.max(relatedRecipes.length, 1),
          hasHighCalorie: f.hasHighCalorie ?? (relatedRecipes.length > 0 ? hasHighCalorie : true),
          hasNoSpicy: f.hasNoSpicy ?? (relatedRecipes.length > 0 ? hasNoSpicy : true),
          hasTraditional: relatedRecipes.length > 0 ? hasTraditional : true,
          hasBuddhist: f.hasAlliumFree ?? (relatedRecipes.length > 0 ? hasBuddhist : false),
          recipes: relatedRecipes.map((r) => ({
            recipeId: r.recipeId,
            title: r.title,
            variantType: (r.caloriesKcal >= 550 ? 'HIGH_CALORIE' : r.title.toLowerCase().includes('không cay') ? 'NO_SPICY' : 'TRADITIONAL') as 'HIGH_CALORIE' | 'NO_SPICY' | 'TRADITIONAL' | 'BUDDHIST',
            variantLabel: r.caloriesKcal >= 550 ? 'Dành cho người gầy (Giàu calo)' : r.title.toLowerCase().includes('không cay') ? 'Không ăn cay (Thanh dịu)' : 'Chuẩn vị truyền thống',
            badgeBg: 'bg-emerald-50',
            badgeText: 'text-emerald-800',
            badgeBorder: 'border-emerald-200',
            targetAudience: 'Người ăn chay',
            highlightBenefit: r.title,
            description: `Công thức ${r.title} chuẩn vị thanh đạm, bổ dưỡng.`,
            imageUrl: r.imageUrl || imageUrl,
            caloriesKcal: r.caloriesKcal,
            cookTimeMinutes: r.cookTimeMinutes,
            servings: 2,
            difficultyLevel: 'MEDIUM',
            dietarySchool: r.dietarySchool,
            keyIngredients: [],
          })),
        };
      });
    }

    // Dự phòng khi đang tải hoặc offline
    return MOCK_FOOD_DISHES;
  }, [foodsQuery.data, recipesQuery.data, categoriesQuery.data]);

  // Lọc danh sách món ăn theo từ khóa, danh mục, nhu cầu đặc biệt và sắp xếp
  const filteredDishes = useMemo(() => {
    const term = (keyword || draftKeyword).trim().toLowerCase();
    const result = masterDishes.filter((dish) => {
      // Lọc theo nhu cầu đặc biệt
      if (filterTag === 'HIGH_CALORIE' && !dish.hasHighCalorie) {
        return false;
      }
      if (filterTag === 'NO_SPICY' && !dish.hasNoSpicy) {
        return false;
      }
      if (filterTag === 'BUDDHIST' && !dish.hasBuddhist) {
        return false;
      }
      // Tìm kiếm theo tên hoặc mô tả hoặc nguyên liệu
      if (term) {
        const matchName = dish.foodName.toLowerCase().includes(term);
        const matchDesc = dish.description.toLowerCase().includes(term);
        const matchCategory = dish.categoryName.toLowerCase().includes(term);
        return matchName || matchDesc || matchCategory;
      }
      return true;
    });

    // Sắp xếp
    if (sort === 'POPULAR') {
      return [...result].sort((a, b) => b.totalRecipes - a.totalRecipes);
    }
    return [...result].sort((a, b) => b.foodId - a.foodId);
  }, [masterDishes, keyword, draftKeyword, filterTag, sort]);

  const resetFilters = () => {
    setDraftKeyword('');
    setKeyword('');
    setFilterTag('ALL');
  };

  const hasActiveFilter = Boolean(keyword || draftKeyword || filterTag !== 'ALL');

  const chipClass = (active: boolean) =>
    cn(
      'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-label-md text-label-md transition-all shadow-xs cursor-pointer',
      active
        ? 'border-primary bg-primary text-on-primary shadow-xs font-semibold'
        : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary'
    );

  return (
    <section aria-labelledby="foods-section-title" className="flex flex-col gap-space-md">
      {/* Header tiêu đề danh sách: Đồng bộ chính xác với giao diện Web (SCR-10) */}
      <div className="flex flex-wrap items-end justify-between gap-space-sm">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex items-center gap-1.5 font-label-sm text-label-sm uppercase text-secondary">
            <Icon name="nutrition" className="text-[16px]" />
            Định lượng rõ ràng & đa dạng công thức
          </p>
          <h2 id="foods-section-title" className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg font-serif">
            {draftKeyword || keyword ? `Kết quả cho “${draftKeyword || keyword}”` : 'Món ăn nổi bật'}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant tabular-nums">
            {filteredDishes.length} món ăn từ cơ sở dữ liệu VeggieLife
          </p>
        </div>

        {/* Nút sắp xếp: Mới nhất | Phổ biến (chuẩn UI Web) */}
        <div className="flex items-center rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-1 shadow-xs" role="tablist" aria-label="Sắp xếp danh sách">
          <button
            type="button"
            role="tab"
            aria-selected={sort === 'NEWEST'}
            onClick={() => setSort('NEWEST')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-label-md text-label-md transition-all cursor-pointer',
              sort === 'NEWEST'
                ? 'bg-primary font-semibold text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            )}
          >
            <Icon name="schedule" className="text-[16px]" />
            Mới nhất
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sort === 'POPULAR'}
            onClick={() => setSort('POPULAR')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-label-md text-label-md transition-all cursor-pointer',
              sort === 'POPULAR'
                ? 'bg-primary font-semibold text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            )}
          >
            <Icon name="local_fire_department" className="text-[16px]" />
            Phổ biến
          </button>
        </div>
      </div>

      {/* Bộ lọc duy nhất và hợp nhất: Tìm kiếm kéo dài toàn bộ chiều rộng + Dải chip phân loại */}
      <div className="flex w-full flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        {/* Thanh tìm kiếm kéo dài toàn bộ chiều rộng (Full Width) */}
        <form role="search" onSubmit={handleSearchSubmit} className="flex w-full gap-2">
          <label htmlFor="food-search-input" className="sr-only">
            Tìm món chay, nguyên liệu hoặc bài viết
          </label>
          <div className="relative min-w-0 flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[22px] text-outline"
            />
            <input
              id="food-search-input"
              type="text"
              value={draftKeyword}
              onChange={(e) => {
                setDraftKeyword(e.target.value);
                setKeyword(e.target.value.trim());
              }}
              placeholder="Tìm món chay, nguyên liệu, bài viết…"
              enterKeyHint="search"
              className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pr-10 pl-10 font-body-md text-body-md text-on-surface shadow-xs placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {draftKeyword && (
              <button
                type="button"
                aria-label="Xóa từ khóa tìm kiếm"
                onClick={handleClearKeyword}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            )}
          </div>
          <Button type="submit" size="lg" aria-label="Tìm kiếm" className="h-12 shrink-0 px-6 sm:px-8 bg-primary rounded-xl text-on-primary font-label-md hover:bg-primary-container">
            <span>Tìm kiếm</span>
          </Button>
        </form>

        {/* Chỉ giữ các bộ lọc nhu cầu quan trọng; danh mục món tìm bằng ô tìm kiếm */}
        <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="Lọc theo nhu cầu">
          <button
            type="button"
            aria-pressed={filterTag === 'ALL'}
            onClick={() => setFilterTag('ALL')}
            className={chipClass(filterTag === 'ALL')}
          >
            Tất cả món
          </button>

          {/* Chip lọc nhanh theo nhu cầu dinh dưỡng & trường phái */}
          <button
            type="button"
            aria-pressed={filterTag === 'HIGH_CALORIE'}
            onClick={() => setFilterTag(filterTag === 'HIGH_CALORIE' ? 'ALL' : 'HIGH_CALORIE')}
            className={chipClass(filterTag === 'HIGH_CALORIE')}
          >
            <Icon name="fitness_center" className="text-[16px]" />
            Dành cho người gầy (Giàu calo)
          </button>

          <button
            type="button"
            aria-pressed={filterTag === 'NO_SPICY'}
            onClick={() => setFilterTag(filterTag === 'NO_SPICY' ? 'ALL' : 'NO_SPICY')}
            className={chipClass(filterTag === 'NO_SPICY')}
          >
            <Icon name="sentiment_satisfied_alt" className="text-[16px]" />
            Không ăn cay (Thanh dịu)
          </button>

          <button
            type="button"
            aria-pressed={filterTag === 'BUDDHIST'}
            onClick={() => setFilterTag(filterTag === 'BUDDHIST' ? 'ALL' : 'BUDDHIST')}
            className={chipClass(filterTag === 'BUDDHIST')}
          >
            <Icon name="spa" className="text-[16px]" />
            Kiêng ngũ vị tân
          </button>

          {/* Nút đặt lại lọc khi đang có lựa chọn */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 font-label-sm text-label-sm text-primary hover:underline cursor-pointer"
            >
              <Icon name="close" className="text-[14px]" />
              Đặt lại lọc
            </button>
          )}
        </div>
      </div>

      {/* Lưới hiển thị các thẻ món ăn (Lưới 3 cột chuẩn) */}
      {filteredDishes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest py-16 px-4 text-center">
          <Icon name="search_off" className="text-5xl text-outline mb-3" />
          <h3 className="font-title-lg text-title-lg font-bold text-on-surface">
            Không tìm thấy món ăn phù hợp
          </h3>
          <p className="mt-1 max-w-md font-body-sm text-body-sm text-on-surface-variant">
            Hãy thử tìm bằng từ khóa khác hoặc bấm đặt lại bộ lọc danh mục.
          </p>
          <Button variant="outline" onClick={resetFilters} className="mt-4">
            Xóa bộ lọc tìm kiếm
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3">
          {filteredDishes.map((dish) => (
            <FoodCard
              key={dish.foodId}
              dish={dish}
            />
          ))}
        </div>
      )}
    </section>
  );
};
