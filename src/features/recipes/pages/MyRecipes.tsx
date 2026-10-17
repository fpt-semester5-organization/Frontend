/**
 * SCR-14 · recipes/MyRecipes · `/me/recipes`
 * FN: FN-POST-01 (+ DELETE FN-POST-04) · Huỳnh Việt Phát · Sprint 5
 * Chỉ hiện khi đã đăng nhập; Khách thấy lời mời đăng nhập/đăng ký.
 *
 * UNSPECIFIED (giả định 17/10/2026, chờ Leader chốt): GET /recipes?authorId=<tôi>&status= trả mọi trạng thái của chính
 * người gọi (trừ DELETED), mỗi mục kèm status — xem MyRecipeListParams trong recipe.types.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageLoader } from '@/components/common/PageLoader';
import { Button } from '@/components/ui/Button';
import { INPUT_CLASS } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { MyRecipeRow, MyRecipeRowSkeleton } from '../components/MyRecipeRow';
import { useDeleteRecipe } from '../hooks/useRecipeMutations';
import { useMyRecipes } from '../hooks/useRecipes';
import { KEYWORD_MAX } from '../lib/recipeFilters';
import { MY_RECIPE_STATUSES, RECIPE_STATUS_META, isMyRecipeStatus } from '../lib/recipeStatus';
import type { DeleteRecipeMode, MyRecipeItem, MyRecipeStatus, RecipeSort } from '../types/recipe.types';

/** SCR-14: size 1–20, mặc định 10. */
const PAGE_SIZE = 10;

const PRIMARY_LINK =
  'inline-flex items-center gap-2 rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary';
const TAB = 'shrink-0 rounded-full px-3.5 py-1.5 font-label-md text-label-md transition-colors';

const REMOVE_COPY: Record<DeleteRecipeMode, { title: string; message: string; confirm: string }> = {
  archive: {
    title: 'Gỡ khỏi trang cá nhân?',
    message: 'Công thức sẽ không còn hiện trên trang cá nhân và kho công thức, nhưng vẫn được lưu lại trong mục “Đã gỡ”.',
    confirm: 'Gỡ công thức',
  },
  all: {
    title: 'Xóa công thức?',
    message: 'Công thức sẽ bị xóa với mọi người, kèm bình luận và lượt thả tim. Bạn không thể hoàn tác thao tác này.',
    confirm: 'Xóa công thức',
  },
};

interface MyFilters {
  keyword: string;
  status: MyRecipeStatus | null;
  sort: RecipeSort;
  page: number;
}

