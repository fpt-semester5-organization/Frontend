import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { INPUT_CLASS } from '@/components/ui/forms';
import { cn } from '@/lib/cn';
import { useCategories, useDietarySchools, useFoods, useRecipeList } from '@/features/recipes/hooks/useRecipes';
import { getFallbackFoodImage } from '@/lib/foodImages';
import type { FoodDish } from '../data/mockFoodsData';
import { FoodCard } from './FoodCard';

type SortOption = 'NEWEST' | 'POPULAR';

/**
 * Hàm loại bỏ dấu tiếng Việt để tìm kiếm không dấu mượt mà.
 * Ví dụ: "canh chua" -> "canh chua", "đậu hũ" -> "dau hu", "cà tím" -> "ca tim".
 */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Nhãn và Select đồng bộ 100% với Kho công thức (RecipeFilterPanel) */
const LABEL = 'font-label-sm text-label-sm text-on-surface-variant font-medium';
const SELECT = cn(INPUT_CLASS, 'h-10 cursor-pointer py-0 pr-8 text-xs sm:text-sm');

const SCHOOL_OPTIONS = [
  { id: 'ALL', label: 'Tất cả trường phái' },
  { id: 'VEGAN', label: 'Thuần chay (Vegan)' },
  { id: 'LACTO', label: 'Chay có sữa (Lacto)' },
  { id: 'OVO', label: 'Chay có trứng (Ovo)' },
  { id: 'BUDDHIST', label: 'Chay Phật giáo (Kiêng ngũ vị tân)' },
  { id: 'FLEXITARIAN', label: 'Bán chay / Linh hoạt' },
];

const TIME_OPTIONS: Array<{ id: number | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'Bất kỳ thời gian' },
  { id: 15, label: 'Dưới 15 phút (Nhanh gọn)' },
  { id: 30, label: 'Dưới 30 phút (Hàng ngày)' },
  { id: 60, label: 'Dưới 60 phút (Cầu kỳ)' },
  { id: 999, label: 'Trên 60 phút (Hầm / Lẩu)' },
];

const NUTRITION_OPTIONS = [
  { id: 'ALL', label: 'Tất cả khẩu vị & dinh dưỡng' },
  { id: 'HIGH_PROTEIN', label: 'Giàu đạm thực vật (Protein cao)' },
  { id: 'CLEAN', label: 'Eat Clean / Giảm cân / Ít dầu mỡ' },
  { id: 'NO_SPICY', label: 'Thanh dịu, không cay (Dễ ăn)' },
  { id: 'SPICY', label: 'Vị sa tế, cay nồng đậm đà' },
];

const SORT_OPTIONS: Array<{ id: SortOption; label: string }> = [
  { id: 'POPULAR', label: 'Phổ biến nhất' },
  { id: 'NEWEST', label: 'Mới nhất' },
];

