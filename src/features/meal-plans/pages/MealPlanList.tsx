/**
 * SCR-22 · meal-plans/MealPlan · `/meal-plans`
 * FN: FN-MEAL-02 · Nguyễn Văn Minh Tâm · Sprint 6
 * Danh sách thực đơn tuần: Card nổi bật cho thực đơn ACTIVE, bố cục thoáng 1280px.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';
import { useMealPlanList } from '../hooks/useMealPlans';
import { formatDate, formatWeekRange } from '../lib/dates';
import { STATUS_CLASS, STATUS_LABEL } from '../lib/labels';

const PAGE_SIZE = 10;
const NEW_PLAN_LINK =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md text-on-primary no-underline shadow-sm transition-opacity hover:opacity-95';

export const MealPlanList: React.FC = () => {
  const [page, setPage] = useState(1);
  const plans = useMealPlanList(page, PAGE_SIZE);

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

    const items = plans.data.data;
    if (items.length === 0) {
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

    const active = items.find((p) => p.planStatus === 'ACTIVE');

    return (
      <div className="flex flex-col gap-space-lg">
        {active && (
          <Link
            to={PATHS.MEAL_PLANS.DETAIL(active.planId)}
            className="flex items-center justify-between gap-3 rounded-xl bg-primary-container p-space-md text-on-primary shadow-sm transition-opacity hover:opacity-95"
          >
            <span className="flex flex-col">
              <span className="font-label-sm text-label-sm opacity-80 uppercase tracking-wide">Đang áp dụng</span>
              <span className="font-serif font-headline-sm text-headline-sm font-bold">{active.planName}</span>
              <span className="font-body-sm text-body-sm opacity-90">Bắt đầu: {formatDate(active.startDate)}</span>
            </span>
            <span className="inline-flex items-center gap-1 font-label-md text-label-md">
              Mở thực đơn <Icon name="arrow_forward" className="text-[18px]" />
            </span>
          </Link>
        )}

        <ul className={cn('grid grid-cols-1 gap-space-md sm:grid-cols-2', plans.isPlaceholderData && 'opacity-60')} aria-label="Danh sách thực đơn">
          {items.map((plan) => (
            <li key={plan.planId}>
              <Link
                to={PATHS.MEAL_PLANS.DETAIL(plan.planId)}
                className={cn(
                  'flex items-center gap-space-md rounded-xl border bg-surface-container-lowest p-space-md no-underline shadow-card transition-colors hover:bg-surface-container-low',
                  plan.planStatus === 'ACTIVE' ? 'border-primary-container ring-1 ring-primary-container' : 'border-surface-container'
                )}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                  <Icon name="calendar_month" className="text-[24px]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-serif font-headline-sm text-headline-sm font-bold text-on-surface">{plan.planName}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Tuần {formatWeekRange(plan.startDate)} ({formatDate(plan.startDate)})
                  </span>
                </span>
                <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 font-label-sm text-xs font-semibold', STATUS_CLASS[plan.planStatus])}>
                  {STATUS_LABEL[plan.planStatus]}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Pagination
          className="mt-space-md"
          page={page}
          size={PAGE_SIZE}
          total={plans.data.meta?.total ?? items.length}
          onPageChange={setPage}
        />
      </div>
    );
  };

  return (
    <main className="min-h-[calc(100vh-140px)] w-full bg-background pt-[72px]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin">
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
