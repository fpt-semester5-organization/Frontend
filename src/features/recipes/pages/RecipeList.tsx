/**
 * SCR-11 · recipes/RecipeList · `/recipes`
 * FN: FN-POST-01, FN-PROF-08 · Huỳnh Việt Phát · Sprint 5
 * Kho công thức & video công khai có bộ lọc và phân trang; Khách lướt tới mục thứ N thì mời đăng ký (BR-GUEST-01).
 * Hỗ trợ xem toàn bộ công thức theo món ăn (foodId) với giao diện đầy đủ, thoáng đãng.
 */
import React, { useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { RecipeCard, RecipeCardSkeleton } from '../components/RecipeCard';
import { RecipeFilterPanel } from '../components/RecipeFilterPanel';
import { useBrowsePrompt } from '../hooks/useBrowsePrompt';
import { useCategories, useDietarySchools, useFood, useRecipeList } from '../hooks/useRecipes';
import {
  DEFAULT_RECIPE_FILTERS,
  hasActiveRecipeFilters,
  parseRecipeFilters,
  serializeRecipeFilters,
  toListParams,
  type RecipeFilters,
} from '../lib/recipeFilters';

const GRID = 'grid grid-cols-1 gap-gutter-mobile sm:grid-cols-2 sm:gap-gutter lg:grid-cols-3';
const PRIMARY_LINK =
  'inline-flex items-center gap-2 rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary';

const RecipeList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseRecipeFilters(searchParams), [searchParams]);
  const params = useMemo(() => toListParams(filters), [filters]);
  const list = useRecipeList(params);
  const schools = useDietarySchools();
  const categories = useCategories();
  const food = useFood(filters.foodId);
  const foodName = filters.foodId ? food.data?.foodName : undefined;

  const resultsRef = useRef<HTMLElement>(null);
  const { promptIndex, promptRef } = useBrowsePrompt(list.data?.meta.signUpPromptAtItem);

  const filtering = hasActiveRecipeFilters(filters);

  /** Đổi bộ lọc thì về trang 1 và thay URL hiện tại; đổi trang thì thêm lịch sử để nút Quay lại hoạt động. */
  const applyFilters = (patch: Partial<RecipeFilters>) =>
    setSearchParams(serializeRecipeFilters({ ...filters, ...patch, page: 1 }), { replace: true, preventScrollReset: true });
  const resetFilters = () => setSearchParams(serializeRecipeFilters({ ...DEFAULT_RECIPE_FILTERS, sort: filters.sort }), { replace: true });
  const goToPage = (page: number) => {
    setSearchParams(serializeRecipeFilters({ ...filters, page }), { preventScrollReset: true });
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderResults = () => {
    if (list.isPending) {
      return (
        <div className={GRID} role="status" aria-label="Đang tải công thức">
          <RecipeCardSkeleton count={6} />
        </div>
      );
    }
    if (list.isError) {
      return (
        <ErrorState
          error={list.error}
          onRetry={() => list.refetch()}
          retrying={list.isRefetching}
          className="rounded-2xl bg-surface-container-lowest"
        />
      );
    }

    const { items, meta } = list.data;
    if (items.length === 0) {
      if (meta.total > 0) {
        return (
          <EmptyState
            icon="find_in_page"
            title="Trang này không có công thức"
            description="Danh sách đã thay đổi hoặc số trang không hợp lệ."
            action={<Button onClick={() => goToPage(1)}>Về trang đầu</Button>}
          />
        );
      }
      return filtering ? (
        <EmptyState
          icon="search_off"
          title="Không tìm thấy công thức phù hợp"
          description="Thử bỏ bớt bộ lọc, đổi từ khóa hoặc tìm theo nguyên liệu khác."
          action={<Button onClick={resetFilters}>Xóa bộ lọc</Button>}
        />
      ) : (
        <EmptyState
          icon="menu_book"
          title="Chưa có công thức nào"
          description="Hãy là người đầu tiên chia sẻ một món chay với cộng đồng."
          action={
            <Link to={PATHS.RECIPES.NEW} className={PRIMARY_LINK}>
              <Icon name="add" className="text-[18px]" />
              Đăng công thức
            </Link>
          }
        />
      );
    }

    const offset = (meta.page - 1) * meta.size;
    return (
      <>
        <div className={cn(GRID, list.isPlaceholderData && 'opacity-60 transition-opacity')} aria-busy={list.isPlaceholderData}>
          {items.map((item, index) => (
            <RecipeCard
              key={item.recipeId}
              item={item}
              eager={meta.page === 1 && index < 2}
              ref={offset + index === promptIndex ? promptRef : undefined}
            />
          ))}
        </div>
        <Pagination page={meta.page} size={meta.size} total={meta.total} onPageChange={goToPage} className="mt-space-lg" />
      </>
    );
  };

  const total = list.data?.meta.total;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin sm:py-space-xl">
      <header className="flex flex-col gap-space-md md:flex-row md:items-end md:justify-between">
        <div className="max-w-[680px]">
          <p className="flex items-center gap-1.5 font-label-sm text-label-sm tracking-wide text-secondary uppercase">
            <Icon name={foodName ? 'restaurant_menu' : 'menu_book'} className="text-[16px]" />
            {foodName ? `Món ăn: ${foodName}` : 'Thư viện công thức chay'}
          </p>
          <h1 className="mt-1 font-headline-lg text-headline-lg-mobile text-primary sm:text-headline-lg">
            {foodName ? `Công thức món “${foodName}”` : 'Kho công thức chay'}
          </h1>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            {foodName
              ? `Khám phá các biến thể công thức khác nhau của món ${foodName}: công thức giàu calo cho người gầy tăng cân, công thức thanh dịu không ăn cay, chuẩn vị truyền thống và kiêng ngũ vị tân.`
              : 'Công thức đã qua kiểm duyệt, có định lượng rõ ràng, lọc theo trường phái, nguyên liệu và thời gian nấu.'}
          </p>
        </div>
        <Link to={PATHS.RECIPES.NEW} className={cn(PRIMARY_LINK, 'w-fit shrink-0')}>
          <Icon name="add_circle" className="text-[20px]" />
          Đăng công thức mới
        </Link>
      </header>

      <RecipeFilterPanel
        filters={filters}
        schools={schools.data}
        categories={categories.data}
        onChange={applyFilters}
        onReset={resetFilters}
      />

      {/* Dải lọc biến thể công thức nhanh khi đang xem theo món ăn (Giao diện to, đồng bộ Web) */}
      {foodName && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-3 shadow-xs">
          <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant mr-1 flex items-center gap-1">
            <Icon name="filter_list" className="text-[16px]" />
            Nhu cầu đặc biệt:
          </span>
          <button
            type="button"
            onClick={() => applyFilters({ keyword: '', dietarySchoolId: null })}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-label-sm text-label-sm font-medium transition-all cursor-pointer border',
              !filters.keyword && !filters.dietarySchoolId
                ? 'border-primary bg-primary text-on-primary font-semibold shadow-xs'
                : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary'
            )}
          >
            Tất cả công thức
          </button>
          <button
            type="button"
            onClick={() => applyFilters({ keyword: 'giảm cân', dietarySchoolId: null })}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-label-sm text-label-sm font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 border',
              filters.keyword === 'giảm cân'
                ? 'border-primary bg-primary text-on-primary font-semibold shadow-xs'
                : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary'
            )}
          >
            <Icon name="local_fire_department" className="text-[14px]" />
            Giảm cân (Eat Clean)
          </button>
          <button
            type="button"
            onClick={() => applyFilters({ keyword: 'sa tế', dietarySchoolId: null })}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-label-sm text-label-sm font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 border',
              filters.keyword === 'sa tế'
                ? 'border-primary bg-primary text-on-primary font-semibold shadow-xs'
                : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary'
            )}
          >
            <Icon name="whatshot" className="text-[14px]" />
            Vị sa tế cay nồng (ăn được ớt)
          </button>
          <button
            type="button"
            onClick={() => applyFilters({ keyword: 'không cay', dietarySchoolId: null })}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-label-sm text-label-sm font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 border',
              filters.keyword === 'không cay'
                ? 'border-primary bg-primary text-on-primary font-semibold shadow-xs'
                : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary'
            )}
          >
            <Icon name="sentiment_satisfied_alt" className="text-[14px]" />
            Không ăn cay (Thanh dịu)
          </button>
          <button
            type="button"
            onClick={() => applyFilters({ keyword: 'giàu đạm', dietarySchoolId: null })}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-label-sm text-label-sm font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 border',
              filters.keyword === 'giàu đạm'
                ? 'border-primary bg-primary text-on-primary font-semibold shadow-xs'
                : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary'
            )}
          >
            <Icon name="fitness_center" className="text-[14px]" />
            Giàu đạm thực vật
          </button>
          <button
            type="button"
            onClick={() => applyFilters({ keyword: 'truyền thống', dietarySchoolId: null })}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-label-sm text-label-sm font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 border',
              filters.keyword === 'truyền thống'
                ? 'border-primary bg-primary text-on-primary font-semibold shadow-xs'
                : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary'
            )}
          >
            <Icon name="history_edu" className="text-[14px]" />
            Chuẩn vị truyền thống
          </button>
          <button
            type="button"
            onClick={() => applyFilters({ keyword: '', dietarySchoolId: 2 })}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-label-sm text-label-sm font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 border',
              filters.dietarySchoolId === 2
                ? 'border-primary bg-primary text-on-primary font-semibold shadow-xs'
                : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary'
            )}
          >
            <Icon name="spa" className="text-[14px]" />
            Kiêng ngũ vị tân
          </button>
        </div>
      )}

      <section ref={resultsRef} aria-labelledby="recipe-results-title" className="scroll-mt-24">
        <div className="mb-space-md flex items-center justify-between gap-space-sm">
          <h2 id="recipe-results-title" className="font-headline-sm text-headline-sm text-on-surface">
            {foodName ? `Kết quả cho món “${foodName}”` : filters.keyword ? `Kết quả cho “${filters.keyword}”` : 'Tất cả công thức'}
          </h2>
          <p aria-live="polite" className="font-label-md text-label-md text-on-surface-variant">
            {total !== undefined && !list.isError ? `${formatNumber(total)} công thức` : ''}
          </p>
        </div>
        {renderResults()}
      </section>
    </div>
  );
};

export default RecipeList;
