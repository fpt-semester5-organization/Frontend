import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useInfiniteRecipes } from '@/features/recipes/hooks/useRecipes';
import { useRequireMember } from '@/hooks/useRequireMember';
import { SIGNUP_PROMPT_AT_ITEM, useSignupPromptAtItem } from '@/hooks/useSignupPromptAtItem';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { FeedFilters } from '../components/FeedFilters';
import { PostCard, PostFeedSkeleton } from '../components/PostCard';
import { PostListToolbar } from '../components/PostListToolbar';
import { useInfinitePosts } from '../hooks/usePosts';
import { getRecentCreatedItems } from '../lib/recentFeedStore';
import {
  fromPost,
  fromRecipe,
  interleaveItems,
  type CommunityFeedItem,
  type PostListItem,
  type PostSort,
} from '../types/community.types';

const PAGE_SIZE = 10;

/**
 * SCR-25 community/PostFeed — Bố cục Cộng đồng hiện đại:
 * 1. Cột trái: Bộ lọc & Điều hướng (Có nút thu gọn / mở rộng linh hoạt)
 * 2. Cột chính: Feed tin tức cuộn vô hạn (Infinite Scroll) kết hợp Bài viết (Blog) & Công thức món chay
 */
const PostFeed: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isMember, requireMember } = useRequireMember();
  const promptRef = useSignupPromptAtItem<HTMLElement>();

  // State thu gọn cột trái (Bộ lọc) trên Desktop và Offcanvas trên Mobile
  const [leftOpen, setLeftOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Lắng nghe sự kiện thêm bài viết/công thức mới để cập nhật tức thì
  const [recentTrigger, setRecentTrigger] = useState(0);
  useEffect(() => {
    const handleRecent = () => setRecentTrigger((v) => v + 1);
    window.addEventListener('vl_recent_item_added', handleRecent);
    return () => window.removeEventListener('vl_recent_item_added', handleRecent);
  }, []);

  // 1. Đọc toàn bộ tham số tìm kiếm & lọc từ URL
  const type = searchParams.get('type') ?? 'ALL'; // 'ALL' | 'POST' | 'RECIPE'
  const keyword = searchParams.get('keyword')?.trim() ?? '';
  const sort: PostSort = searchParams.get('sort') === 'POPULAR' ? 'POPULAR' : 'NEWEST';

  const categoryIdStr = searchParams.get('categoryId');
  const categoryId = categoryIdStr && Number.isFinite(Number(categoryIdStr)) ? Number(categoryIdStr) : undefined;

  const dietarySchoolIdStr = searchParams.get('dietarySchoolId');
  const dietarySchoolId = dietarySchoolIdStr && Number.isFinite(Number(dietarySchoolIdStr)) ? Number(dietarySchoolIdStr) : undefined;

  const maxCookTimeStr = searchParams.get('maxCookTime');
  const maxCookTime = maxCookTimeStr && Number.isFinite(Number(maxCookTimeStr)) ? Number(maxCookTimeStr) : undefined;

  const ingredient = searchParams.get('ingredient')?.trim() || undefined;

  // 2. Xác định luồng nội dung cần tải
  const isRecipeFilterActive = Boolean(categoryId || dietarySchoolId || maxCookTime || ingredient);
  const wantPosts = type === 'POST' || (type === 'ALL' && !isRecipeFilterActive);
  const wantRecipes = type === 'RECIPE' || type === 'ALL';

  // 3. Tải dữ liệu bằng Cuộn Vô Hạn (Infinite Scroll)
  const postsQuery = useInfinitePosts(
    { keyword: keyword || undefined, sort, size: PAGE_SIZE },
    { enabled: wantPosts }
  );

  const recipesQuery = useInfiniteRecipes(
    {
      keyword: keyword || undefined,
      categoryId,
      dietarySchoolId,
      maxCookTime,
      ingredient,
      sort,
      size: PAGE_SIZE,
    },
    { enabled: wantRecipes }
  );

  // 4. Hợp nhất các trang bài viết và công thức đã nạp
  const postItems = useMemo(() => {
    if (!wantPosts || !postsQuery.data) return [];
    return postsQuery.data.pages.flatMap((page: { items: PostListItem[] }) => page.items.map(fromPost));
  }, [wantPosts, postsQuery.data]);

  const recipeItems = useMemo(() => {
    if (!wantRecipes || !recipesQuery.data) return [];
    return recipesQuery.data.pages.flatMap(
      (page: { items: import('@/features/recipes/types/recipe.types').RecipeListItem[] }) =>
        page.items.map(fromRecipe)
    );
  }, [wantRecipes, recipesQuery.data]);

  const feedItems: CommunityFeedItem[] = useMemo(() => {
    const recent = getRecentCreatedItems().filter((item) => {
      if (type === 'POST' && item.kind !== 'POST') return false;
      if (type === 'RECIPE' && item.kind !== 'RECIPE') return false;
      if (keyword && !item.title.toLowerCase().includes(keyword.toLowerCase())) return false;
      return true;
    });

    const latestRecent = recent[0];
    const raw =
      wantPosts && wantRecipes
        ? latestRecent?.kind === 'RECIPE'
          ? interleaveItems(recipeItems, postItems)
          : interleaveItems(postItems, recipeItems)
        : wantPosts
          ? postItems
          : recipeItems;

    // Khi sort === 'NEWEST', luôn đặt các bài viết / công thức vừa tạo (recent) lên vị trí đầu tiên
    const combined = sort === 'NEWEST' ? [...recent, ...raw] : raw;

    // Lọc bỏ trùng lặp: nếu cùng videoId hoặc cùng tiêu đề hoặc cùng ID
    const seenKeys = new Set<string>();
    const seenTitles = new Set<string>();
    const seenVideoIds = new Set<number>();
    return combined.filter((item) => {
      if (seenKeys.has(item.key)) return false;
      if (item.videoId && seenVideoIds.has(item.videoId)) return false;
      const normalizedTitle = item.title.trim().toLowerCase();
      if (seenTitles.has(normalizedTitle)) return false;

      seenKeys.add(item.key);
      if (item.videoId) seenVideoIds.add(item.videoId);
      seenTitles.add(normalizedTitle);
      return true;
    });
  }, [wantPosts, wantRecipes, postItems, recipeItems, sort, type, keyword, recentTrigger]);

  const totalCount =
    (wantPosts ? postsQuery.data?.pages[0]?.meta.total ?? 0 : 0) +
    (wantRecipes ? recipesQuery.data?.pages[0]?.meta.total ?? 0 : 0);

  const isPending =
    feedItems.length === 0 &&
    ((wantPosts && postsQuery.isPending) || (wantRecipes && recipesQuery.isPending));
  const isError = (wantPosts && postsQuery.isError) || (wantRecipes && recipesQuery.isError);
  const error = (wantPosts && postsQuery.error) || (wantRecipes && recipesQuery.error);

  const isFetchingMore = postsQuery.isFetchingNextPage || recipesQuery.isFetchingNextPage;
  const hasMore = (wantPosts && !!postsQuery.hasNextPage) || (wantRecipes && !!recipesQuery.hasNextPage);

  // 5. Cài đặt IntersectionObserver để kích hoạt cuộn vô hạn khi chạm đáy
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { fetchNextPage: fetchNextPosts } = postsQuery;
  const { fetchNextPage: fetchNextRecipes } = recipesQuery;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        if (wantPosts && postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
          void fetchNextPosts();
        }
        if (wantRecipes && recipesQuery.hasNextPage && !recipesQuery.isFetchingNextPage) {
          void fetchNextRecipes();
        }
      },
      { rootMargin: '0px 0px 600px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, wantPosts, wantRecipes, postsQuery.hasNextPage, recipesQuery.hasNextPage, postsQuery.isFetchingNextPage, recipesQuery.isFetchingNextPage, fetchNextPosts, fetchNextRecipes]);

  const activeFiltersCount = [
    type !== 'ALL' ? type : null,
    categoryId,
    dietarySchoolId,
    maxCookTime,
    ingredient,
  ].filter(Boolean).length;

  const updateParams = (next: { keyword?: string; sort?: PostSort }) => {
    const params = new URLSearchParams(searchParams);
    const merged = { keyword, sort, ...next };
    if (merged.keyword) params.set('keyword', merged.keyword);
    else params.delete('keyword');
    if (merged.sort !== 'NEWEST') params.set('sort', merged.sort);
    else params.delete('sort');
    params.delete('page');
    setSearchParams(params);
  };

  const writePost = () => requireMember(() => navigate(PATHS.COMMUNITY.NEW_POST));

  const sideLink =
    'flex items-center gap-space-sm rounded-xl bg-surface-container-lowest p-space-md no-underline shadow-card transition-shadow hover:shadow-card-hover';

  // Tính toán lưới grid động dựa trên trạng thái đóng/mở của cột bộ lọc bên trái
  const gridLayout = useMemo(() => {
    if (leftOpen) {
      return 'lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]';
    }
    return 'lg:grid-cols-[56px_minmax(0,1fr)] xl:grid-cols-[56px_minmax(0,1fr)]';
  }, [leftOpen]);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-margin-mobile py-space-lg sm:px-margin">
      <div className={cn('grid gap-space-lg items-start transition-[grid-template-columns] duration-300', gridLayout)}>
        {/* CỘT TRÁI: Bộ lọc & Điều hướng (Desktop) */}
        {leftOpen ? (
          <aside
            aria-label="Tạo nội dung và bộ lọc"
            // Màn rộng: dính dưới header và cao tối đa bằng khung nhìn (top-24 = 96px, chừa 16px dưới đáy).
            // Phần trên giữ nguyên, khung bộ lọc co lại và cuộn riêng; nếu không giới hạn chiều cao, khối sticky cao hơn
            // màn hình chỉ lộ phần dưới khi đã cuộn hết bảng tin.
            className="hidden lg:flex flex-col gap-space-md lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)]"
          >
            {/* Header thanh bên trái có nút thu gọn */}
            <div className="flex shrink-0 items-center justify-between px-1">
              <span className="font-label-md text-label-md font-bold text-on-surface">Điều hướng & Lọc</span>
              <button
                type="button"
                onClick={() => setLeftOpen(false)}
                title="Thu gọn thanh bộ lọc"
                aria-label="Thu gọn bộ lọc"
                className="flex h-8 items-center gap-1 rounded-lg px-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              >
                <Icon name="left_panel_close" className="text-[18px]" />
                <span className="text-[12px]">Thu gọn</span>
              </button>
            </div>

            <Button size="lg" className="w-full shrink-0 shadow-sm" onClick={writePost}>
              <Icon name="edit_square" className="text-[20px]" />
              Viết bài mới
            </Button>

            {isMember ? (
              <Link to={PATHS.ME.POSTS} className={cn(sideLink, 'shrink-0')}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
                  <Icon name="article" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-label-md text-label-md text-on-surface block truncate">Bài viết của tôi</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">Quản lý & bài đã lưu</span>
                </div>
                <Icon name="chevron_right" className="text-[20px] text-outline shrink-0" />
              </Link>
            ) : (
              <div
                onClick={() => requireMember(() => undefined)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    requireMember(() => undefined);
                  }
                }}
                className={cn(sideLink, 'shrink-0 cursor-pointer flex-col items-start gap-space-xs hover:border-primary')}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container text-on-primary">
                    <Icon name="person_add" className="text-[18px]" />
                  </span>
                  <p className="font-label-md text-label-md font-bold text-on-surface">Tham gia cộng đồng</p>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Đăng ký để thả tim, bình luận và chia sẻ hành trình ăn chay của bạn.
                </p>
                <span className="mt-1 font-label-sm text-label-sm font-semibold text-primary">Đăng ký / Đăng nhập →</span>
              </div>
            )}

            {/* Khối Bộ lọc phong phú */}
            <FeedFilters />
          </aside>
        ) : (
          /* Cột trái khi ĐÃ THU GỌN: thanh dọc biểu tượng tiện lợi */
          <aside className="sticky top-24 hidden lg:flex flex-col items-center gap-3 py-2">
            <button
              type="button"
              onClick={() => setLeftOpen(true)}
              title="Mở rộng thanh bộ lọc"
              aria-label="Mở rộng bộ lọc"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all shadow-xs cursor-pointer"
            >
              <Icon name="left_panel_open" className="text-[20px]" />
            </button>
            <button
              type="button"
              onClick={writePost}
              title="Viết bài mới"
              aria-label="Viết bài mới"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary hover:opacity-90 transition-all shadow-xs cursor-pointer"
            >
              <Icon name="edit_square" className="text-[20px]" />
            </button>
            <button
              type="button"
              onClick={() => setLeftOpen(true)}
              title="Mở bộ lọc"
              aria-label="Mở bộ lọc"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all shadow-xs cursor-pointer"
            >
              <Icon name="tune" className="text-[20px]" />
            </button>
            {isMember && (
              <Link
                to={PATHS.ME.POSTS}
                title="Bài viết của tôi"
                aria-label="Bài viết của tôi"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all shadow-xs"
              >
                <Icon name="article" className="text-[20px]" />
              </Link>
            )}
          </aside>
        )}

        {/* CỘT CHÍNH: Feed trung tâm (Cuộn vô hạn) */}
        <section
          aria-labelledby="community-title"
          className={cn(
            'flex min-w-0 flex-col gap-space-md w-full',
            !leftOpen ? 'max-w-[860px] mx-auto' : 'max-w-[860px]'
          )}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 id="community-title" className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">
                Cộng đồng
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Khám phá bài viết dinh dưỡng và kho công thức ẩm thực chay lành.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={writePost} className="shadow-xs lg:hidden">
                <Icon name="edit_square" className="text-[18px]" />
                <span>Viết bài</span>
              </Button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="flex lg:hidden items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              >
                <Icon name="tune" className="text-[18px]" />
                <span>Bộ lọc</span>
                {activeFiltersCount > 0 && (
                  <span className="rounded-full bg-primary-container px-1.5 py-0.2 text-[10px] font-bold text-on-primary">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              {!leftOpen && (
                <button
                  type="button"
                  onClick={() => setLeftOpen(true)}
                  className="hidden lg:flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                >
                  <Icon name="tune" className="text-[18px]" />
                  <span>Bộ lọc</span>
                  {activeFiltersCount > 0 && (
                    <span className="rounded-full bg-primary-container px-1.5 py-0.2 text-[10px] font-bold text-on-primary">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          <PostListToolbar
            keyword={keyword}
            sort={sort}
            onSearch={(value) => updateParams({ keyword: value })}
            onSortChange={(value) => updateParams({ sort: value })}
          />

          {isPending ? (
            <PostFeedSkeleton count={3} />
          ) : isError ? (
            <ErrorState
              error={error}
              onRetry={() => {
                if (wantPosts) postsQuery.refetch();
                if (wantRecipes) recipesQuery.refetch();
              }}
              retrying={postsQuery.isRefetching || recipesQuery.isRefetching}
            />
          ) : feedItems.length === 0 ? (
            keyword || activeFiltersCount > 0 ? (
              <div className="flex flex-col gap-space-md">
                <EmptyState
                  icon="search_off"
                  title="Không tìm thấy nội dung phù hợp"
                  description="Không có bài viết hoặc công thức nào khớp với các bộ lọc đã chọn."
                  action={
                    <Button
                      onClick={() => {
                        setSearchParams(new URLSearchParams());
                      }}
                    >
                      Xóa tất cả bộ lọc
                    </Button>
                  }
                />
                <div className="rounded-2xl border border-surface-container bg-surface-container-lowest p-space-md text-center shadow-card">
                  <p className="font-label-sm text-label-sm font-semibold text-on-surface-variant mb-2">
                    Gợi ý từ khóa tìm kiếm nhanh:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['thực dưỡng', 'nấm hương', 'đậu hũ', 'canh chua', 'dinh dưỡng'].map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => updateParams({ keyword: kw })}
                        className="rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors cursor-pointer"
                      >
                        #{kw}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon="forum"
                title="Chưa có bài viết"
                description="Hãy là người đầu tiên chia sẻ với cộng đồng."
                action={<Button onClick={writePost}>Viết bài</Button>}
              />
            )
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <p className="font-label-sm text-label-sm tabular-nums text-on-surface-variant" aria-live="polite">
                  {formatNumber(totalCount)} kết quả
                  {activeFiltersCount > 0 && (
                    <span className="text-secondary font-semibold ml-1">
                      ({activeFiltersCount} bộ lọc đang áp dụng)
                    </span>
                  )}
                </p>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Đang hiển thị {feedItems.length} mục
                </span>
              </div>

              {/* Danh sách thẻ bài viết & công thức */}
              <div className="flex flex-col gap-space-md transition-opacity">
                {feedItems.map((item, index) => (
                  <PostCard
                    key={item.key}
                    item={item}
                    ref={index === SIGNUP_PROMPT_AT_ITEM - 1 ? promptRef : undefined}
                  />
                ))}
              </div>

              {/* Sentinel quan sát để tự động kích hoạt nạp thêm bài khi cuộn tới cuối */}
              <div ref={sentinelRef} className="py-4 text-center">
                {isFetchingMore ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-on-surface-variant font-label-sm text-label-sm">
                    <Icon name="hourglass_empty" className="animate-spin text-[18px] text-primary" />
                    <span>Đang nạp thêm bài viết & công thức…</span>
                  </div>
                ) : !hasMore && feedItems.length > 0 ? (
                  <p className="font-label-sm text-label-sm text-outline py-2">
                    ✨ Bạn đã xem hết tất cả nội dung trong cộng đồng.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Offcanvas Drawer Bộ lọc cho màn hình di động (< lg) */}
      <Offcanvas
        show={mobileFiltersOpen}
        onHide={() => setMobileFiltersOpen(false)}
        placement="start"
        className="lg:hidden"
        style={{ maxWidth: '85vw', width: 340 }}
      >
        <Offcanvas.Header closeButton closeLabel="Đóng bộ lọc" className="border-b border-surface-container">
          <Offcanvas.Title as="h2" className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
            <Icon name="tune" className="text-primary text-[20px]" />
            <span>Bộ lọc cộng đồng</span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="flex flex-col gap-space-md p-space-md overflow-y-auto">
          <Button size="lg" className="w-full shadow-sm mb-2" onClick={() => { setMobileFiltersOpen(false); writePost(); }}>
            <Icon name="edit_square" className="text-[20px]" />
            Viết bài mới
          </Button>
          <FeedFilters onFilterChange={() => setMobileFiltersOpen(false)} />
          <Button
            className="w-full mt-2"
            onClick={() => setMobileFiltersOpen(false)}
          >
            Xem kết quả ({formatNumber(totalCount)})
          </Button>
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
};

export default PostFeed;