function readFilters(search: URLSearchParams): MyFilters {
  const page = Number(search.get('page'));
  const status = search.get('status');
  return {
    keyword: (search.get('q') ?? '').trim().slice(0, KEYWORD_MAX),
    status: isMyRecipeStatus(status) ? status : null,
    sort: search.get('sort') === 'POPULAR' ? 'POPULAR' : 'NEWEST',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function writeFilters(filters: MyFilters): URLSearchParams {
  const out = new URLSearchParams();
  if (filters.keyword) out.set('q', filters.keyword);
  if (filters.status) out.set('status', filters.status);
  if (filters.sort !== 'NEWEST') out.set('sort', filters.sort);
  if (filters.page > 1) out.set('page', String(filters.page));
  return out;
}

const MyRecipes: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const [keyword, setKeyword] = useState(filters.keyword);
  const [pending, setPending] = useState<{ item: MyRecipeItem; mode: DeleteRecipeMode } | null>(null);
  const removeRecipe = useDeleteRecipe();

  useEffect(() => setKeyword(filters.keyword), [filters.keyword]);

  const params = useMemo(
    () => ({
      authorId: user?.userId ?? 0,
      ...(filters.keyword ? { keyword: filters.keyword } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      sort: filters.sort,
      page: filters.page,
      size: PAGE_SIZE,
    }),
    [user?.userId, filters]
  );
  const list = useMyRecipes(params, !!user);

  if (sessionStatus === 'restoring') return <PageLoader />;

  if (!user) {
    return (
      <EmptyState
        icon="menu_book"
        title="Công thức của tôi"
        description="Đăng nhập để xem, sửa và quản lý các công thức bạn đã chia sẻ."
        action={
          <>
            <Link to={withReturnUrl(PATHS.AUTH.LOGIN, PATHS.ME.RECIPES)} className={PRIMARY_LINK}>
              Đăng nhập
            </Link>
            <Link
              to={withReturnUrl(PATHS.AUTH.REGISTER, PATHS.ME.RECIPES)}
              className="rounded-lg bg-surface-container px-5 py-2.5 font-label-md text-label-md text-on-surface no-underline hover:bg-surface-container-high"
            >
              Đăng ký
            </Link>
          </>
        }
      />
    );
  }

  const update = (patch: Partial<MyFilters>) =>
    setSearchParams(writeFilters({ ...filters, page: 1, ...patch }), { replace: !('page' in patch) });

  const confirmRemove = () => {
    if (!pending) return;
    removeRecipe.mutate(
      { recipeId: pending.item.recipeId, mode: pending.mode },
      {
        onSuccess: (res) => {
          notifySuccess(res.message || (pending.mode === 'archive' ? 'Đã gỡ công thức.' : 'Đã xóa công thức.'));
          setPending(null);
        },
        onError: (error) => {
          setPending(null);
          notifyApiError(error);
        },
      }
    );
  };

  const renderList = () => {
    if (list.isPending) {
      return (
        <ul className="flex flex-col gap-space-sm" role="status" aria-label="Đang tải công thức của bạn">
          <MyRecipeRowSkeleton />
        </ul>
      );
    }
    if (list.isError) {
      return <ErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isRefetching} />;
    }
    const { items, meta } = list.data;
    if (items.length === 0) {
      if (meta.total > 0) {
        return (
          <EmptyState
            icon="find_in_page"
            title="Trang này không có công thức"
            description="Danh sách đã thay đổi hoặc số trang không hợp lệ."
            action={<Button onClick={() => update({ page: 1 })}>Về trang đầu</Button>}
          />
        );
      }
      if (filters.keyword) {
        return (
          <EmptyState
            icon="search_off"
            title="Không tìm thấy công thức phù hợp"
            description={`Không có công thức nào của bạn khớp “${filters.keyword}”.`}
            action={<Button onClick={() => update({ keyword: '' })}>Xóa tìm kiếm</Button>}
          />
        );
      }
      if (filters.status) {
        return (
          <EmptyState
            icon={RECIPE_STATUS_META[filters.status].icon}
            title={`Không có công thức ở mục “${RECIPE_STATUS_META[filters.status].label}”`}
            description={RECIPE_STATUS_META[filters.status].hint}
            action={<Button onClick={() => update({ status: null })}>Xem tất cả</Button>}
          />
        );
      }
      return (
        <EmptyState
          icon="menu_book"
          title="Bạn chưa có công thức nào"
          description="Chia sẻ món chay đầu tiên của bạn với cộng đồng VeggieLife."
          action={
            <Link to={PATHS.RECIPES.NEW} className={PRIMARY_LINK}>
              <Icon name="add" className="text-[18px]" />
              Đăng công thức
            </Link>
          }
        />
      );
    }
    return (
      <>
        <ul className={cn('flex flex-col gap-space-sm', list.isPlaceholderData && 'opacity-60 transition-opacity')} aria-busy={list.isPlaceholderData}>
          {items.map((item) => (
            <MyRecipeRow key={item.recipeId} item={item} onRemove={(target, mode) => setPending({ item: target, mode })} />
          ))}
        </ul>
        <Pagination page={meta.page} size={meta.size} total={meta.total} onPageChange={(page) => update({ page })} className="mt-space-md" />
      </>
    );
  };

  const tabs: { value: MyRecipeStatus | null; label: string }[] = [
    { value: null, label: 'Tất cả' },
    ...MY_RECIPE_STATUSES.map((status) => ({ value: status, label: RECIPE_STATUS_META[status].label })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin sm:py-space-xl">
      <header className="flex flex-col gap-space-md sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 font-label-sm text-label-sm tracking-wide text-secondary uppercase">
            <Icon name="skillet" className="text-[16px]" />
            Bếp của bạn
          </p>
          <h1 className="mt-1 font-headline-lg text-headline-lg-mobile text-primary sm:text-headline-lg">Công thức của tôi</h1>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Theo dõi trạng thái kiểm duyệt, tiếp tục bản nháp và quản lý các công thức bạn đã chia sẻ.
          </p>
        </div>
        <Link to={PATHS.RECIPES.NEW} className={cn(PRIMARY_LINK, 'w-fit shrink-0')}>
          <Icon name="add_circle" className="text-[20px]" />
          Đăng công thức mới
        </Link>
      </header>

      <div className="flex flex-col gap-space-sm rounded-2xl bg-surface-container-lowest p-space-md shadow-card">
        <div className="flex flex-col gap-space-sm sm:flex-row">
          <form
            role="search"
            className="relative min-w-0 flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              update({ keyword: keyword.trim().slice(0, KEYWORD_MAX) });
            }}
          >
            <label htmlFor="my-recipe-keyword" className="sr-only">
              Tìm trong công thức của tôi
            </label>
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-outline" />
            <input
              id="my-recipe-keyword"
              type="search"
              value={keyword}
              maxLength={KEYWORD_MAX}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên món…"
              enterKeyHint="search"
              className={cn(INPUT_CLASS, 'h-11 pl-10')}
            />
          </form>
          <label htmlFor="my-recipe-sort" className="sr-only">
            Sắp xếp
          </label>
          <select
            id="my-recipe-sort"
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value as RecipeSort })}
            className={cn(INPUT_CLASS, 'h-11 cursor-pointer py-0 sm:w-48')}
          >
            <option value="NEWEST">Mới nhất</option>
            <option value="POPULAR">Nhiều tim nhất</option>
          </select>
        </div>
        <div role="group" aria-label="Lọc theo trạng thái" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {tabs.map((tab) => {
            const active = filters.status === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                aria-pressed={active}
                onClick={() => update({ status: tab.value })}
                className={cn(TAB, active ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container')}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <section aria-labelledby="my-recipes-results">
        <div className="mb-space-sm flex items-center justify-between gap-space-sm">
          <h2 id="my-recipes-results" className="font-headline-sm text-headline-sm text-on-surface">
            {filters.status ? RECIPE_STATUS_META[filters.status].label : 'Tất cả công thức'}
          </h2>
          <p aria-live="polite" className="font-label-md text-label-md text-on-surface-variant">
            {list.data && !list.isError ? `${formatNumber(list.data.meta.total)} công thức` : ''}
          </p>
        </div>
        {renderList()}
      </section>

      <ConfirmDialog
        show={pending !== null}
        title={pending ? REMOVE_COPY[pending.mode].title : ''}
        message={
          pending && (
            <>
              <strong className="text-on-surface">{pending.item.title}</strong>
              <br />
              {REMOVE_COPY[pending.mode].message}
            </>
          )
        }
        confirmLabel={pending ? REMOVE_COPY[pending.mode].confirm : 'Xác nhận'}
        danger={pending?.mode === 'all'}
        loading={removeRecipe.isPending}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />
    </div>
  );
};

export default MyRecipes;
