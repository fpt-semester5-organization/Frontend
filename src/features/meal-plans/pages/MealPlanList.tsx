/**
 * SCR-22 · meal-plans/MealPlan · `/meal-plans`
 * FN: FN-MEAL-02 · Nguyễn Văn Minh Tâm · Sprint 6 & Sprint 8
 * Danh sách thực đơn tuần: Card nổi bật cho thực đơn ACTIVE, bộ lọc trạng thái, tìm kiếm, sắp xếp client-side, bố cục thoáng 1280px.
 */
import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import { MealPlanListToolbar } from '../components/MealPlanListToolbar';
import { useMealPlanList } from '../hooks/useMealPlans';
import { formatDate, formatWeekRange } from '../lib/dates';
import { STATUS_CLASS, STATUS_LABEL } from '../lib/labels';
import type { MealPlanSortOption, MealPlanStatusFilter } from '../types/mealPlan.types';

const PAGE_SIZE = 10;
const FETCH_ALL_SIZE = 100;
const NEW_PLAN_LINK =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md text-on-primary no-underline shadow-sm transition-opacity hover:opacity-95';

export const MealPlanList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Đọc các giá trị bộ lọc từ URL
  const statusParam = (searchParams.get('status') as MealPlanStatusFilter) || 'ALL';
  const keywordParam = searchParams.get('q') || '';
  const sortParam = (searchParams.get('sort') as MealPlanSortOption) || 'newest';
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // Tải danh sách thực đơn của người dùng
  const plans = useMealPlanList(1, FETCH_ALL_SIZE);

  // Hàm cập nhật bộ lọc đồng bộ URL
  const updateFilters = (patch: {
    status?: MealPlanStatusFilter;
    q?: string;
    sort?: MealPlanSortOption;
    page?: number;
  }) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);

        if (patch.status !== undefined) {
          if (patch.status === 'ALL') next.delete('status');
          else next.set('status', patch.status);
          next.delete('page');
        }

        if (patch.q !== undefined) {
          if (!patch.q.trim()) next.delete('q');
          else next.set('q', patch.q.trim());
          next.delete('page');
        }

        if (patch.sort !== undefined) {
          if (patch.sort === 'newest') next.delete('sort');
          else next.set('sort', patch.sort);
          next.delete('page');
        }

        if (patch.page !== undefined) {
          if (patch.page <= 1) next.delete('page');
          else next.set('page', patch.page.toString());
        }

        return next;
      },
      { replace: true, preventScrollReset: true }
    );
  };

  const resetFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const rawItems = plans.data?.data ?? [];

  // Tính số lượng thực đơn cho từng tab trạng thái
  const counts = useMemo<Record<MealPlanStatusFilter, number>>(() => {
    const c: Record<MealPlanStatusFilter, number> = {
      ALL: rawItems.length,
      ACTIVE: 0,
      DRAFT: 0,
      CANCELLED: 0,
      ARCHIVED: 0,
    };
    for (const item of rawItems) {
      if (item.planStatus === 'ACTIVE') c.ACTIVE++;
      else if (item.planStatus === 'DRAFT') c.DRAFT++;
      else if (item.planStatus === 'CANCELLED') c.CANCELLED++;
      else if (item.planStatus === 'ARCHIVED') c.ARCHIVED++;
    }
    return c;
  }, [rawItems]);

  // Lọc và sắp xếp client-side
  const filteredItems = useMemo(() => {
    let result = [...rawItems];

    // 1. Lọc theo trạng thái
    if (statusParam !== 'ALL') {
      result = result.filter((p) => p.planStatus === statusParam);
    }

    // 2. Tìm kiếm theo từ khóa
    if (keywordParam.trim()) {
      const kw = keywordParam.trim().toLowerCase();
      result = result.filter((p) => {
        const nameMatch = p.planName.toLowerCase().includes(kw);
        const dateMatch = p.startDate.includes(kw);
        const formattedDateMatch = formatDate(p.startDate).toLowerCase().includes(kw);
        return nameMatch || dateMatch || formattedDateMatch;
      });
    }

    // 3. Sắp xếp
    result.sort((a, b) => {
      if (sortParam === 'oldest') {
        return a.planId - b.planId;
      }
      if (sortParam === 'startDateAsc') {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
      if (sortParam === 'startDateDesc') {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      }
      // default: newest
      return b.planId - a.planId;
    });

    return result;
  }, [rawItems, statusParam, keywordParam, sortParam]);

  // Phân trang danh sách đã lọc
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const currentPage = Math.min(pageParam, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const activePlan = useMemo(() => rawItems.find((p) => p.planStatus === 'ACTIVE'), [rawItems]);

  const renderBody = () => {
    if (plans.isPending) {
      return (
        <div role="status" aria-busy="true" aria-label="Đang tải thực đơn" className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-28" />
          ))}
        </div>
      );
    }
    if (plans.isError) return <ErrorState error={plans.error} onRetry={() => plans.refetch()} retrying={plans.isRefetching} />;

    // Khi người dùng chưa từng tạo thực đơn nào
    if (rawItems.length === 0) {
      return (
        <EmptyState
          icon="restaurant_menu"
          title="Bạn chưa có thực đơn nào"
          description="AI sẽ lên thực đơn 7 ngày × 3 bữa theo hồ sơ sức khỏe, trường phái ăn chay và dị ứng của bạn."
          action={
            <Link to={PATHS.MEAL_PLANS.NEW} className={NEW_PLAN_LINK}>
              <Icon name="auto_awesome" className="text-[18px]" />
              Tạo thực đơn đầu tiên
            </Link>
          }
        />
      );
    }

    // Khi lọc không tìm thấy kết quả
    if (filteredItems.length === 0) {
      return (
        <div className="flex flex-col gap-space-md">
          <MealPlanListToolbar
            status={statusParam}
            keyword={keywordParam}
            sort={sortParam}
            counts={counts}
            onStatusChange={(status) => updateFilters({ status })}
            onKeywordChange={(q) => updateFilters({ q })}
            onSortChange={(sort) => updateFilters({ sort })}
            onReset={resetFilters}
          />
          <EmptyState
            icon="search_off"
            title="Không tìm thấy thực đơn phù hợp"
            description="Không có thực đơn nào khớp với tiêu chí lọc hoặc từ khóa tìm kiếm bạn vừa nhập."
            action={
              <Button variant="secondary" onClick={resetFilters}>
                <Icon name="filter_alt_off" className="text-[18px]" />
                Xóa bộ lọc
              </Button>
            }
          />
        </div>
      );
    }

    // Chỉ hiển thị Banner Card "Đang áp dụng" khi đang xem Tất cả hoặc xem nhóm Đang áp dụng và không gõ tìm kiếm
    const showActiveBanner =
      activePlan &&
      (statusParam === 'ALL' || statusParam === 'ACTIVE') &&
      !keywordParam.trim() &&
      currentPage === 1;

    return (
      <div className="flex flex-col gap-space-md">
        {/* Thanh công cụ lọc, tìm kiếm và sắp xếp */}
        <MealPlanListToolbar
          status={statusParam}
          keyword={keywordParam}
          sort={sortParam}
          counts={counts}
          onStatusChange={(status) => updateFilters({ status })}
          onKeywordChange={(q) => updateFilters({ q })}
          onSortChange={(sort) => updateFilters({ sort })}
          onReset={resetFilters}
        />

        {/* Card nổi bật cho thực đơn ACTIVE */}
        {showActiveBanner && (
          <Link
            to={PATHS.MEAL_PLANS.DETAIL(activePlan.planId)}
            className="flex items-center justify-between gap-3 rounded-xl bg-primary-container p-space-md text-on-primary shadow-sm transition-opacity hover:opacity-95"
          >
            <span className="flex flex-col">
              <span className="font-label-sm text-label-sm opacity-80 uppercase tracking-wide">Đang áp dụng</span>
              <span className="font-serif font-headline-sm text-headline-sm font-bold">{activePlan.planName}</span>
              <span className="font-body-sm text-body-sm opacity-90">Bắt đầu: {formatDate(activePlan.startDate)}</span>
            </span>
            <span className="inline-flex items-center gap-1 font-label-md text-label-md">
              Mở thực đơn <Icon name="arrow_forward" className="text-[18px]" />
            </span>
          </Link>
        )}

        {/* Lưới danh sách thực đơn */}
        <ul
          className={cn('grid grid-cols-1 gap-space-md sm:grid-cols-2', plans.isPlaceholderData && 'opacity-60')}
          aria-label="Danh sách thực đơn"
        >
          {paginatedItems.map((plan) => (
            <li key={plan.planId}>
              <Link
                to={PATHS.MEAL_PLANS.DETAIL(plan.planId)}
                className={cn(
                  'flex items-center gap-space-md rounded-xl border bg-surface-container-lowest p-space-md no-underline shadow-card transition-colors hover:bg-surface-container-low',
                  plan.planStatus === 'ACTIVE'
                    ? 'border-primary-container ring-1 ring-primary-container'
                    : 'border-surface-container'
                )}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                  <Icon name="calendar_month" className="text-[24px]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-serif font-headline-sm text-headline-sm font-bold text-on-surface">
                    {plan.planName}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Tuần {formatWeekRange(plan.startDate)} ({formatDate(plan.startDate)})
                  </span>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 font-label-sm text-xs font-semibold',
                    STATUS_CLASS[plan.planStatus]
                  )}
                >
                  {STATUS_LABEL[plan.planStatus]}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Phân trang danh sách đã lọc */}
        {totalItems > PAGE_SIZE && (
          <Pagination
            className="mt-space-md"
            page={currentPage}
            size={PAGE_SIZE}
            total={totalItems}
            onPageChange={(p) => updateFilters({ page: p })}
          />
        )}
      </div>
    );
  };

  return (
    <main className="min-h-[calc(100vh-140px)] w-full bg-background">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-space-md px-margin-mobile pt-6 pb-space-xl sm:px-margin sm:pt-8">
        <header className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
          <div className="flex flex-col gap-space-xs">
            <h1 className="font-serif font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg tracking-tight">
              Thực đơn của tôi
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Thực đơn 7 ngày × 3 bữa do AI lên theo hồ sơ dinh dưỡng của bạn, kèm danh sách đi chợ và hỗ trợ đổi món.
            </p>
          </div>
          <Link to={PATHS.MEAL_PLANS.NEW} className={NEW_PLAN_LINK}>
            <Icon name="auto_awesome" className="text-[18px]" />
            Sinh thực đơn AI
          </Link>
        </header>

        {renderBody()}
      </div>
    </main>
  );
};

export default MealPlanList;