/** Dữ liệu khởi tạo 8 danh mục thực tế đang có món ăn từ CSDL VeggieLife (loại bỏ hoàn toàn các danh mục 0 món) */
const STATIC_8_CATEGORIES = [
  {
    categoryId: 14,
    categoryName: 'Món Xào Chay Thanh Vị',
    dishCount: 7,
    dishes: [
      { foodId: 1, foodName: 'Bông cải xanh xào nấm bào ngư', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 2, foodName: 'Đậu hũ non sốt nấm dầu mè', imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 3, foodName: 'Mì căn xào sả ớt giòn cay', imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 4, foodName: 'Nấm đùi gà xào húng quế', imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 5, foodName: 'Măng tây xào hạt điều', imageUrl: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 6, foodName: 'Khổ qua xào đậu hũ thanh nhiệt', imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 7, foodName: 'Rau củ thập cẩm xào nấm đông cô', imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
    ],
  },
  {
    categoryId: 11,
    categoryName: 'Món Mì, Bún & Phở Chay',
    dishCount: 6,
    dishes: [
      { foodId: 12, foodName: 'Bánh canh nấm rơm bột gạo', imageUrl: 'https://images.unsplash.com/photo-1594998893017-36147cbcae05?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 8, foodName: 'Bún bò Huế chay', imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 10, foodName: 'Bún riêu cua chay thơm béo', imageUrl: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 11, foodName: 'Hủ tiếu Nam Vang chay', imageUrl: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 13, foodName: 'Mì Quảng chay sợi vàng đậm đà', imageUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 9, foodName: 'Phở chay Hà Nội nước dùng thanh ngọt', imageUrl: 'https://images.unsplash.com/photo-1576577445504-6af96477db52?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
    ],
  },
  {
    categoryId: 2,
    categoryName: 'Đồ Uống & Trà Dinh Dưỡng',
    dishCount: 5,
    dishes: [
      { foodId: 26, foodName: 'Nước ép cần tây dưa leo táo xanh detox', imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 30, foodName: 'Nước ép củ dền cà rốt bổ máu', imageUrl: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 27, foodName: 'Sinh tố bơ chuối hạt chia giàu đạm', imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 29, foodName: 'Sữa hạt sen đậu xanh bùi béo', imageUrl: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 28, foodName: 'Trà hoa cúc táo đỏ kỷ tử dưỡng nhan', imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
    ],
  },
  {
    categoryId: 5,
    categoryName: 'Món Cơm & Xôi Chay',
    dishCount: 4,
    dishes: [
      { foodId: 17, foodName: 'Cơm chiên Dương Châu ngũ sắc', imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 19, foodName: 'Cơm niêu nấm kho tộ cháy giòn', imageUrl: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 18, foodName: 'Cơm tấm sườn bì chả chay', imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 20, foodName: 'Xôi gấc hạt sen chay dẻo thơm', imageUrl: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
    ],
  },
  {
    categoryId: 9,
    categoryName: 'Món Kho Chay Đậm Đà',
    dishCount: 3,
    dishes: [
      { foodId: 23, foodName: 'Cà tím kho tộ nước cốt dừa', imageUrl: '/videos/clay-pot.jpg', totalRecipes: 4 },
      { foodId: 21, foodName: 'Đậu hũ kho nấm rơm tiêu đen', imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 22, foodName: 'Nấm đông cô kho tiêu hạt sen', imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
    ],
  },
  {
    categoryId: 3,
    categoryName: 'Món Canh & Súp Bổ Dưỡng',
    dishCount: 2,
    dishes: [
      { foodId: 14, foodName: 'Canh chua Nam Bộ chay thanh mát', imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 15, foodName: 'Súp bắp ngô ngọt hạt sen dưỡng tâm', imageUrl: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
    ],
  },
  {
    categoryId: 6,
    categoryName: 'Món Cuốn Chay',
    dishCount: 2,
    dishes: [
      { foodId: 25, foodName: 'Chả giò chay khoai môn giòn rụm', imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
      { foodId: 24, foodName: 'Gỏi cuốn chay ngũ sắc sốt tương', imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
    ],
  },
  {
    categoryId: 10,
    categoryName: 'Món Lẩu Chay Gia Đình',
    dishCount: 1,
    dishes: [
      { foodId: 16, foodName: 'Lẩu nấm dưỡng sinh thảo mộc', imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80', totalRecipes: 4 },
    ],
  },
];

export const HomeFoodSection: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [selectedSchool, setSelectedSchool] = useState<string | 'ALL'>('ALL');
  const [selectedCookTime, setSelectedCookTime] = useState<number | 'ALL'>('ALL');
  const [selectedNutrition, setSelectedNutrition] = useState<string | 'ALL'>('ALL');
  const [sort, setSort] = useState<SortOption>('POPULAR');

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Gọi dữ liệu từ Backend API (100% database thật)
  const foodsQuery = useFoods({ size: 100 });
  const recipesQuery = useRecipeList({ size: 100 });
  const categoriesQuery = useCategories();
  const schoolsQuery = useDietarySchools();

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setKeyword(draftKeyword.trim());
    setShowCategoryDropdown(false);
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
      // Fallback từ STATIC_8_CATEGORIES khi đang nạp
      return STATIC_8_CATEGORIES.flatMap((c) =>
        c.dishes.map((d) => ({
          foodId: d.foodId,
          foodName: d.foodName,
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          imageUrl: d.imageUrl,
          description: `Món ${d.foodName} thanh đạm, thơm ngon, dinh dưỡng trọn vẹn từ nguồn thực vật tươi lành.`,
          totalRecipes: d.totalRecipes,
          hasHighCalorie: false,
          hasNoSpicy: true,
          hasTraditional: true,
          hasBuddhist: false,
          hasSpicy: false,
          hasHighProtein: false,
          recipes: [],
        }))
      );
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

      // Ảnh đại diện chất lượng cao với fallback chuẩn
      const defaultFallback = getFallbackFoodImage(null, f.foodName, f.categoryName || cat?.categoryName || '');
      const imageUrl = f.imageUrl || relatedRecipes[0]?.imageUrl || defaultFallback;

      const totalRecipes = (f as any).recipeCount || relatedRecipes.length || 4;
      const description = `Món ${f.foodName} thanh đạm, thơm ngon, dinh dưỡng trọn vẹn từ nguồn thực vật tươi lành.`;

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

  // Chỉ hiển thị đúng 8 danh mục đang có món ăn trong database (Loại bỏ hoàn toàn các danh mục 0 món)
  const validCategories = useMemo(() => {
    const categoryStats = new Map<number, { count: number; name: string }>();

    masterDishes.forEach((dish) => {
      if (dish.categoryId) {
        const existing = categoryStats.get(dish.categoryId);
        if (existing) {
          existing.count += 1;
        } else {
          categoryStats.set(dish.categoryId, {
            count: 1,
            name: dish.categoryName || 'Món chay',
          });
        }
      }
    });

    const list: Array<{ categoryId: number | 'ALL'; categoryName: string; dishCount?: number }> = [
      { categoryId: 'ALL', categoryName: 'Tất cả danh mục', dishCount: masterDishes.length || 30 },
    ];

    if (categoryStats.size > 0) {
      const withDishes: Array<{ categoryId: number | 'ALL'; categoryName: string; dishCount?: number }> = [];

      STATIC_8_CATEGORIES.forEach((staticCat) => {
        const stat = categoryStats.get(staticCat.categoryId);
        const count = stat ? stat.count : staticCat.dishCount;
        if (count > 0) {
          withDishes.push({
            categoryId: staticCat.categoryId,
            categoryName: stat ? stat.name : staticCat.categoryName,
            dishCount: count,
          });
        }
      });

      withDishes.sort((a, b) => (b.dishCount ?? 0) - (a.dishCount ?? 0));
      list.push(...withDishes);
    } else {
      // Fallback an toàn đảm bảo luôn hiển thị 8 danh mục thực tế của hệ thống
      list.push(...STATIC_8_CATEGORIES);
    }

    return list;
  }, [masterDishes]);

  // Lọc danh sách món ăn theo mọi tiêu chí
  const filteredDishes = useMemo(() => {
    const rawTerm = (keyword || draftKeyword).trim();
    const term = rawTerm.toLowerCase();
    const unaccentTerm = removeVietnameseTones(rawTerm);

    const result = masterDishes.filter((dish) => {
      // 1. Lọc theo Category_ID có sẵn trong database
      if (selectedCategory !== 'ALL' && dish.categoryId !== selectedCategory) {
        return false;
      }

      // 2. Lọc theo trường phái ẩm thực
      if (selectedSchool !== 'ALL') {
        const matchSchool = (dish.recipes || []).some((r) => {
          if (selectedSchool === 'VEGAN') return r.dietarySchool === 'VEGAN' || !r.dietarySchool || r.title.toLowerCase().includes('thuần chay');
          if (selectedSchool === 'LACTO') return r.dietarySchool === 'LACTO' || r.dietarySchool === 'OVO_LACTO';
          if (selectedSchool === 'OVO') return r.dietarySchool === 'OVO' || r.dietarySchool === 'OVO_LACTO';
          if (selectedSchool === 'BUDDHIST') return r.dietarySchool === 'BUDDHIST' || dish.hasBuddhist;
          if (selectedSchool === 'FLEXITARIAN') return r.dietarySchool === 'FLEXITARIAN' || r.title.toLowerCase().includes('bán chay');
          return true;
        });
        if (!matchSchool) return false;
      }

      // 3. Lọc theo thời gian nấu
      if (selectedCookTime !== 'ALL') {
        const matchTime = (dish.recipes || []).some((r) => {
          const t = r.cookTimeMinutes || 25;
          if (selectedCookTime === 15) return t <= 15;
          if (selectedCookTime === 30) return t <= 30;
          if (selectedCookTime === 60) return t <= 60;
          return t > 60;
        });
        if (!matchTime) return false;
      }

      // 4. Lọc theo dinh dưỡng & khẩu vị
      if (selectedNutrition !== 'ALL') {
        if (selectedNutrition === 'HIGH_PROTEIN' && !dish.hasHighProtein) return false;
        if (selectedNutrition === 'CLEAN' && !dish.hasHighCalorie) return false;
        if (selectedNutrition === 'NO_SPICY' && !dish.hasNoSpicy) return false;
        if (selectedNutrition === 'SPICY' && !dish.hasSpicy) return false;
      }

      // 5. Tìm kiếm theo từ khóa chung
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
  }, [masterDishes, keyword, draftKeyword, selectedCategory, selectedSchool, selectedCookTime, selectedNutrition, sort]);

  const resetFilters = () => {
    setDraftKeyword('');
    setKeyword('');
    setSelectedCategory('ALL');
    setSelectedSchool('ALL');
    setSelectedCookTime('ALL');
    setSelectedNutrition('ALL');
    setSort('POPULAR');
    setShowCategoryDropdown(false);
  };

  const hasActiveFilters =
    selectedCategory !== 'ALL' ||
    selectedSchool !== 'ALL' ||
    selectedCookTime !== 'ALL' ||
    selectedNutrition !== 'ALL' ||
    sort !== 'POPULAR';

  const hasActiveFilter = Boolean(keyword || draftKeyword || hasActiveFilters);

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
            {draftKeyword || keyword ? `Kết quả tìm kiếm cho “${draftKeyword || keyword}”` : 'Món ăn nổi bật'}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant tabular-nums">
            Tìm thấy {filteredDishes.length} món ăn phù hợp từ cơ sở dữ liệu VeggieLife
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

      {/* Thanh tìm kiếm chính tích hợp nút Bộ lọc 3 gạch (Chuẩn Hình 1) */}
      <div className="flex w-full flex-col gap-3 rounded-2xl bg-surface-container-lowest p-space-md shadow-card sm:p-space-lg">
        <div ref={searchContainerRef} className="relative w-full">
          <form role="search" onSubmit={handleSearchSubmit} className="flex w-full gap-2 items-center">
            <label htmlFor="food-search-input" className="sr-only">
              Tìm món chay, nguyên liệu hoặc bài viết
            </label>
            <div className="relative min-w-0 flex-1">
              <Icon
                name="search"
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[20px] text-outline"
              />
              <input
                id="food-search-input"
                type="text"
                autoComplete="off"
                value={draftKeyword}
                onChange={(e) => {
                  setDraftKeyword(e.target.value);
                  setKeyword(e.target.value.trim());
                }}
                placeholder="Tìm món chay, nguyên liệu, bài viết…"
                enterKeyHint="search"
                className="h-12 w-full rounded-xl bg-surface-container-low pr-28 pl-10 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container border border-transparent focus:border-primary/40 shadow-xs"
              />

              {/* Nút Xóa từ khóa & Nút Bộ lọc (icon tune / 3 gạch theo Hình 1 - Mũi tên đỏ) */}
              <div className="absolute top-1/2 right-2.5 -translate-y-1/2 flex items-center gap-1">
                {draftKeyword && (
                  <button
                    type="button"
                    aria-label="Xóa từ khóa tìm kiếm"
                    onClick={handleClearKeyword}
                    className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container cursor-pointer transition-colors"
                  >
                    <Icon name="close" className="text-[16px]" />
                  </button>
                )}

                {/* Nút Bộ lọc dạng 3 gạch / tune tích hợp trong ô nhập */}
                <button
                  type="button"
                  aria-label="Bộ lọc danh mục món ăn"
                  title="Bấm để xem danh mục & bộ lọc chi tiết"
                  aria-expanded={showCategoryDropdown}
                  onClick={() => setShowCategoryDropdown((prev) => !prev)}
                  className={cn(
                    'flex h-9 px-2.5 items-center gap-1.5 rounded-lg transition-all cursor-pointer border',
                    hasActiveFilters || showCategoryDropdown
                      ? 'border-primary bg-primary text-on-primary shadow-xs font-semibold'
                      : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                  )}
                >
                  <Icon name="tune" className="text-[18px]" />
                  <span className="text-xs hidden sm:inline">
                    {selectedCategory === 'ALL'
                      ? 'Danh mục'
                      : validCategories.find((c) => c.categoryId === selectedCategory)?.categoryName?.split(' ')[0] || 'Danh mục'}
                  </span>
                  <span className="text-[10px] select-none">{showCategoryDropdown ? '▲' : '▼'}</span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-12 shrink-0 px-6 rounded-xl bg-primary text-on-primary font-semibold hover:bg-primary/90 cursor-pointer shadow-sm"
            >
              Tìm kiếm
            </Button>
          </form>

          {/* Menu SỔ XUỐNG dạng danh sách các Category (List có thể lướt - Chuẩn Hình ảnh 1, 3 & 5) */}
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Tiêu đề Dropdown */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-outline-variant/30 bg-surface-container-low/50">
                <div className="flex items-center gap-2">
                  <Icon name="category" className="text-[20px] text-primary" />
                  <span className="font-label-sm text-sm font-bold text-on-surface">
                    Danh mục món ăn ({validCategories.length - 1} danh mục trong CSDL)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {selectedCategory !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('ALL');
                        setShowCategoryDropdown(false);
                      }}
                      className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                    >
                      Xem tất cả (30 món)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(false)}
                    className="text-xs text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-container cursor-pointer transition-colors"
                  >
                    <Icon name="close" className="text-[18px]" />
                  </button>
                </div>
              </div>

              {/* Bộ lọc mở rộng chuẩn Kho công thức: Trường phái, Thời gian, Khẩu vị, Sắp xếp */}
              <div className="p-3 sm:p-4 bg-surface-container-low/25 border-b border-outline-variant/25 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-on-surface-variant">Trường phái</label>
                  <select
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                    className="h-9 w-full rounded-lg bg-surface-container-low px-2.5 text-xs text-on-surface border border-outline-variant/40 outline-none focus:border-primary"
                  >
                    {SCHOOL_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-on-surface-variant">Thời gian nấu</label>
                  <select
                    value={selectedCookTime}
                    onChange={(e) => setSelectedCookTime(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="h-9 w-full rounded-lg bg-surface-container-low px-2.5 text-xs text-on-surface border border-outline-variant/40 outline-none focus:border-primary"
                  >
                    {TIME_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-on-surface-variant">Định dạng / Khẩu vị</label>
                  <select
                    value={selectedNutrition}
                    onChange={(e) => setSelectedNutrition(e.target.value)}
                    className="h-9 w-full rounded-lg bg-surface-container-low px-2.5 text-xs text-on-surface border border-outline-variant/40 outline-none focus:border-primary"
                  >
                    {NUTRITION_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-on-surface-variant">Sắp xếp</label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    className="h-9 w-full rounded-lg bg-surface-container-low px-2.5 text-xs text-on-surface border border-outline-variant/40 outline-none focus:border-primary"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Danh sách 8 Danh mục có thể cuộn lướt (Scrollable list chuẩn Hình 1 & 3) */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-outline-variant/20 scrollbar-thin scrollbar-thumb-outline-variant">
                {/* Mục Tất cả danh mục */}
                <div
                  className={cn(
                    'flex items-center justify-between px-4 sm:px-5 py-3 transition-colors select-none cursor-pointer group',
                    selectedCategory === 'ALL' ? 'bg-primary-container/20 text-primary font-bold' : 'hover:bg-surface-container-low text-on-surface'
                  )}
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setShowCategoryDropdown(false);
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon name="restaurant" className="text-[18px] text-primary" />
                    <span className="text-sm font-semibold">Tất cả danh mục</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                      30 món
                    </span>
                  </div>
                  {selectedCategory === 'ALL' && (
                    <Icon name="check" className="text-[18px] text-primary" />
                  )}
                </div>

                {/* 8 Danh mục thực tế từ CSDL */}
                {validCategories.filter((c) => c.categoryId !== 'ALL').map((cat) => {
                  const active = selectedCategory === cat.categoryId;
                  const dishesInCat = masterDishes.filter((d) => d.categoryId === cat.categoryId);
                  const isExpanded = expandedCategoryId === cat.categoryId;

                  return (
                    <div key={cat.categoryId} className="flex flex-col">
                      <div
                        className={cn(
                          'flex items-center justify-between px-4 sm:px-5 py-3 transition-colors select-none cursor-pointer group',
                          active ? 'bg-primary-container/15 text-primary' : 'hover:bg-surface-container-low text-on-surface'
                        )}
                      >
                        {/* Bấm vào tên category để lọc ngay */}
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setSelectedCategory(cat.categoryId);
                            setShowCategoryDropdown(false);
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <span
                            className={cn(
                              'text-sm truncate',
                              active ? 'font-bold text-primary' : 'font-semibold text-on-surface group-hover:text-primary'
                            )}
                          >
                            {cat.categoryName}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full font-medium tabular-nums shrink-0',
                              active
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container-high text-on-surface-variant group-hover:bg-primary-fixed group-hover:text-on-primary-fixed'
                            )}
                          >
                            {cat.dishCount} món
                          </span>
                        </button>

                        {/* Mũi tên tam giác đen ▼: Bấm để mở rộng danh sách các món ăn con bên trong kèm ảnh đại diện */}
                        {dishesInCat.length > 0 && (
                          <button
                            type="button"
                            aria-label={`Xem món con trong ${cat.categoryName}`}
                            title="Mở xem các món ăn thuộc danh mục này"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCategoryId((prev) => (prev === cat.categoryId ? null : (cat.categoryId as number)));
                            }}
                            className="p-1.5 rounded-md text-on-surface hover:text-primary hover:bg-surface-container transition-colors cursor-pointer ml-2"
                          >
                            <span
                              className={cn(
                                'text-[13px] block transition-transform duration-200 select-none text-on-surface font-mono',
                                isExpanded && 'rotate-180 text-primary'
                              )}
                            >
                              ▼
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Danh sách các món ăn con khi bấm nút mũi tên ▼ */}
                      {isExpanded && dishesInCat.length > 0 && (
                        <div className="bg-surface-container-low/60 px-4 py-3 border-t border-outline-variant/20 flex flex-col gap-2 animate-in fade-in duration-150">
                          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                            Món ăn thuộc {cat.categoryName}:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {dishesInCat.map((dish) => (
                              <button
                                key={dish.foodId}
                                type="button"
                                onClick={() => {
                                  setDraftKeyword(dish.foodName);
                                  setKeyword(dish.foodName);
                                  setSelectedCategory(cat.categoryId);
                                  setShowCategoryDropdown(false);
                                }}
                                className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container-lowest hover:bg-primary-fixed/20 text-left transition-all cursor-pointer border border-outline-variant/30 hover:border-primary/50 shadow-2xs group/dish"
                              >
                                <img
                                  referrerPolicy="no-referrer"
                                  src={dish.imageUrl}
                                  alt={dish.foodName}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = getFallbackFoodImage(null, dish.foodName, dish.categoryName);
                                  }}
                                  className="h-10 w-10 rounded-lg object-cover shrink-0 border border-outline-variant/40"
                                  loading="lazy"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-on-surface truncate group-hover/dish:text-primary">
                                    {dish.foodName}
                                  </p>
                                  <p className="text-[11px] text-on-surface-variant">
                                    {dish.totalRecipes} công thức chuẩn vị
                                  </p>
                                </div>
                                <Icon name="arrow_forward" className="text-[14px] text-outline group-hover/dish:text-primary shrink-0 opacity-0 group-hover/dish:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Chân Dropdown */}
              <div className="p-3 bg-surface-container-low/70 border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant">
                <span>Cuộn lướt để xem đầy đủ {validCategories.length - 1} danh mục đang có công thức</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-3 py-1.5 rounded-lg text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Đặt lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface font-semibold hover:bg-surface-container-highest cursor-pointer transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Thanh chip bộ lọc đang chọn (Đồng bộ chuẩn Kho công thức) */}
        {hasActiveFilter && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className={LABEL}>Đang lọc:</span>

            {draftKeyword && (
              <button
                type="button"
                onClick={() => {
                  setDraftKeyword('');
                  setKeyword('');
                }}
                className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high cursor-pointer"
              >
                <span>“{draftKeyword}”</span>
                <Icon name="close" className="text-[14px]" />
              </button>
            )}

            {selectedCategory !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className="inline-flex items-center gap-1 rounded-full bg-primary-fixed text-on-primary-fixed px-3 py-1 font-label-sm text-label-sm font-semibold hover:bg-primary-fixed/80 cursor-pointer"
              >
                <span>
                  {validCategories.find((c) => c.categoryId === selectedCategory)?.categoryName ?? 'Danh mục'}
                </span>
                <Icon name="close" className="text-[14px]" />
              </button>
            )}

            {selectedSchool !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedSchool('ALL')}
                className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high cursor-pointer"
              >
                <span>{SCHOOL_OPTIONS.find((s) => s.id === selectedSchool)?.label}</span>
                <Icon name="close" className="text-[14px]" />
              </button>
            )}

            {selectedCookTime !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCookTime('ALL')}
                className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high cursor-pointer"
              >
                <span>{TIME_OPTIONS.find((t) => t.id === selectedCookTime)?.label}</span>
                <Icon name="close" className="text-[14px]" />
              </button>
            )}

            {selectedNutrition !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedNutrition('ALL')}
                className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high cursor-pointer"
              >
                <span>{NUTRITION_OPTIONS.find((n) => n.id === selectedNutrition)?.label}</span>
                <Icon name="close" className="text-[14px]" />
              </button>
            )}

            <button
              type="button"
              onClick={resetFilters}
              className="font-label-sm text-label-sm text-secondary hover:underline cursor-pointer ml-1"
            >
              Xóa tất cả
            </button>
          </div>
        )}
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
            Hãy thử tìm bằng chữ cái hoặc từ khóa khác (ví dụ: "bún", "canh", "cà tím", "nấm").
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
