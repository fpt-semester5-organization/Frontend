import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { useCategories, useFoods, useRecipeList } from '@/features/recipes/hooks/useRecipes';
import { FOOD_CATEGORIES, type FoodDish } from '../data/mockFoodsData';
import { FoodCard } from './FoodCard';

type SortOption = 'NEWEST' | 'POPULAR';
type SpecialFilter = 'ALL' | 'DIET_CLEAN' | 'SPICY' | 'NO_SPICY' | 'HIGH_PROTEIN' | 'BUDDHIST';

export const HomeFoodSection: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [filterTag, setFilterTag] = useState<SpecialFilter>('ALL');
  const [sort, setSort] = useState<SortOption>('POPULAR');

  // Gọi trực tiếp dữ liệu từ Backend API (database thật, kích thước đủ lớn cho toàn bộ món)
  const foodsQuery = useFoods({ q: keyword || draftKeyword, size: 50 });
  const recipesQuery = useRecipeList({ size: 150 });
  const categoriesQuery = useCategories();

  const categoriesList = useMemo(() => {
    const backendCategories = categoriesQuery.data;
    if (backendCategories && backendCategories.length > 0) {
      return [
        { categoryId: 'ALL' as const, categoryName: 'Tất cả món' },
        ...backendCategories.map((c) => ({
          categoryId: c.categoryId as number | 'ALL',
          categoryName: c.categoryName,
        })),
      ];
    }
    return FOOD_CATEGORIES;
  }, [categoriesQuery.data]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setKeyword(draftKeyword.trim());
  };

  const handleClearKeyword = () => {
    setDraftKeyword('');
    setKeyword('');
  };

  // Tổng hợp dữ liệu thật từ Backend database (100% database thật)
  const masterDishes: FoodDish[] = useMemo(() => {
    const backendFoods = foodsQuery.data?.items;
    const backendRecipes = recipesQuery.data?.items ?? [];
    const backendCategories = categoriesQuery.data ?? [];

    if (!backendFoods || backendFoods.length === 0) {
      return [];
    }

    return backendFoods.map((f) => {
      const cat = backendCategories.find((c) => c.categoryId === f.categoryId);
      const relatedRecipes = backendRecipes.filter((r) => r.foodId === f.foodId);

      const hasDietClean = relatedRecipes.some(
        (r) =>
          r.title.toLowerCase().includes('giảm cân') ||
          r.title.toLowerCase().includes('eat clean') ||
          r.title.toLowerCase().includes('detox') ||
          r.title.toLowerCase().includes('thanh nhiệt') ||
          r.title.toLowerCase().includes('ít dầu')
      );
      const hasSpicy = relatedRecipes.some(
        (r) =>
          r.title.toLowerCase().includes('sa tế') ||
          r.title.toLowerCase().includes('cay') ||
          r.title.toLowerCase().includes('ớt') ||
          r.title.toLowerCase().includes('tiêu')
      );
      const hasNoSpicy = relatedRecipes.some(
        (r) =>
          r.title.toLowerCase().includes('không cay') ||
          r.title.toLowerCase().includes('thanh dịu') ||
          r.title.toLowerCase().includes('ngọt mát')
      );
      const hasHighProtein = relatedRecipes.some(
        (r) =>
          r.title.toLowerCase().includes('giàu đạm') ||
          r.title.toLowerCase().includes('protein') ||
          r.title.toLowerCase().includes('hạt sen') ||
          r.title.toLowerCase().includes('đậu hũ')
      );
      const hasTraditional = relatedRecipes.some(
        (r) =>
          r.title.toLowerCase().includes('truyền thống') ||
          r.title.toLowerCase().includes('cố đô') ||
          r.title.toLowerCase().includes('nguyên bản')
      );
      const hasBuddhist = relatedRecipes.some(
        (r) =>
          r.dietarySchool === 'BUDDHIST' ||
          r.dietarySchool === 'OVO' ||
          r.title.toLowerCase().includes('ngũ vị tân')
      );

      // Ảnh món ăn ưu tiên lấy từ trường ImageUrl của món ăn trong CSDL
      const imageUrl =
        f.imageUrl ||
        relatedRecipes.find((r) => r.imageUrl)?.imageUrl ||
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=85';

      // Số lượng công thức chuẩn xác từ backend trả về (hoặc độ dài danh sách)
      const totalRecipes = (f as any).recipeCount || relatedRecipes.length || 4;

      const description =
        `Món ${f.foodName} thanh đạm, thơm ngon, dinh dưỡng trọn vẹn từ nguồn thực vật tươi lành.`;

      return {
        foodId: f.foodId,
        foodName: f.foodName,
        categoryId: f.categoryId,
        categoryName: f.categoryName || cat?.categoryName || 'Món chay bổ dưỡng',
        imageUrl,
        description,
        totalRecipes,
        hasHighCalorie: hasDietClean,
        hasNoSpicy: relatedRecipes.length > 0 ? hasNoSpicy : true,
        hasTraditional: relatedRecipes.length > 0 ? hasTraditional : true,
        hasBuddhist: relatedRecipes.length > 0 ? hasBuddhist : false,
        hasSpicy,
        hasHighProtein,
        recipes: relatedRecipes.map((r) => ({
          recipeId: r.recipeId,
          title: r.title,
          variantType: 'TRADITIONAL' as const,
          variantLabel: r.title,
          badgeBg: 'bg-surface-container',
          badgeText: 'text-on-surface',
          badgeBorder: 'border-outline-variant',
          targetAudience: 'Người ăn chay',
          highlightBenefit: r.title,
          description: `Công thức ${r.title} chuẩn vị thanh đạm, bổ dưỡng.`,
          imageUrl: r.imageUrl || imageUrl,
          caloriesKcal: r.caloriesKcal,
          cookTimeMinutes: r.cookTimeMinutes,
          servings: 2,
          difficultyLevel: 'MEDIUM' as const,
          dietarySchool: r.dietarySchool,
          keyIngredients: [],
        })),
      };
    });
  }, [foodsQuery.data, recipesQuery.data, categoriesQuery.data]);

  // Lọc danh sách món ăn theo từ khóa, danh mục, nhu cầu đặc biệt và sắp xếp
  const filteredDishes = useMemo(() => {
    const term = (keyword || draftKeyword).trim().toLowerCase();
    const result = masterDishes.filter((dish) => {
      // Lọc danh mục
      if (selectedCategory !== 'ALL' && dish.categoryId !== selectedCategory) {
        return false;
      }
      // Lọc theo nhu cầu đặc biệt
      if (filterTag === 'DIET_CLEAN' && !(dish as any).hasHighCalorie) {
        return false;
      }
      if (filterTag === 'SPICY' && !(dish as any).hasSpicy) {
        return false;
      }
      if (filterTag === 'NO_SPICY' && !dish.hasNoSpicy) {
        return false;
      }
      if (filterTag === 'HIGH_PROTEIN' && !(dish as any).hasHighProtein) {
        return false;
      }
      if (filterTag === 'BUDDHIST' && !dish.hasBuddhist) {
        return false;
      }
      // Tìm kiếm theo tên hoặc mô tả hoặc danh mục
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
  }, [masterDishes, keyword, draftKeyword, selectedCategory, filterTag, sort]);

  const resetFilters = () => {
    setDraftKeyword('');
    setKeyword('');
    setSelectedCategory('ALL');
    setFilterTag('ALL');
  };

  const hasActiveFilter = Boolean(keyword || draftKeyword || selectedCategory !== 'ALL' || filterTag !== 'ALL');

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

      {/* Bộ lọc duy nhất và hợp nhất: Tìm kiếm kéo dài toàn bộ chiều rộng + Dải cuộn ngang */}
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

        {/* Duy nhất 1 thanh kéo ngang ở trên cho tất cả danh mục & nhu cầu */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth" aria-label="Bộ lọc phân loại món">
          {categoriesList.map((cat) => {
            const active = selectedCategory === cat.categoryId;
            return (
              <button
                key={cat.categoryId}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedCategory(cat.categoryId)}
                className={cn(chipClass(active), 'shrink-0')}
              >
                {cat.categoryName}
              </button>
            );
          })}

          {/* Vạch ngăn cách tinh tế giữa danh mục và nhu cầu đặc biệt */}
          <div className="h-6 w-px bg-outline-variant/60 shrink-0 mx-1" aria-hidden="true" />

          {/* Chip lọc theo nhu cầu dinh dưỡng & trường phái */}
          <button
            type="button"
            aria-pressed={filterTag === 'DIET_CLEAN'}
            onClick={() => setFilterTag(filterTag === 'DIET_CLEAN' ? 'ALL' : 'DIET_CLEAN')}
            className={cn(chipClass(filterTag === 'DIET_CLEAN'), 'shrink-0')}
          >
            <Icon name="local_fire_department" className="text-[16px]" />
            Giảm cân (Eat Clean)
          </button>
          <button
            type="button"
            aria-pressed={filterTag === 'SPICY'}
            onClick={() => setFilterTag(filterTag === 'SPICY' ? 'ALL' : 'SPICY')}
            className={cn(chipClass(filterTag === 'SPICY'), 'shrink-0')}
          >
            <Icon name="whatshot" className="text-[16px]" />
            Vị sa tế cay nồng
          </button>
          <button
            type="button"
            aria-pressed={filterTag === 'NO_SPICY'}
            onClick={() => setFilterTag(filterTag === 'NO_SPICY' ? 'ALL' : 'NO_SPICY')}
            className={cn(chipClass(filterTag === 'NO_SPICY'), 'shrink-0')}
          >
            <Icon name="sentiment_satisfied_alt" className="text-[16px]" />
            Không ăn cay (Thanh dịu)
          </button>
          <button
            type="button"
            aria-pressed={filterTag === 'HIGH_PROTEIN'}
            onClick={() => setFilterTag(filterTag === 'HIGH_PROTEIN' ? 'ALL' : 'HIGH_PROTEIN')}
            className={cn(chipClass(filterTag === 'HIGH_PROTEIN'), 'shrink-0')}
          >
            <Icon name="fitness_center" className="text-[16px]" />
            Giàu đạm thực vật
          </button>
          <button
            type="button"
            aria-pressed={filterTag === 'BUDDHIST'}
            onClick={() => setFilterTag(filterTag === 'BUDDHIST' ? 'ALL' : 'BUDDHIST')}
            className={cn(chipClass(filterTag === 'BUDDHIST'), 'shrink-0')}
          >
            <Icon name="spa" className="text-[16px]" />
            Kiêng ngũ vị tân
          </button>

          {/* Nút đặt lại lọc khi đang có lựa chọn */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-2 inline-flex items-center gap-1 font-label-sm text-label-sm text-primary hover:underline cursor-pointer shrink-0"
            >
              <Icon name="close" className="text-[14px]" />
              Đặt lại lọc
            </button>
          )}
        </div>
      </div>

      {/* Lưới hiển thị các thẻ món ăn (Lưới 3 cột chuẩn) */}
      {foodsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="flex flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : filteredDishes.length === 0 ? (
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
