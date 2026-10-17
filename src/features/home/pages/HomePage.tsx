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
import { usePostList } from '@/features/community/hooks/usePosts';
import { RecipeCard, RecipeCardSkeleton } from '@/features/recipes/components/RecipeCard';
import { useBrowsePrompt } from '@/features/recipes/hooks/useBrowsePrompt';
import { useDietarySchools } from '@/features/recipes/hooks/useRecipes';
import type { RecipeContentType, RecipeSort } from '@/features/recipes/types/recipe.types';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { PATHS } from '@/routes/paths';
import { HomeHero } from '../components/HomeHero';
import { HomePostCard, HomePostSkeleton } from '../components/HomePostCard';
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

const POSTS_ON_HOME = 3;

const HomePage: React.FC = () => {
  const [search, setSearch] = useSearchParams();
  const filters = useMemo(() => parseFilters(search), [search]);
  const recipeParams = useMemo(() => toRecipeParams(filters), [filters]);

  const update = (patch: Partial<HomeFilters>) =>
    setSearch(serializeFilters({ ...filters, ...patch }), { replace: true, preventScrollReset: true });
  const clearFilters = () => setSearch(serializeFilters({ ...DEFAULT_FILTERS, sort: filters.sort }), { replace: true });

  const schools = useDietarySchools();
  const feed = useRecipeFeed(recipeParams);
  const posts = usePostList({
    sort: 'NEWEST',
    page: 1,
    size: POSTS_ON_HOME,
    ...(filters.keyword ? { keyword: filters.keyword } : {}),
  });

  const items = useMemo(() => feed.data?.pages.flatMap((page) => page.items) ?? [], [feed.data]);
  const firstMeta = feed.data?.pages[0]?.meta;
  const { promptIndex, promptRef } = useBrowsePrompt(firstMeta?.signUpPromptAtItem);
  const filtered = hasActiveFilters(filters);
  const refreshing = feed.isFetching && !feed.isFetchingNextPage && !feed.isPending;

  return (
    <div className="flex flex-col">
      <HomeHero filters={filters} schools={schools.data} schoolsLoading={schools.isPending} onChange={update} />

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-space-xl px-margin-mobile py-space-xl sm:px-margin">
        <section aria-labelledby="recipes-title" className="flex flex-col gap-space-md">
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
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label="Loại nội dung" className="flex rounded-lg bg-surface-container p-1">
                {CONTENT_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    aria-pressed={filters.contentType === tab.value}
                    onClick={() => update({ contentType: tab.value })}
                    className={cn(
                      'rounded-md px-3 py-1.5 font-label-md text-label-md transition-colors',
                      filters.contentType === tab.value
                        ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
                <span className="sr-only sm:not-sr-only">Sắp xếp</span>
                <select
                  value={filters.sort}
                  onChange={(event) => update({ sort: event.target.value as RecipeSort })}
                  className="h-9 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 font-label-md text-label-md text-on-surface"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

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

        <section aria-labelledby="community-home-title" className="flex flex-col gap-space-md">
          <div className="flex flex-wrap items-end justify-between gap-space-sm">
            <h2 id="community-home-title" className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">
              {filters.keyword ? 'Bài viết liên quan' : 'Từ cộng đồng'}
            </h2>
            <Link
              to={PATHS.COMMUNITY.ROOT}
              className="inline-flex items-center gap-1 font-label-md text-label-md text-secondary no-underline hover:underline"
            >
              Xem bảng tin cộng đồng
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>
          {posts.isPending ? (
            <div className="grid gap-space-md md:grid-cols-3" role="status" aria-label="Đang tải bài viết">
              <HomePostSkeleton count={POSTS_ON_HOME} />
            </div>
          ) : posts.isError ? (
            <ErrorState error={posts.error} onRetry={() => void posts.refetch()} retrying={posts.isRefetching} className="py-space-lg" />
          ) : posts.data.items.length === 0 ? (
            <EmptyState
              icon="forum"
              title={filters.keyword ? 'Chưa có bài viết phù hợp' : 'Cộng đồng chưa có bài viết'}
              description="Hãy là người đầu tiên chia sẻ món chay của bạn."
              action={
                <Link to={PATHS.COMMUNITY.NEW_POST} className="font-label-md text-label-md text-primary">
                  Viết bài
                </Link>
              }
              className="py-space-lg"
            />
          ) : (
            <div className="grid gap-space-md md:grid-cols-3">
              {posts.data.items.map((post) => (
                <HomePostCard key={post.postId} post={post} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HomePage;
