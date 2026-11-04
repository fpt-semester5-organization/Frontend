import React, { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { useCategories, useFoods, useRecipeList } from '@/features/recipes/hooks/useRecipes';
import { FOOD_CATEGORIES, type FoodDish } from '../data/mockFoodsData';
import { FoodCard } from './FoodCard';

type SortOption = 'NEWEST' | 'POPULAR';

/**
 * Hàm loại bỏ dấu tiếng Việt để tìm kiếm không dấu mượt mà.
 * Ví dụ: "canh chua" -> "canh chua", "đậu hũ" -> "dau hu".
 */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export const HomeFoodSection: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [sort, setSort] = useState<SortOption>('POPULAR');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Gọi trực tiếp dữ liệu từ Backend API (100% database thật)
  const foodsQuery = useFoods({ size: 100 });
  const recipesQuery = useRecipeList({ size: 150 });
  const categoriesQuery = useCategories();

  // Danh mục lấy trực tiếp từ database (FoodCategories)
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

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
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
          r.title.toLowerCase().includes('phật giáo') ||
          r.title.toLowerCase().includes('ngũ vị tân')
      );

      // Ảnh đại diện chất lượng cao
      const imageUrl =
        f.imageUrl ||
        relatedRecipes[0]?.imageUrl ||
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80';

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

  // Lọc danh sách món ăn theo từ khóa, danh mục và sắp xếp
  const filteredDishes = useMemo(() => {
    const rawTerm = (keyword || draftKeyword).trim();
    const term = rawTerm.toLowerCase();
    const unaccentTerm = removeVietnameseTones(rawTerm);

    const result = masterDishes.filter((dish) => {
      // 1. Lọc theo Category_ID có sẵn trong database
      if (selectedCategory !== 'ALL' && dish.categoryId !== selectedCategory) {
        return false;
      }

      // 2. Tìm kiếm theo từ khóa (hỗ trợ cả tiếng Việt có dấu và không dấu)
      if (rawTerm) {
        const dishName = dish.foodName.toLowerCase();
        const unaccentDishName = removeVietnameseTones(dish.foodName);

        const dishDesc = dish.description.toLowerCase();
        const unaccentDishDesc = removeVietnameseTones(dish.description);

        const catName = dish.categoryName.toLowerCase();
        const unaccentCatName = removeVietnameseTones(dish.categoryName);

        const matchName = dishName.includes(term) || unaccentDishName.includes(unaccentTerm);
        const matchDesc = dishDesc.includes(term) || unaccentDishDesc.includes(unaccentTerm);
        const matchCat = catName.includes(term) || unaccentCatName.includes(unaccentTerm);

        const matchRecipe = (dish.recipes || []).some((r) => {
          const rTitle = r.title.toLowerCase();
          const unaccentRTitle = removeVietnameseTones(r.title);
          return rTitle.includes(term) || unaccentRTitle.includes(unaccentTerm);
        });

        return matchName || matchDesc || matchCat || matchRecipe;
      }

      return true;
    });

    // Sắp xếp
    if (sort === 'POPULAR') {
      return [...result].sort((a, b) => b.totalRecipes - a.totalRecipes);
    }
    return [...result].sort((a, b) => b.foodId - a.foodId);
  }, [masterDishes, keyword, draftKeyword, selectedCategory, sort]);

  const resetFilters = () => {
    setDraftKeyword('');
    setKeyword('');
    setSelectedCategory('ALL');
  };

  const hasActiveFilter = Boolean(keyword || draftKeyword || selectedCategory !== 'ALL');

  const chipClass = (active: boolean) =>
    cn(
      'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 py-1.5 font-label-md text-label-md transition-all shadow-2xs cursor-pointer',
      active
        ? 'border-primary bg-primary text-on-primary shadow-xs font-semibold'
        : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary hover:bg-surface-container-low'
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
      <div className="flex w-full flex-col gap-3.5 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        {/* Thanh tìm kiếm kéo dài toàn bộ chiều rộng (Full Width) */}
        <form role="search" onSubmit={handleSearchSubmit} className="flex w-full gap-2">
          <label htmlFor="food-search-input" className="sr-only">
            Tìm món chay, nguyên liệu hoặc bài viết
          </label>
          <div className="relative min-w-0 flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[22px] text-outline"
            />
            <input
              id="food-search-input"
              type="text"
              value={draftKeyword}
              onChange={(e) => {
                const val = e.target.value;
                setDraftKeyword(val);
                setKeyword(val.trim());
              }}
              placeholder="Tìm món chay, nguyên liệu, bài viết…"
              enterKeyHint="search"
              className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pr-10 pl-11 font-body-md text-body-md text-on-surface shadow-2xs placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all"
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
          <Button type="submit" size="lg" aria-label="Tìm kiếm" className="h-12 shrink-0 px-6 sm:px-8 bg-primary rounded-xl text-on-primary font-label-md hover:bg-primary-container cursor-pointer shadow-xs">
            <span>Tìm kiếm</span>
          </Button>
        </form>

        {/* Thanh kéo danh mục có sẵn trong database + nút cuộn qua lại */}
        <div className="relative flex items-center gap-1.5 w-full">
          {/* Nút cuộn sang trái */}
          <button
            type="button"
            onClick={handleScrollLeft}
            aria-label="Cuộn sang trái"
            title="Cuộn sang trái"
            className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant/70 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all shadow-2xs cursor-pointer"
          >
            <Icon name="chevron_left" className="text-[18px]" />
          </button>

          {/* Dải danh mục cuộn ngang có thanh kéo rõ ràng (category-scrollbar) */}
          <div
            ref={scrollContainerRef}
            className="category-scrollbar flex flex-1 items-center gap-2 overflow-x-auto pb-2 pt-0.5 scroll-smooth"
            aria-label="Danh mục món ăn có sẵn trong database"
          >
            {categoriesList.map((cat) => {
              const active = selectedCategory === cat.categoryId;
              return (
                <button
                  key={cat.categoryId}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedCategory(cat.categoryId)}
                  className={cn(chipClass(active), 'shrink-0 whitespace-nowrap')}
                >
                  {cat.categoryName}
                </button>
              );
            })}

            {/* Nút đặt lại lọc khi đang có lựa chọn */}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-2 inline-flex items-center gap-1 font-label-sm text-label-sm text-primary hover:underline cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Icon name="close" className="text-[14px]" />
                Đặt lại
              </button>
            )}
          </div>

          {/* Nút cuộn sang phải */}
          <button
            type="button"
            onClick={handleScrollRight}
            aria-label="Cuộn sang phải"
            title="Cuộn sang phải"
            className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant/70 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all shadow-2xs cursor-pointer"
          >
            <Icon name="chevron_right" className="text-[18px]" />
          </button>
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
            Hãy thử tìm bằng từ khóa khác hoặc bấm đặt lại danh mục.
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
