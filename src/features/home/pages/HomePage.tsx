/**
 * SCR-10 · home/Home · `/`
 * FN: FN-POST-01, FN-POST-05 (FN-AUTH-01/02 do phiên Khách chạy sẵn ở AppShell) · Huỳnh Việt Phát · Sprint 5
 * Bảng tin công thức & video, ô tìm kiếm, khối cộng đồng; Khách lướt tới mục thứ 5 thì mời đăng ký (BR-GUEST-01).
 */
import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { RecipeCard, RecipeCardSkeleton } from '@/features/recipes/components/RecipeCard';
import { useBrowsePrompt } from '@/features/recipes/hooks/useBrowsePrompt';
import { useDietarySchools } from '@/features/recipes/hooks/useRecipes';
import type { RecipeContentType, RecipeSort } from '@/features/recipes/types/recipe.types';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { HomeHero } from '../components/HomeHero';
import { HomeSearchFilter } from '../components/HomeSearchFilter';
import { TrialCards } from '../components/TrialCards';
import { useRecipeFeed } from '../hooks/useHomeFeed';
import { DEFAULT_FILTERS, hasActiveFilters, parseFilters, serializeFilters, toRecipeParams } from '../lib/homeFilters';
import type { HomeFilters } from '../types/home.types';

const CONTENT_TABS: { value: RecipeContentType; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'RECIPE', label: 'Công thức' },
  { value: 'VIDEO', label: 'Video' },
];

const SORTS: { value: RecipeSort; label: string }[] = [
  { value: 'POPULAR', label: 'Phổ biến' },
  { value: 'NEWEST', label: 'Mới nhất' },
];

const HomePage: React.FC = () => {
  const [search, setSearch] = useSearchParams();
  const filters = useMemo(() => parseFilters(search), [search]);
  const recipeParams = useMemo(() => toRecipeParams(filters), [filters]);

  const update = (patch: Partial<HomeFilters>) =>
    setSearch(serializeFilters({ ...filters, ...patch }), { replace: true, preventScrollReset: true });
  const clearFilters = () => setSearch(serializeFilters({ ...DEFAULT_FILTERS, sort: filters.sort }), { replace: true });

  const schools = useDietarySchools();
  const feed = useRecipeFeed(recipeParams);

  const items = useMemo(() => feed.data?.pages.flatMap((page) => page.items) ?? [], [feed.data]);
  const firstMeta = feed.data?.pages[0]?.meta;
  const { promptIndex, promptRef } = useBrowsePrompt(firstMeta?.signUpPromptAtItem);
  const filtered = hasActiveFilters(filters);
  const refreshing = feed.isFetching && !feed.isFetchingNextPage && !feed.isPending;

  return (
    <div className="flex flex-col">
      <HomeHero />

      <div id="recipes-section" className="mx-auto flex w-full max-w-[1200px] flex-col gap-space-xl px-margin-mobile py-space-xl sm:px-margin scroll-mt-6">
        <section aria-labelledby="recipes-title" className="flex flex-col gap-space-md">

          {/* Header tiêu đề danh sách: Công thức nổi bật + số lượng */}
          <div className="flex flex-wrap items-end justify-between gap-space-sm">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="flex items-center gap-1.5 font-label-sm text-label-sm uppercase text-secondary">
                <Icon name="nutrition" className="text-[16px]" />
                Định lượng rõ ràng
              </p>
              <h2 id="recipes-title" className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">
                {filters.keyword ? `Kết quả cho “${filters.keyword}”` : 'Công thức nổi bật'}
              </h2>
              {firstMeta && (
                <p className="font-body-sm text-body-sm text-on-surface-variant tabular-nums" aria-live="polite">
                  {formatNumber(firstMeta.total)} công thức và video
                </p>
              )}
            </div>
          </div>

          {/* Bộ lọc duy nhất và hợp nhất: Tìm kiếm + Loại nội dung + Sắp xếp + Trường phái & Thời gian */}
          <HomeSearchFilter
            filters={filters}
            schools={schools.data}
            schoolsLoading={schools.isPending}
            onChange={update}
          />

          {feed.isPending ? (
            <div className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Đang tải công thức">
              <RecipeCardSkeleton count={6} />
            </div>
          ) : feed.isError && items.length === 0 ? (
            <ErrorState error={feed.error} onRetry={() => void feed.refetch()} retrying={feed.isRefetching} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={filtered ? 'search_off' : 'restaurant_menu'}
              title={filtered ? 'Không tìm thấy công thức phù hợp' : 'Chưa có công thức nào'}
              description={
                filtered
                  ? 'Thử từ khóa khác, bỏ bớt bộ lọc hoặc xem tất cả công thức.'
                  : 'Các công thức được duyệt sẽ xuất hiện ở đây. Trong lúc chờ, hãy xem cộng đồng chia sẻ gì.'
              }
              action={
                filtered ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Xóa bộ lọc
                  </Button>
                ) : (
                  <Link to={PATHS.COMMUNITY.ROOT} className="font-label-md text-label-md text-primary">
                    Xem bảng tin cộng đồng
                  </Link>
                )
              }
            />
          ) : (
            <>
              <div
                className="grid gap-space-md transition-opacity aria-busy:opacity-60 sm:grid-cols-2 lg:grid-cols-3"
                aria-busy={refreshing || undefined}
              >
                {items.map((item, index) => (
                  <RecipeCard
                    key={`${item.type}-${item.recipeId}`}
                    item={item}
                    ref={index === promptIndex ? promptRef : undefined}
                  />
                ))}
                {feed.isFetchingNextPage && <RecipeCardSkeleton count={3} />}
              </div>
              {feed.isFetchNextPageError && (
                <p role="alert" className="flex flex-wrap items-center justify-center gap-2 font-body-sm text-body-sm text-error">
                  Chưa tải thêm được công thức.
                  <Button size="sm" variant="outline" onClick={() => void feed.fetchNextPage()}>
                    Thử lại
                  </Button>
                </p>
              )}
              {feed.hasNextPage && !feed.isFetchNextPageError && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => void feed.fetchNextPage()} loading={feed.isFetchingNextPage}>
                    Xem thêm công thức
                    <Icon name="expand_more" className="text-[20px]" />
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        <TrialCards />
      </div>
    </div>
  );
};

export default HomePage;
