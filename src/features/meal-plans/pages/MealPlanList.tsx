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
import { formatWeekRange } from '../lib/dates';
import { STATUS_CLASS, STATUS_LABEL } from '../lib/labels';

const PAGE_SIZE = 10;
const NEW_PLAN_LINK =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline shadow-sm transition-colors hover:bg-primary';

/** SCR-22 meal-plans/MealPlan — /meal-plans: các thực đơn của tôi (FN-MEAL-02). */
const MealPlanList: React.FC = () => {
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

    return (
      <>
        <ul className={cn('grid grid-cols-1 gap-space-md sm:grid-cols-2', plans.isPlaceholderData && 'opacity-60')}>
          {items.map((plan) => (
            <li key={plan.planId}>
              <Link
                to={PATHS.MEAL_PLANS.DETAIL(plan.planId)}
                className={cn(
                  'flex items-center gap-space-md rounded-xl border bg-surface-container-lowest p-space-md no-underline shadow-card transition-colors hover:bg-surface-container-low',
                  plan.planStatus === 'ACTIVE' ? 'border-primary-container' : 'border-surface-container'
                )}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                  <Icon name="calendar_month" className="text-[24px]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-label-lg text-label-lg text-on-surface">{plan.planName}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Tuần {formatWeekRange(plan.startDate)}</span>
                </span>
                <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm', STATUS_CLASS[plan.planStatus])}>
                  {STATUS_LABEL[plan.planStatus]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Pagination
          className="mt-space-lg"
          page={page}
          size={PAGE_SIZE}
          total={plans.data.meta?.total ?? items.length}
          onPageChange={setPage}
        />
      </>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin">
      <header className="flex flex-wrap items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface sm:text-headline-lg">Thực đơn tuần</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Thực đơn 7 ngày × 3 bữa do AI lên theo hồ sơ của bạn, kèm danh sách đi chợ.
          </p>
        </div>
        <Link to={PATHS.MEAL_PLANS.NEW} className={NEW_PLAN_LINK}>
          <Icon name="auto_awesome" className="text-[18px]" />
          Tạo thực đơn
        </Link>
      </header>
      {renderBody()}
    </div>
  );
};

export default MealPlanList;
